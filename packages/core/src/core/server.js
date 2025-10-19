"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
const types_1 = require("../types");
const logger_1 = require("./logger");
const tool_manager_1 = require("./tool-manager");
const error_handler_1 = require("./error-handler");
const protocol_manager_1 = require("./protocol-manager");
const resource_manager_1 = require("../resources/resource-manager");
const prompt_manager_1 = require("../prompts/prompt-manager");
/**
 * Main MCP Server implementation with full MCP protocol support
 * Automatically handles standard MCP methods: initialize, tools/list, tools/call
 */
class MCPServer {
    config;
    logger;
    toolManager;
    errorHandler;
    protocolManager;
    baseCapabilities;
    negotiatedCapabilities;
    negotiatedProtocol;
    resourceManager;
    promptManager;
    transport = null;
    hooks = new Map();
    middlewares = [];
    isRunning = false;
    clients = new Set();
    initialized = false;
    activeProtocolVersion;
    static LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
    constructor(config) {
        this.config = config;
        this.logger = config.logger || new logger_1.ConsoleLogger();
        this.toolManager = new tool_manager_1.ToolManager(this.logger);
        this.errorHandler = new error_handler_1.ErrorHandler();
        this.protocolManager = new protocol_manager_1.ProtocolManager(config.protocol);
        this.baseCapabilities = config.capabilities ?? {
            tools: { listChanged: true },
            logging: {},
        };
        this.resourceManager = new resource_manager_1.ResourceManager(this.logger);
        this.promptManager = new prompt_manager_1.PromptManager(this.logger);
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
        this.negotiatedCapabilities = this.computeAdvertisedCapabilities(this.negotiatedProtocol.capabilities);
        this.activeProtocolVersion = this.negotiatedProtocol.version;
        this.logger.info(`Initializing MCP Server: ${config.name} v${config.version}`);
    }
    /**
     * Register a tool
     */
    registerTool(tool) {
        this.toolManager.registerTool(tool);
    }
    /**
     * Unregister a tool
     */
    unregisterTool(name) {
        this.toolManager.unregisterTool(name);
    }
    /**
     * Register a resource provider
     */
    registerResourceProvider(provider) {
        this.resourceManager.registerProvider(provider);
        this.updateResourceCapabilities();
    }
    /**
     * Register a prompt provider
     */
    registerPromptProvider(provider) {
        this.promptManager.registerProvider(provider);
        this.updatePromptCapabilities();
    }
    /**
     * List all tools
     */
    listTools() {
        return this.toolManager.listTools();
    }
    /**
     * Register a lifecycle hook
     */
    registerHook(hook) {
        if (!this.hooks.has(hook.phase)) {
            this.hooks.set(hook.phase, []);
        }
        this.hooks.get(hook.phase).push(hook);
        this.logger.debug(`Registered hook: ${hook.name} for phase ${hook.phase}`);
    }
    /**
     * Register a middleware
     */
    registerMiddleware(middleware) {
        this.middlewares.push(middleware);
        this.middlewares.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        this.logger.debug(`Registered middleware: ${middleware.name}`);
    }
    /**
     * Get the current transport
     */
    getTransport() {
        return this.transport;
    }
    /**
     * Set a new transport
     */
    async setTransport(transport) {
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
    async start() {
        if (this.isRunning) {
            this.logger.warn('Server is already running');
            return;
        }
        this.logger.info('Starting MCP Server...');
        // Execute onStart hooks
        await this.executeHooks(types_1.HookPhase.OnStart, {});
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
    async stop() {
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
        await this.executeHooks(types_1.HookPhase.OnStop, {});
        this.isRunning = false;
        this.clients.clear();
        this.logger.info('MCP Server stopped');
    }
    /**
     * Load a plugin
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async loadPlugin(plugin) {
        try {
            this.logger.info(`Loading plugin: ${plugin.name} v${plugin.version}`);
            await plugin.initialize(this);
            this.logger.info(`Plugin loaded: ${plugin.name}`);
        }
        catch (error) {
            this.logger.error(`Failed to load plugin: ${plugin.name}`, error);
            throw error;
        }
    }
    /**
     * Setup transport event handlers
     */
    setupTransportHandlers() {
        if (!this.transport)
            return;
        this.transport.onConnect(async (clientId) => {
            this.clients.add(clientId);
            this.logger.info(`Client connected: ${clientId}`);
            await this.executeHooks(types_1.HookPhase.OnClientConnect, { clientId });
        });
        this.transport.onDisconnect(async (clientId) => {
            this.clients.delete(clientId);
            this.logger.info(`Client disconnected: ${clientId}`);
            await this.executeHooks(types_1.HookPhase.OnClientDisconnect, { clientId });
        });
        this.transport.onMessage(async (clientId, message) => {
            await this.handleMessage(clientId, message);
        });
    }
    /**
     * Handle incoming message
     */
    async handleMessage(clientId, message) {
        const startTime = Date.now();
        try {
            // Execute OnRequest hooks
            await this.executeHooks(types_1.HookPhase.OnRequest, {
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
            await this.executeHooks(types_1.HookPhase.OnResponse, {
                clientId,
                request: message,
                duration,
                startTime,
            });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Error handling message', error);
            // Execute OnError hooks
            await this.executeHooks(types_1.HookPhase.OnError, {
                clientId,
                request: message,
                error: error,
                duration,
                startTime,
            });
            // Execute OnResponse hooks (error)
            await this.executeHooks(types_1.HookPhase.OnResponse, {
                clientId,
                request: message,
                error: error,
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
    async handleRequest(clientId, message) {
        const { id, method, params } = message;
        if (!method) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Missing method');
        }
        // Validate JSON-RPC 2.0 format
        if (!this.isValidJsonRpcRequest(message)) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Invalid JSON-RPC 2.0 format');
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
                throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`);
        }
    }
    /**
     * Validate JSON-RPC 2.0 request format
     */
    isValidJsonRpcRequest(message) {
        return (message.type === 'request' &&
            typeof message.method === 'string' &&
            (message.id === undefined || typeof message.id === 'string' || typeof message.id === 'number'));
    }
    /**
     * Handle MCP initialize request
     */
    async handleInitialize(clientId, messageId, params) {
        if (this.initialized) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Server already initialized');
        }
        // Validate initialization parameters
        if (!params || typeof params !== 'object' || !('protocolVersion' in params)) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, 'Missing protocolVersion');
        }
        const initParams = params;
        let negotiation;
        try {
            negotiation = this.protocolManager.negotiate(initParams.protocolVersion);
        }
        catch (error) {
            if (error instanceof protocol_manager_1.UnsupportedProtocolVersionError) {
                throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, error.message);
            }
            throw error;
        }
        this.negotiatedProtocol = negotiation;
        this.negotiatedCapabilities = this.computeAdvertisedCapabilities(negotiation.capabilities);
        this.activeProtocolVersion = negotiation.version;
        this.initialized = true;
        this.logger.info(`MCP client initialized: ${initParams.clientInfo?.name || 'unknown'} v${initParams.clientInfo?.version || 'unknown'} (protocol ${this.activeProtocolVersion})`);
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
    async handleListTools(clientId, messageId) {
        if (!this.initialized) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
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
    async handleCallTool(clientId, messageId, params) {
        if (!this.initialized) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
        }
        if (!params || typeof params !== 'object' || !('name' in params)) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, 'Missing tool name');
        }
        const { name, arguments: args } = params;
        // Execute beforeToolExecution hooks
        await this.executeHooks(types_1.HookPhase.BeforeToolExecution, { clientId, toolName: name });
        // Create tool context
        const context = {
            clientId,
            logger: this.logger,
            metadata: this.createMetadata(),
        };
        // Execute tool
        const result = await this.toolManager.executeTool(name, args, context);
        // Execute afterToolExecution hooks
        await this.executeHooks(types_1.HookPhase.AfterToolExecution, {
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
            }
            else {
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
    async handleListResources(clientId, messageId) {
        if (!this.initialized) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
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
    async handleReadResource(clientId, messageId, params) {
        if (!this.initialized) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
        }
        if (!params ||
            typeof params !== 'object' ||
            !('uri' in params) ||
            typeof params.uri !== 'string') {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, 'Missing resource uri');
        }
        const { uri, providerId } = params;
        const content = await this.resourceManager.readResource(uri, this.createMetadata(), providerId);
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
    async handleListPrompts(clientId, messageId) {
        if (!this.initialized) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
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
    async handleGetPrompt(clientId, messageId, params) {
        if (!this.initialized) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
        }
        if (!params || typeof params !== 'object' || !('id' in params)) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, 'Missing prompt id');
        }
        const { id, arguments: args } = params;
        if (typeof id !== 'string' || id.trim() === '') {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, 'Invalid prompt id');
        }
        const prompt = await this.promptManager.getPrompt(id, this.createMetadata());
        if (!prompt) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.METHOD_NOT_FOUND, `Prompt not found: ${id}`);
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
    async handleSetLogLevel(clientId, messageId, params) {
        if (!this.initialized) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_REQUEST, 'Server not initialized');
        }
        if (!params || typeof params !== 'object' || !('level' in params)) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, 'Missing log level');
        }
        const { level } = params;
        const normalizedLevel = level;
        // Validate log level
        if (!MCPServer.LOG_LEVELS.includes(normalizedLevel)) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, `Invalid log level: ${level}`);
        }
        if (this.isLevelAdjustableLogger(this.logger)) {
            this.logger.setLevel(normalizedLevel);
        }
        else {
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
    async runMiddlewares(clientId, message) {
        let index = 0;
        const next = async () => {
            if (index >= this.middlewares.length)
                return;
            const middleware = this.middlewares[index++];
            await middleware.handler(message, { clientId, logger: this.logger, metadata: this.createMetadata(clientId) }, next);
        };
        await next();
    }
    /**
     * Execute lifecycle hooks
     */
    async executeHooks(phase, data) {
        const hooks = this.hooks.get(phase) || [];
        for (const hook of hooks) {
            try {
                await hook.handler({
                    event: phase,
                    data,
                });
            }
            catch (error) {
                this.logger.error(`Hook execution failed: ${hook.name}`, error);
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
    resetInitialization() {
        this.initialized = false;
        this.logger.debug('Server initialization state reset');
    }
    /**
     * Compute the capabilities that should be advertised to the client by intersecting
     * the negotiated capabilities with the features the server actually implements.
     */
    computeAdvertisedCapabilities(negotiated) {
        const effective = {};
        for (const key of Object.keys(this.baseCapabilities)) {
            const negotiatedCapability = negotiated[key];
            const implementedCapability = this.baseCapabilities[key];
            if (!negotiatedCapability || !implementedCapability) {
                continue;
            }
            if (typeof negotiatedCapability === 'object' &&
                negotiatedCapability !== null &&
                typeof implementedCapability === 'object' &&
                implementedCapability !== null) {
                effective[key] = {
                    ...negotiatedCapability,
                    ...implementedCapability,
                };
            }
            else {
                effective[key] = negotiatedCapability ?? implementedCapability;
            }
        }
        return effective;
    }
    isLevelAdjustableLogger(logger) {
        return typeof logger.setLevel === 'function';
    }
    updateResourceCapabilities() {
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
            this.negotiatedCapabilities = this.computeAdvertisedCapabilities(this.negotiatedProtocol.capabilities);
        }
    }
    createMetadata(clientId) {
        if (clientId && this.transport && 'getClientMetadata' in this.transport) {
            return this.transport.getClientMetadata(clientId);
        }
        return {};
    }
    updatePromptCapabilities() {
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
            this.negotiatedCapabilities = this.computeAdvertisedCapabilities(this.negotiatedProtocol.capabilities);
        }
    }
    validatePromptArguments(prompt, args) {
        if (!prompt.placeholders || prompt.placeholders.length === 0) {
            return;
        }
        const missing = [];
        for (const placeholder of prompt.placeholders) {
            if (placeholder.required) {
                const value = args[placeholder.id];
                if (value === undefined || value === null || value === '') {
                    missing.push(placeholder.id);
                }
            }
        }
        if (missing.length > 0) {
            throw (0, error_handler_1.createMCPError)(error_handler_1.MCPErrorCode.INVALID_PARAMS, `Missing required prompt arguments: ${missing.join(', ')}`);
        }
    }
    /**
     * Notify all connected clients that resources have been updated.
     */
    async notifyResourcesUpdated(event = {}) {
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
    async notifyPromptsUpdated(event = {}) {
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
    async broadcastEvent(event) {
        if (!this.transport) {
            this.logger.warn('No transport available to broadcast event');
            return;
        }
        try {
            await this.transport.broadcast(event);
        }
        catch (error) {
            this.logger.error('Failed to broadcast event', error);
        }
    }
}
exports.MCPServer = MCPServer;
//# sourceMappingURL=server.js.map