import {
  ServerConfig,
  MCPServerInterface,
  Tool,
  Logger,
  Transport,
  LifecycleHook,
  Middleware,
  MCPMessage,
  ToolContext,
} from '../types';
import { ConsoleLogger } from './logger';
import { ToolManager } from './tool-manager';
import { ErrorHandler, MCPErrorCode, createMCPError } from './error-handler';

/**
 * Main MCP Server implementation
 */
export class MCPServer implements MCPServerInterface {
  public readonly config: ServerConfig;
  public readonly logger: Logger;
  
  private toolManager: ToolManager;
  private errorHandler: ErrorHandler;
  private transport: Transport | null = null;
  private hooks: Map<string, LifecycleHook[]> = new Map();
  private middlewares: Middleware[] = [];
  private isRunning = false;
  private clients: Set<string> = new Set();

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = config.logger || new ConsoleLogger();
    this.toolManager = new ToolManager(this.logger);
    this.errorHandler = new ErrorHandler();

    this.logger.info(`Initializing MCP Server: ${config.name} v${config.version}`);
  }

  /**
   * Register a tool
   */
  registerTool<I = unknown, O = unknown>(tool: Tool<I, O>): void {
    this.toolManager.registerTool(tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.toolManager.unregisterTool(name);
  }

  /**
   * List all tools
   */
  listTools(): Tool[] {
    return this.toolManager.listTools();
  }

  /**
   * Register a lifecycle hook
   */
  registerHook(hook: LifecycleHook): void {
    if (!this.hooks.has(hook.phase)) {
      this.hooks.set(hook.phase, []);
    }
    this.hooks.get(hook.phase)!.push(hook);
    this.logger.debug(`Registered hook: ${hook.name} for phase ${hook.phase}`);
  }

  /**
   * Register a middleware
   */
  registerMiddleware(middleware: Middleware): void {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.logger.debug(`Registered middleware: ${middleware.name}`);
  }

  /**
   * Get the current transport
   */
  getTransport(): Transport | null {
    return this.transport;
  }

  /**
   * Set a new transport
   */
  async setTransport(transport: Transport): Promise<void> {
    if (this.isRunning && this.transport) {
      await this.transport.stop();
    }

    this.transport = transport;
    this.setupTransportHandlers();

    if (this.isRunning) {
      await this.transport.start();
    }

    this.logger.info(`Transport set to: ${transport.name}`);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Server is already running');
      return;
    }

    this.logger.info('Starting MCP Server...');

    // Execute onStart hooks
    await this.executeHooks('onStart', {});

    // Load plugins if provided
    if (this.config.plugins) {
      for (const plugin of this.config.plugins) {
        await this.loadPlugin(plugin);
      }
    }

    // Start transport if available
    if (this.transport) {
      await this.transport.start();
    }

    this.isRunning = true;
    this.logger.info('MCP Server started successfully');
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Server is not running');
      return;
    }

    this.logger.info('Stopping MCP Server...');

    // Stop transport
    if (this.transport) {
      await this.transport.stop();
    }

    // Execute onStop hooks
    await this.executeHooks('onStop', {});

    this.isRunning = false;
    this.clients.clear();
    this.logger.info('MCP Server stopped');
  }

  /**
   * Load a plugin
   */
  private async loadPlugin(plugin: any): Promise<void> {
    try {
      this.logger.info(`Loading plugin: ${plugin.name} v${plugin.version}`);
      await plugin.initialize(this);
      this.logger.info(`Plugin loaded: ${plugin.name}`);
    } catch (error) {
      this.logger.error(`Failed to load plugin: ${plugin.name}`, error as Error);
      throw error;
    }
  }

  /**
   * Setup transport event handlers
   */
  private setupTransportHandlers(): void {
    if (!this.transport) return;

    this.transport.onConnect(async (clientId) => {
      this.clients.add(clientId);
      this.logger.info(`Client connected: ${clientId}`);
      await this.executeHooks('onClientConnect', { clientId });
    });

    this.transport.onDisconnect(async (clientId) => {
      this.clients.delete(clientId);
      this.logger.info(`Client disconnected: ${clientId}`);
      await this.executeHooks('onClientDisconnect', { clientId });
    });

    this.transport.onMessage(async (clientId, message) => {
      await this.handleMessage(clientId, message);
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(clientId: string, message: MCPMessage): Promise<void> {
    try {
      // Run middlewares
      await this.runMiddlewares(clientId, message);

      // Handle different message types
      if (message.type === 'request') {
        await this.handleRequest(clientId, message);
      }
    } catch (error) {
      this.logger.error('Error handling message', error as Error);
      
      // Send error response
      if (this.transport && message.id) {
        await this.transport.send(clientId, {
          type: 'error',
          id: message.id,
          error: this.errorHandler.handle(error),
        });
      }
    }
  }

  /**
   * Handle a request message
   */
  private async handleRequest(clientId: string, message: MCPMessage): Promise<void> {
    const { id, method, params } = message;

    if (!method) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Missing method');
    }

    // Handle built-in methods
    if (method === 'tools/list') {
      await this.handleListTools(clientId, id);
      return;
    }

    if (method === 'tools/execute') {
      await this.handleExecuteTool(clientId, id, params);
      return;
    }

    // Unknown method
    throw createMCPError(MCPErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`);
  }

  /**
   * Handle tools/list request
   */
  private async handleListTools(clientId: string, messageId?: string): Promise<void> {
    const tools = this.toolManager.getToolsMetadata();
    
    if (this.transport) {
      await this.transport.send(clientId, {
        type: 'response',
        id: messageId,
        result: { tools },
      });
    }
  }

  /**
   * Handle tools/execute request
   */
  private async handleExecuteTool(
    clientId: string,
    messageId: string | undefined,
    params: unknown
  ): Promise<void> {
    if (!params || typeof params !== 'object' || !('name' in params)) {
      throw createMCPError(MCPErrorCode.INVALID_PARAMS, 'Missing tool name');
    }

    const { name, input } = params as { name: string; input: unknown };

    // Execute beforeToolExecution hooks
    await this.executeHooks('beforeToolExecution', { clientId, toolName: name });

    // Create tool context
    const context: ToolContext = {
      clientId,
      logger: this.logger,
      metadata: {},
    };

    // Execute tool
    const result = await this.toolManager.executeTool(name, input, context);

    // Execute afterToolExecution hooks
    await this.executeHooks('afterToolExecution', {
      clientId,
      toolName: name,
      result,
    });

    // Send response
    if (this.transport) {
      if (result.success) {
        await this.transport.send(clientId, {
          type: 'response',
          id: messageId,
          result: {
            output: result.result,
            duration: result.duration,
          },
        });
      } else {
        await this.transport.send(clientId, {
          type: 'error',
          id: messageId,
          error: result.error,
        });
      }
    }
  }

  /**
   * Run middlewares
   */
  private async runMiddlewares(clientId: string, message: MCPMessage): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) return;

      const middleware = this.middlewares[index++];
      await middleware.handler(message, { clientId, logger: this.logger }, next);
    };

    await next();
  }

  /**
   * Execute lifecycle hooks
   */
  private async executeHooks(phase: string, data: unknown): Promise<void> {
    const hooks = this.hooks.get(phase) || [];
    
    for (const hook of hooks) {
      try {
        await hook.handler({
          event: phase,
          data,
        });
      } catch (error) {
        this.logger.error(`Hook execution failed: ${hook.name}`, error as Error);
      }
    }
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      name: this.config.name,
      version: this.config.version,
      isRunning: this.isRunning,
      transport: this.transport?.name || null,
      toolsCount: this.toolManager.listTools().length,
      clientsCount: this.clients.size,
    };
  }
}

