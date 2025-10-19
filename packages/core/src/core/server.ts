import {
  ServerConfig,
  MCPServerInterface,
  Tool,
  Logger,
  Transport,
  LifecycleHook,
  HookPhase,
  Middleware,
  MCPMessage,
  ToolContext,
  StrictMetadata,
  ServerCapabilities,
  ResourceProvider,
  PromptProvider,
  ResourceUpdateEvent,
  PromptUpdateEvent,
} from '../types';
import { ConsoleLogger, LogLevel } from './logger';
import { ToolManager } from './tool-manager';
import { ErrorHandler, MCPErrorCode, createMCPError } from './error-handler';
import {
  ProtocolManager,
  ProtocolNegotiationResult,
  UnsupportedProtocolVersionError,
} from './protocol-manager';
import { ResourceManager } from '../resources/resource-manager';
import { PromptManager } from '../prompts/prompt-manager';

/**
 * Main MCP Server implementation with full MCP protocol support
 * Automatically handles standard MCP methods: initialize, tools/list, tools/call
 */
export class MCPServer implements MCPServerInterface {
  public readonly config: ServerConfig;
  public readonly logger: Logger;
  
  private toolManager: ToolManager;
  private errorHandler: ErrorHandler;
  private protocolManager: ProtocolManager;
  private baseCapabilities: ServerCapabilities;
  private negotiatedCapabilities: ServerCapabilities;
  private negotiatedProtocol: ProtocolNegotiationResult;
  private resourceManager: ResourceManager;
  private promptManager: PromptManager;
  private transport: Transport | null = null;
  private hooks: Map<HookPhase, LifecycleHook[]> = new Map();
  private middlewares: Middleware[] = [];
  private isRunning = false;
  private clients: Set<string> = new Set();
  private initialized = false;
  private activeProtocolVersion: string;
  private static readonly LOG_LEVELS: ReadonlyArray<LogLevel> = ['debug', 'info', 'warn', 'error'];

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = config.logger || new ConsoleLogger();
    this.toolManager = new ToolManager(this.logger);
    this.errorHandler = new ErrorHandler();
    this.protocolManager = new ProtocolManager(config.protocol);
    this.baseCapabilities = config.capabilities ?? {
      tools: { listChanged: true },
      logging: {},
    };
    this.resourceManager = new ResourceManager(this.logger);
    this.promptManager = new PromptManager(this.logger);

    if (config.resources) {
      for (const provider of config.resources) {
        this.resourceManager.registerProvider(provider);
      }
      this.updateResourceCapabilities();
    }

    if (config.prompts) {
      for (const provider of config.prompts) {
        this.promptManager.registerProvider(provider);
      }
      this.updatePromptCapabilities();
    }
    this.negotiatedProtocol = this.protocolManager.negotiate(undefined);
    this.negotiatedCapabilities = this.computeAdvertisedCapabilities(
      this.negotiatedProtocol.capabilities,
    );
    this.activeProtocolVersion = this.negotiatedProtocol.version;

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
   * Register a resource provider
   */
  registerResourceProvider(provider: ResourceProvider): void {
    this.resourceManager.registerProvider(provider);
    this.updateResourceCapabilities();
  }

  /**
   * Register a prompt provider
   */
  registerPromptProvider(provider: PromptProvider): void {
    this.promptManager.registerProvider(provider);
    this.updatePromptCapabilities();
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
    await this.executeHooks(HookPhase.OnStart, {});

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
    await this.executeHooks(HookPhase.OnStop, {});

    this.isRunning = false;
    this.clients.clear();
    this.logger.info('MCP Server stopped');
  }

  /**
   * Load a plugin
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      await this.executeHooks(HookPhase.OnClientConnect, { clientId });
    });

    this.transport.onDisconnect(async (clientId) => {
      this.clients.delete(clientId);
      this.logger.info(`Client disconnected: ${clientId}`);
      await this.executeHooks(HookPhase.OnClientDisconnect, { clientId });
    });

    this.transport.onMessage(async (clientId, message) => {
      await this.handleMessage(clientId, message);
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(clientId: string, message: MCPMessage): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Execute OnRequest hooks
      await this.executeHooks(HookPhase.OnRequest, {
        clientId,
        request: message,
        startTime,
      });

      // Run middlewares
      await this.runMiddlewares(clientId, message);

      // Handle different message types
      if (message.type === 'request') {
        await this.handleRequest(clientId, message);
      }

      // Execute OnResponse hooks (success)
      const duration = Date.now() - startTime;
      await this.executeHooks(HookPhase.OnResponse, {
        clientId,
        request: message,
        duration,
        startTime,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Error handling message', error as Error);
      
      // Execute OnError hooks
      await this.executeHooks(HookPhase.OnError, {
        clientId,
        request: message,
        error: error as Error,
        duration,
        startTime,
      });

      // Execute OnResponse hooks (error)
      await this.executeHooks(HookPhase.OnResponse, {
        clientId,
        request: message,
        error: error as Error,
        duration,
        startTime,
      });
      
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
   * Handle a request message with full MCP protocol support
   */
  private async handleRequest(clientId: string, message: MCPMessage): Promise<void> {
    const { id, method, params } = message;

    if (!method) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Missing method');
    }

    // Validate JSON-RPC 2.0 format
    if (!this.isValidJsonRpcRequest(message)) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Invalid JSON-RPC 2.0 format');
    }

    // Handle MCP standard methods
    switch (method) {
      case 'initialize':
        await this.handleInitialize(clientId, id, params);
        return;
      
      case 'tools/list':
        await this.handleListTools(clientId, id);
        return;
      
      case 'tools/call':
        await this.handleCallTool(clientId, id, params);
        return;
      
      case 'resources/list':
        await this.handleListResources(clientId, id);
        return;
      
      case 'resources/read':
        await this.handleReadResource(clientId, id, params);
        return;
      
      case 'prompts/list':
        await this.handleListPrompts(clientId, id);
        return;
      
      case 'prompts/get':
        await this.handleGetPrompt(clientId, id, params);
        return;
      
      case 'logging/setLevel':
        await this.handleSetLogLevel(clientId, id, params);
        return;
      
      default:
        throw createMCPError(MCPErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }

  /**
   * Validate JSON-RPC 2.0 request format
   */
  private isValidJsonRpcRequest(message: MCPMessage): boolean {
    return (
      message.type === 'request' &&
      typeof message.method === 'string' &&
      (message.id === undefined || typeof message.id === 'string' || typeof message.id === 'number')
    );
  }

  /**
   * Handle MCP initialize request
   */
  private async handleInitialize(clientId: string, messageId?: string, params?: unknown): Promise<void> {
    if (this.initialized) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Server already initialized');
    }

    // Validate initialization parameters
    if (!params || typeof params !== 'object' || !('protocolVersion' in params)) {
      throw createMCPError(MCPErrorCode.INVALID_PARAMS, 'Missing protocolVersion');
    }

    const initParams = params as {
      protocolVersion: string;
      capabilities?: unknown;
      clientInfo?: { name: string; version: string };
    };

    let negotiation: ProtocolNegotiationResult;
    try {
      negotiation = this.protocolManager.negotiate(initParams.protocolVersion);
    } catch (error) {
      if (error instanceof UnsupportedProtocolVersionError) {
        throw createMCPError(MCPErrorCode.INVALID_PARAMS, error.message);
      }
      throw error;
    }

    this.negotiatedProtocol = negotiation;
    this.negotiatedCapabilities = this.computeAdvertisedCapabilities(negotiation.capabilities);
    this.activeProtocolVersion = negotiation.version;

    this.initialized = true;
    this.logger.info(
      `MCP client initialized: ${initParams.clientInfo?.name || 'unknown'} v${
        initParams.clientInfo?.version || 'unknown'
      } (protocol ${this.activeProtocolVersion})`,
    );

    if (this.transport) {
      await this.transport.send(clientId, {
        type: 'response',
        id: messageId,
        result: {
          protocolVersion: negotiation.version,
          capabilities: this.negotiatedCapabilities,
          serverInfo: {
            name: this.config.name,
            version: this.config.version
          }
        },
      });
    }
  }

  /**
   * Handle tools/list request
   */
  private async handleListTools(clientId: string, messageId?: string): Promise<void> {
    if (!this.initialized) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
    }

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
   * Handle tools/call request (MCP standard method)
   */
  private async handleCallTool(
    clientId: string,
    messageId: string | undefined,
    params: unknown
  ): Promise<void> {
    if (!this.initialized) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
    }

    if (!params || typeof params !== 'object' || !('name' in params)) {
      throw createMCPError(MCPErrorCode.INVALID_PARAMS, 'Missing tool name');
    }

    const { name, arguments: args } = params as { name: string; arguments: unknown };

    // Execute beforeToolExecution hooks
    await this.executeHooks(HookPhase.BeforeToolExecution, { clientId, toolName: name });

    // Create tool context
    const context: ToolContext = {
      clientId,
      logger: this.logger,
      metadata: this.createMetadata(),
    };

    // Execute tool
    const result = await this.toolManager.executeTool(name, args, context);

    // Execute afterToolExecution hooks
    await this.executeHooks(HookPhase.AfterToolExecution, {
      clientId,
      toolName: name,
      result,
    });

    // Send MCP-compliant response
    if (this.transport) {
      if (result.success) {
        await this.transport.send(clientId, {
          type: 'response',
          id: messageId,
          result: {
            content: [{
              type: 'text',
              text: typeof result.result === 'string' ? result.result : JSON.stringify(result.result, null, 2)
            }]
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
   * Handle resources/list request (placeholder for future implementation)
   */
  private async handleListResources(clientId: string, messageId?: string): Promise<void> {
    if (!this.initialized) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
    }

    const resources = await this.resourceManager.listResources(this.createMetadata());

    if (this.transport) {
      await this.transport.send(clientId, {
        type: 'response',
        id: messageId,
        result: { resources },
      });
    }
  }

  /**
   * Handle resources/read request (placeholder for future implementation)
   */
  private async handleReadResource(clientId: string, messageId?: string, params?: unknown): Promise<void> {
    if (!this.initialized) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
    }

    if (
      !params ||
      typeof params !== 'object' ||
      !('uri' in params) ||
      typeof (params as { uri: unknown }).uri !== 'string'
    ) {
      throw createMCPError(MCPErrorCode.INVALID_PARAMS, 'Missing resource uri');
    }

    const { uri, providerId } = params as { uri: string; providerId?: string };

    const content = await this.resourceManager.readResource(
      uri,
      this.createMetadata(),
      providerId,
    );

    if (this.transport) {
      await this.transport.send(clientId, {
        type: 'response',
        id: messageId,
        result: { resource: content },
      });
    }
  }

  /**
   * Handle prompts/list request (placeholder for future implementation)
   */
  private async handleListPrompts(clientId: string, messageId?: string): Promise<void> {
    if (!this.initialized) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
    }

    const prompts = await this.promptManager.listPrompts(this.createMetadata());

    if (this.transport) {
      await this.transport.send(clientId, {
        type: 'response',
        id: messageId,
        result: { prompts },
      });
    }
  }

  /**
   * Handle prompts/get request (placeholder for future implementation)
   */
  private async handleGetPrompt(clientId: string, messageId?: string, params?: unknown): Promise<void> {
    if (!this.initialized) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
    }

    if (!params || typeof params !== 'object' || !('id' in params)) {
      throw createMCPError(MCPErrorCode.INVALID_PARAMS, 'Missing prompt id');
    }

    const { id, arguments: args } = params as {
      id: string;
      arguments?: Record<string, unknown>;
    };

    if (typeof id !== 'string' || id.trim() === '') {
      throw createMCPError(MCPErrorCode.INVALID_PARAMS, 'Invalid prompt id');
    }

    const prompt = await this.promptManager.getPrompt(id, this.createMetadata());
    if (!prompt) {
      throw createMCPError(MCPErrorCode.METHOD_NOT_FOUND, `Prompt not found: ${id}`);
    }

    this.validatePromptArguments(prompt, args ?? {});

    if (this.transport) {
      await this.transport.send(clientId, {
        type: 'response',
        id: messageId,
        result: {
          prompt,
          arguments: args ?? {},
        },
      });
    }
  }

  /**
   * Handle logging/setLevel request
   */
  private async handleSetLogLevel(clientId: string, messageId?: string, params?: unknown): Promise<void> {
    if (!this.initialized) {
      throw createMCPError(MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
    }

    if (!params || typeof params !== 'object' || !('level' in params)) {
      throw createMCPError(MCPErrorCode.INVALID_PARAMS, 'Missing log level');
    }

    const { level } = params as { level: string };
    const normalizedLevel = level as LogLevel;
    
    // Validate log level
    if (!MCPServer.LOG_LEVELS.includes(normalizedLevel)) {
      throw createMCPError(MCPErrorCode.INVALID_PARAMS, `Invalid log level: ${level}`);
    }

    if (this.isLevelAdjustableLogger(this.logger)) {
      this.logger.setLevel(normalizedLevel);
    } else {
      this.logger.warn('Active logger does not support dynamic log level changes');
    }

    this.logger.info(`Log level set to: ${level}`);

    if (this.transport) {
      await this.transport.send(clientId, {
        type: 'response',
        id: messageId,
        result: {},
      });
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
      await middleware.handler(
        message,
        { clientId, logger: this.logger, metadata: this.createMetadata(clientId) },
        next,
      );
    };

    await next();
  }

  /**
   * Execute lifecycle hooks
   */
  private async executeHooks(phase: HookPhase, data: unknown): Promise<void> {
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
   * Get server status with MCP protocol information
   */
  getStatus() {
    return {
      name: this.config.name,
      version: this.config.version,
      isRunning: this.isRunning,
      initialized: this.initialized,
      transport: this.transport?.name || null,
      toolsCount: this.toolManager.listTools().length,
      clientsCount: this.clients.size,
      capabilities: this.negotiatedCapabilities,
      protocolVersion: this.activeProtocolVersion,
    };
  }

  /**
   * Reset server initialization state (for testing)
   */
  resetInitialization(): void {
    this.initialized = false;
    this.logger.debug('Server initialization state reset');
  }

  /**
   * Compute the capabilities that should be advertised to the client by intersecting
   * the negotiated capabilities with the features the server actually implements.
   */
  private computeAdvertisedCapabilities(negotiated: ServerCapabilities): ServerCapabilities {
    const effective: ServerCapabilities = {};

    for (const key of Object.keys(this.baseCapabilities)) {
      const negotiatedCapability = negotiated[key];
      const implementedCapability = this.baseCapabilities[key];

      if (!negotiatedCapability || !implementedCapability) {
        continue;
      }

      if (
        typeof negotiatedCapability === 'object' &&
        negotiatedCapability !== null &&
        typeof implementedCapability === 'object' &&
        implementedCapability !== null
      ) {
        effective[key] = {
          ...negotiatedCapability,
          ...implementedCapability,
        };
      } else {
        effective[key] = negotiatedCapability ?? implementedCapability;
      }
    }

    return effective;
  }

  private isLevelAdjustableLogger(
    logger: Logger,
  ): logger is Logger & { setLevel(level: LogLevel): void } {
    return typeof (logger as Logger & { setLevel?: unknown }).setLevel === 'function';
  }

  private updateResourceCapabilities(): void {
    if (this.resourceManager.listProviders().length > 0) {
      this.baseCapabilities = {
        ...this.baseCapabilities,
        resources: {
          ...(this.baseCapabilities.resources ?? {}),
          subscribe: false,
          listChanged: true,
        },
      };
    }

    if (this.initialized && this.negotiatedProtocol) {
      this.negotiatedCapabilities = this.computeAdvertisedCapabilities(
        this.negotiatedProtocol.capabilities,
      );
    }
  }

  private createMetadata(clientId?: string): StrictMetadata {
    if (clientId && this.transport && 'getClientMetadata' in this.transport) {
      return (this.transport as any).getClientMetadata(clientId);
    }
    return {};
  }

  private updatePromptCapabilities(): void {
    if (this.promptManager.listProviders().length > 0) {
      this.baseCapabilities = {
        ...this.baseCapabilities,
        prompts: {
          ...(this.baseCapabilities.prompts ?? {}),
          listChanged: true,
        },
      };
    }

    if (this.initialized && this.negotiatedProtocol) {
      this.negotiatedCapabilities = this.computeAdvertisedCapabilities(
        this.negotiatedProtocol.capabilities,
      );
    }
  }

  private validatePromptArguments(
    prompt: import('../types').PromptDefinition,
    args: Record<string, unknown>,
  ): void {
    if (!prompt.placeholders || prompt.placeholders.length === 0) {
      return;
    }

    const missing: string[] = [];
    for (const placeholder of prompt.placeholders) {
      if (placeholder.required) {
        const value = args[placeholder.id];
        if (value === undefined || value === null || value === '') {
          missing.push(placeholder.id);
        }
      }
    }

    if (missing.length > 0) {
      throw createMCPError(
        MCPErrorCode.INVALID_PARAMS,
        `Missing required prompt arguments: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Notify all connected clients that resources have been updated.
   */
  async notifyResourcesUpdated(event: ResourceUpdateEvent = {}): Promise<void> {
    const payload = {
      listChanged: event.listChanged ?? true,
      uris: event.uris,
      reason: event.reason,
    };

    await this.broadcastEvent({
      type: 'event',
      method: 'resources/updated',
      params: payload,
    });
  }

  /**
   * Notify all connected clients that prompts have been updated.
   */
  async notifyPromptsUpdated(event: PromptUpdateEvent = {}): Promise<void> {
    const payload = {
      listChanged: event.listChanged ?? true,
      promptIds: event.promptIds,
      reason: event.reason,
    };

    await this.broadcastEvent({
      type: 'event',
      method: 'prompts/updated',
      params: payload,
    });
  }

  private async broadcastEvent(event: MCPMessage): Promise<void> {
    if (!this.transport) {
      this.logger.warn('No transport available to broadcast event');
      return;
    }

    try {
      await this.transport.broadcast(event);
    } catch (error) {
      this.logger.error('Failed to broadcast event', error as Error);
    }
  }
}
