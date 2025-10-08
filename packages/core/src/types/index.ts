/**
 * Types et interfaces centraux du framework MCP Accelerator
 */

import { z } from 'zod';

/**
 * Generic metadata type for extensibility
 * Allows any JSON-serializable value
 */
export type Metadata = Record<string, unknown>;

/**
 * Strongly typed metadata with known fields
 * Provides IntelliSense for common fields while allowing extensions
 */
export interface StrictMetadata {
  // Common fields
  ip?: string;
  userAgent?: string;
  authenticated?: boolean;
  user?: {
    id: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    plan?: string;
    [key: string]: unknown;
  };
  // Rate limiting
  rateLimit?: {
    limit: number;
    current: number;
    remaining: number;
    reset: number;
  };
  // Observability
  traceId?: string;
  spanId?: string;
  // Custom fields
  [key: string]: unknown;
}

/**
 * MCP Server Configuration
 */
export interface ServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Custom logger (optional) */
  logger?: Logger;
  /** Transport options */
  transport?: TransportConfig;
  /** Plugins to load at startup */
  plugins?: Plugin[];
}

/**
 * Transport Configuration
 */
export interface TransportConfig {
  /** Transport type */
  type: 'stdio' | 'http' | 'websocket' | 'sse';
  /** Port for HTTP/WebSocket/SSE */
  port?: number;
  /** Host for HTTP/WebSocket/SSE */
  host?: string;
  /** Additional options */
  options?: Metadata;
}

/**
 * Customizable logger interface
 */
export interface Logger {
  info(message: string, meta?: Metadata): void;
  warn(message: string, meta?: Metadata): void;
  error(message: string, error?: Error, meta?: Metadata): void;
  debug(message: string, meta?: Metadata): void;
}

/**
 * MCP Tool definition with Zod validation
 */
export interface Tool<TInput = unknown, TOutput = unknown> {
  /** Unique tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input validation schema with Zod */
  inputSchema: z.ZodType<TInput>;
  /** Async business logic handler */
  handler: ToolHandler<TInput, TOutput>;
  /** Additional metadata */
  metadata?: Metadata;
}

/**
 * Tool handler with strict typing
 */
export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ToolContext
) => Promise<TOutput>;

/**
 * Tool execution context
 */
export interface ToolContext<TMetadata extends Metadata = StrictMetadata> {
  /** Client ID that made the request */
  clientId: string;
  /** Request metadata (typed) */
  metadata: TMetadata;
  /** Logger for this tool */
  logger: Logger;
}

/**
 * Standard MCP message with generic typing
 */
export interface MCPMessage<TParams = unknown, TResult = unknown> {
  /** Message type */
  type: 'request' | 'response' | 'error' | 'event';
  /** Message ID (to correlate request/response) */
  id?: string;
  /** Method or event name */
  method?: string;
  /** Parameters or data */
  params?: TParams;
  /** Result (for response) */
  result?: TResult;
  /** Error (for error) */
  error?: MCPError;
}

/**
 * Typed MCP Request
 */
export interface MCPRequest<TParams = unknown> extends MCPMessage<TParams, never> {
  type: 'request';
  method: string;
  params?: TParams;
}

/**
 * Typed MCP Response
 */
export interface MCPResponse<TResult = unknown> extends MCPMessage<never, TResult> {
  type: 'response';
  id: string;
  result: TResult;
}

/**
 * Typed MCP Event
 */
export interface MCPEvent<TData = unknown> extends MCPMessage<TData, never> {
  type: 'event';
  method: string;
  params: TData;
}

/**
 * Standard MCP Error
 */
export interface MCPError<TData = unknown> {
  /** Error code */
  code: number;
  /** Error message */
  message: string;
  /** Additional data */
  data?: TData;
}

/**
 * Abstract transport interface
 */
export interface Transport {
  /** Transport name */
  name: string;
  /** Start the transport */
  start(): Promise<void>;
  /** Stop the transport */
  stop(): Promise<void>;
  /** Send a message to a client */
  send(clientId: string, message: MCPMessage): Promise<void>;
  /** Broadcast a message to all clients */
  broadcast(message: MCPMessage): Promise<void>;
  /** Event handler for received messages */
  onMessage(handler: MessageHandler): void;
  /** Event handler for client connections */
  onConnect(handler: ConnectHandler): void;
  /** Event handler for client disconnections */
  onDisconnect(handler: DisconnectHandler): void;
}

/**
 * Message handler
 */
export type MessageHandler = (clientId: string, message: MCPMessage) => void | Promise<void>;

/**
 * Connection handler
 */
export type ConnectHandler = (clientId: string) => void | Promise<void>;

/**
 * Disconnection handler
 */
export type DisconnectHandler = (clientId: string) => void | Promise<void>;

/**
 * Plugin to extend the server
 */
export interface Plugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Execution priority (higher = earlier) */
  priority?: number;
  /** Plugin initialization */
  initialize(server: MCPServerInterface): Promise<void> | void;
  /** Cleanup on deactivation */
  cleanup?(): Promise<void> | void;
}

/**
 * MCP Server interface (for plugins and extensions)
 */
export interface MCPServerInterface {
  /** Server configuration */
  config: ServerConfig;
  /** Server logger */
  logger: Logger;
  /** Register a tool */
  registerTool<TInput = unknown, TOutput = unknown>(tool: Tool<TInput, TOutput>): void;
  /** Unregister a tool */
  unregisterTool(name: string): void;
  /** List all tools */
  listTools(): Tool[];
  /** Register a lifecycle hook */
  registerHook(hook: LifecycleHook): void;
  /** Register a middleware */
  registerMiddleware(middleware: Middleware): void;
  /** Get current transport */
  getTransport(): Transport | null;
  /** Set transport */
  setTransport(transport: Transport): Promise<void>;
}

/**
 * Lifecycle hook phases
 */
export enum HookPhase {
  OnStart = 'onStart',
  OnStop = 'onStop',
  OnClientConnect = 'onClientConnect',
  OnClientDisconnect = 'onClientDisconnect',
  BeforeToolExecution = 'beforeToolExecution',
  AfterToolExecution = 'afterToolExecution',
  OnError = 'onError',
  OnRequest = 'onRequest',
  OnResponse = 'onResponse',
}

/**
 * Lifecycle hook
 */
export interface LifecycleHook<TContext extends HookContext = HookContext> {
  /** Hook name */
  name: string;
  /** Lifecycle phase */
  phase: HookPhase;
  /** Hook handler */
  handler: HookHandler<TContext>;
}

/**
 * Hook handler
 */
export type HookHandler<TContext extends HookContext = HookContext> = (
  context: TContext
) => void | Promise<void>;

/**
 * Hook context with generic typing
 */
export interface HookContext<TData = unknown, TMetadata extends Metadata = StrictMetadata> {
  /** Event type */
  event: string;
  /** Associated data (typed) */
  data?: TData;
  /** Related client (if applicable) */
  clientId?: string;
  /** Related tool (if applicable) */
  toolName?: string;
  /** Execution duration in ms (if applicable) */
  duration?: number;
  /** Error (if applicable) */
  error?: Error;
  /** Request message (if applicable) */
  request?: MCPMessage;
  /** Response message (if applicable) */
  response?: MCPMessage;
  /** Start timestamp */
  startTime?: number;
  /** Additional metadata for observability */
  metadata?: TMetadata;
}

/**
 * Specific contexts for each phase
 * These types provide better auto-completion for hooks
 */
export interface ToolExecutionContext<TData = unknown> extends HookContext<TData> {
  toolName: string;
  startTime: number;
}

export interface ClientConnectionContext extends HookContext {
  clientId: string;
}

export interface ErrorContext extends HookContext {
  error: Error;
}

/**
 * Middleware for processing messages
 */
export interface Middleware<TMetadata extends Metadata = StrictMetadata> {
  /** Middleware name */
  name: string;
  /** Execution priority */
  priority?: number;
  /** Middleware handler */
  handler: MiddlewareHandler<TMetadata>;
}

/**
 * Middleware handler
 */
export type MiddlewareHandler<TMetadata extends Metadata = StrictMetadata> = (
  message: MCPMessage,
  context: MiddlewareContext<TMetadata>,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Middleware context with generic typing
 */
export interface MiddlewareContext<TMetadata extends Metadata = StrictMetadata> {
  /** Client ID */
  clientId: string;
  /** Logger */
  logger: Logger;
  /** Typed metadata */
  metadata: TMetadata;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult<TOutput = unknown> {
  /** Success or failure */
  success: boolean;
  /** Result (if success) */
  result?: TOutput;
  /** Error (if failure) */
  error?: MCPError;
  /** Execution duration in ms */
  duration: number;
}

/**
 * Helper types to improve ergonomics
 */

/**
 * Extract input type from Tool
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferToolInput<T extends Tool<any, any>> = 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Tool<infer I, any> ? I : never;

/**
 * Extract output type from Tool
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferToolOutput<T extends Tool<any, any>> = 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Tool<any, infer O> ? O : never;

/**
 * Type-safe tool registration helper
 */
export type TypedTool<TInput, TOutput> = Tool<TInput, TOutput>;

/**
 * Type-safe middleware registration helper
 */
export type TypedMiddleware<TMetadata extends Metadata = StrictMetadata> = 
  Middleware<TMetadata>;

/**
 * Type-safe hook registration helper
 */
export type TypedHook<TContext extends HookContext = HookContext> = 
  LifecycleHook<TContext>;