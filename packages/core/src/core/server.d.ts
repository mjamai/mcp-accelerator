import { ServerConfig, MCPServerInterface, Tool, Logger, Transport, LifecycleHook, Middleware, ServerCapabilities, ResourceProvider, PromptProvider, ResourceUpdateEvent, PromptUpdateEvent } from '../types';
/**
 * Main MCP Server implementation with full MCP protocol support
 * Automatically handles standard MCP methods: initialize, tools/list, tools/call
 */
export declare class MCPServer implements MCPServerInterface {
    readonly config: ServerConfig;
    readonly logger: Logger;
    private toolManager;
    private errorHandler;
    private protocolManager;
    private baseCapabilities;
    private negotiatedCapabilities;
    private negotiatedProtocol;
    private resourceManager;
    private promptManager;
    private transport;
    private hooks;
    private middlewares;
    private isRunning;
    private clients;
    private initialized;
    private activeProtocolVersion;
    private static readonly LOG_LEVELS;
    constructor(config: ServerConfig);
    /**
     * Register a tool
     */
    registerTool<I = unknown, O = unknown>(tool: Tool<I, O>): void;
    /**
     * Unregister a tool
     */
    unregisterTool(name: string): void;
    /**
     * Register a resource provider
     */
    registerResourceProvider(provider: ResourceProvider): void;
    /**
     * Register a prompt provider
     */
    registerPromptProvider(provider: PromptProvider): void;
    /**
     * List all tools
     */
    listTools(): Tool[];
    /**
     * Register a lifecycle hook
     */
    registerHook(hook: LifecycleHook): void;
    /**
     * Register a middleware
     */
    registerMiddleware(middleware: Middleware): void;
    /**
     * Get the current transport
     */
    getTransport(): Transport | null;
    /**
     * Set a new transport
     */
    setTransport(transport: Transport): Promise<void>;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Load a plugin
     */
    private loadPlugin;
    /**
     * Setup transport event handlers
     */
    private setupTransportHandlers;
    /**
     * Handle incoming message
     */
    private handleMessage;
    /**
     * Handle a request message with full MCP protocol support
     */
    private handleRequest;
    /**
     * Validate JSON-RPC 2.0 request format
     */
    private isValidJsonRpcRequest;
    /**
     * Handle MCP initialize request
     */
    private handleInitialize;
    /**
     * Handle tools/list request
     */
    private handleListTools;
    /**
     * Handle tools/call request (MCP standard method)
     */
    private handleCallTool;
    /**
     * Handle resources/list request (placeholder for future implementation)
     */
    private handleListResources;
    /**
     * Handle resources/read request (placeholder for future implementation)
     */
    private handleReadResource;
    /**
     * Handle prompts/list request (placeholder for future implementation)
     */
    private handleListPrompts;
    /**
     * Handle prompts/get request (placeholder for future implementation)
     */
    private handleGetPrompt;
    /**
     * Handle logging/setLevel request
     */
    private handleSetLogLevel;
    /**
     * Run middlewares
     */
    private runMiddlewares;
    /**
     * Execute lifecycle hooks
     */
    private executeHooks;
    /**
     * Get server status with MCP protocol information
     */
    getStatus(): {
        name: string;
        version: string;
        isRunning: boolean;
        initialized: boolean;
        transport: string | null;
        toolsCount: number;
        clientsCount: number;
        capabilities: ServerCapabilities;
        protocolVersion: string;
    };
    /**
     * Reset server initialization state (for testing)
     */
    resetInitialization(): void;
    /**
     * Compute the capabilities that should be advertised to the client by intersecting
     * the negotiated capabilities with the features the server actually implements.
     */
    private computeAdvertisedCapabilities;
    private isLevelAdjustableLogger;
    private updateResourceCapabilities;
    private createMetadata;
    private updatePromptCapabilities;
    private validatePromptArguments;
    /**
     * Notify all connected clients that resources have been updated.
     */
    notifyResourcesUpdated(event?: ResourceUpdateEvent): Promise<void>;
    /**
     * Notify all connected clients that prompts have been updated.
     */
    notifyPromptsUpdated(event?: PromptUpdateEvent): Promise<void>;
    private broadcastEvent;
}
//# sourceMappingURL=server.d.ts.map