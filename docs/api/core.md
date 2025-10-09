# Core API Reference

Complete reference for the core MCP Accelerator framework, including the main server, tools, and lifecycle hooks.

## MCPServer

The main server class that orchestrates all MCP functionality.

### Constructor

```typescript
new MCPServer(config: ServerConfig)
```

#### ServerConfig

```typescript
interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  logger?: LoggerConfig;
  maxConnections?: number;
  requestTimeout?: number;
}
```

**Properties:**

- `name` (string): Server name for identification
- `version` (string): Server version
- `description` (string, optional): Human-readable server description
- `logger` (LoggerConfig, optional): Logging configuration
- `maxConnections` (number, optional): Maximum concurrent connections (default: 1000)
- `requestTimeout` (number, optional): Default request timeout in milliseconds (default: 30000)

### Methods

#### `addTool(definition: ToolDefinition, handler: ToolHandler): void`

Registers a new tool with the server.

```typescript
server.addTool({
  name: 'search',
  description: 'Search for documents',
  inputSchema: { /* JSON Schema */ }
}, async (input) => {
  return { content: [{ type: 'text', text: 'Results...' }] };
});
```

#### `removeTool(name: string): boolean`

Removes a tool from the server.

```typescript
const removed = server.removeTool('search');
```

#### `getTool(name: string): ToolDefinition | undefined`

Gets a tool definition by name.

```typescript
const tool = server.getTool('search');
```

#### `listTools(): ToolDefinition[]`

Lists all registered tools.

```typescript
const tools = server.listTools();
```

#### `start(transport: Transport): Promise<void>`

Starts the server with the specified transport.

```typescript
await server.start(new HTTPTransport({ port: 3000 }));
```

#### `stop(): Promise<void>`

Stops the server gracefully.

```typescript
await server.stop();
```

#### `use(middleware: Middleware): void`

Adds middleware to the server.

```typescript
server.use(new AuthenticationMiddleware({ /* config */ }));
```

### Lifecycle Hooks

#### `onRequest(callback: (context: RequestContext) => void): void`

Called when a request is received.

```typescript
server.onRequest((context) => {
  console.log('Request started:', context.request);
  context.startTime = Date.now();
});
```

#### `onResponse(callback: (context: ResponseContext) => void): void`

Called when a response is ready to be sent.

```typescript
server.onResponse((context) => {
  const duration = Date.now() - context.startTime;
  console.log('Request completed in:', duration, 'ms');
});
```

#### `onError(callback: (context: ErrorContext) => void): void`

Called when an error occurs.

```typescript
server.onError((context) => {
  console.error('Request failed:', context.error);
});
```

#### `beforeToolExecution(callback: (context: ToolContext) => void): void`

Called before tool handler execution.

```typescript
server.beforeToolExecution((context) => {
  console.log('Executing tool:', context.toolName);
});
```

#### `afterToolExecution(callback: (context: ToolContext) => void): void`

Called after tool handler execution.

```typescript
server.afterToolExecution((context) => {
  console.log('Tool completed:', context.result);
});
```

#### `onClientConnect(callback: (context: ClientContext) => void): void`

Called when a client connects.

```typescript
server.onClientConnect((context) => {
  console.log('Client connected:', context.clientId);
});
```

#### `onClientDisconnect(callback: (context: ClientContext) => void): void`

Called when a client disconnects.

```typescript
server.onClientDisconnect((context) => {
  console.log('Client disconnected:', context.clientId);
});
```

## ToolDefinition

Defines the structure and behavior of a tool.

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler?: ToolHandler;
}
```

**Properties:**

- `name` (string): Unique tool identifier
- `description` (string): Human-readable tool description
- `inputSchema` (JSONSchema): JSON Schema for input validation
- `handler` (ToolHandler, optional): Tool execution function

### Example

```typescript
const searchTool: ToolDefinition = {
  name: 'search',
  description: 'Search for documents with advanced filtering',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
        minLength: 1,
        maxLength: 1000
      },
      limit: {
        type: 'number',
        description: 'Maximum results',
        minimum: 1,
        maximum: 100,
        default: 10
      },
      filters: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' }
            }
          }
        }
      }
    },
    required: ['query']
  }
};
```

## ToolHandler

Function that executes tool logic.

```typescript
type ToolHandler = (input: any, context: ToolContext) => Promise<ToolResult>;
```

### ToolContext

```typescript
interface ToolContext {
  clientId: string;
  request: MCPRequest;
  logger: Logger;
  metadata: Record<string, any>;
}
```

### ToolResult

```typescript
interface ToolResult {
  content: Content[];
  metadata?: Record<string, any>;
}
```

### Content Types

```typescript
type Content = TextContent | ImageContent | ResourceContent;

interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

interface ResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}
```

### Example Handler

```typescript
const searchHandler: ToolHandler = async (input, context) => {
  const { query, limit = 10, filters } = input;
  
  context.logger.info('Searching documents', { query, limit, filters });
  
  try {
    const results = await searchDocuments(query, { limit, filters });
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} documents matching "${query}"`
        }
      ],
      metadata: {
        query,
        resultCount: results.length,
        executionTime: Date.now() - context.startTime
      }
    };
  } catch (error) {
    context.logger.error('Search failed', error);
    throw createMCPError(
      MCPErrorCode.INTERNAL_ERROR,
      'Search operation failed',
      { originalError: error.message }
    );
  }
};
```

## Error Handling

### MCPError

Standardized error structure for MCP operations.

```typescript
interface MCPError {
  code: MCPErrorCode;
  message: string;
  details?: any;
  stack?: string;
}
```

### MCPErrorCode

```typescript
enum MCPErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  ABORTED = 'ABORTED'
}
```

### Error Creation

#### `createMCPError(code: MCPErrorCode, message: string, details?: any): MCPError`

Creates a standardized MCP error.

```typescript
throw createMCPError(
  MCPErrorCode.VALIDATION_ERROR,
  'Invalid input format',
  { field: 'query', received: input.query, expected: 'string' }
);
```

#### `formatValidationError(zodError: unknown): MCPError`

Formats Zod validation errors into user-friendly MCP errors.

```typescript
try {
  const validated = schema.parse(input);
} catch (error) {
  throw formatValidationError(error);
}
```

## Safe Handler Utilities

### `safeHandler(fn: ToolHandler, options?: SafeHandlerOptions): ToolHandler`

Wraps a tool handler with safety features like timeout, retry, and error handling.

```typescript
const safeToolHandler = safeHandler(
  async (input, context) => {
    // Your tool logic here
    return await processInput(input);
  },
  {
    timeout: 5000,
    retry: {
      attempts: 3,
      delay: 1000
    },
    circuitBreaker: {
      threshold: 5,
      timeout: 30000
    }
  }
);
```

### SafeHandlerOptions

```typescript
interface SafeHandlerOptions {
  timeout?: number;
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
  circuitBreaker?: {
    threshold: number;
    timeout: number;
    resetTimeout?: number;
  };
}
```

### `executeWithTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T>`

Executes a promise with a timeout.

```typescript
const result = await executeWithTimeout(
  fetchData(),
  5000,
  abortSignal
);
```

### `withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T>`

Executes a function with retry logic.

```typescript
const result = await withRetry(
  () => callExternalAPI(),
  { attempts: 3, delay: 1000 }
);
```

### `withCircuitBreaker<T>(fn: () => Promise<T>, options: CircuitBreakerOptions): Promise<T>`

Executes a function with circuit breaker protection.

```typescript
const result = await withCircuitBreaker(
  () => callUnreliableService(),
  { threshold: 5, timeout: 30000 }
);
```

## Logging

### Logger

Structured logging interface.

```typescript
interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
}
```

### LogContext

```typescript
interface LogContext {
  [key: string]: any;
  clientId?: string;
  toolName?: string;
  duration?: number;
  requestId?: string;
}
```

### Logger Configuration

```typescript
interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'pretty';
  destination?: 'console' | 'file' | 'stream';
  file?: string;
}
```

### Usage

```typescript
// In tool handlers
context.logger.info('Processing request', {
  toolName: 'search',
  input: sanitizedInput,
  clientId: context.clientId
});

// In lifecycle hooks
server.onRequest((context) => {
  context.logger.debug('Request received', {
    method: context.request.method,
    path: context.request.path,
    clientId: context.clientId
  });
});
```

## Metrics and Observability

### Metrics Collection

```typescript
interface MetricsCollector {
  incrementCounter(name: string, labels?: Record<string, string>): void;
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  getMetrics(): string; // Prometheus format
}
```

### Built-in Metrics

- `mcp_requests_total`: Total number of requests
- `mcp_request_duration_seconds`: Request duration histogram
- `mcp_active_connections`: Number of active connections
- `mcp_tool_executions_total`: Total tool executions
- `mcp_tool_execution_duration_seconds`: Tool execution duration

### Usage

```typescript
// In server hooks
server.onRequest((context) => {
  server.metrics.incrementCounter('mcp_requests_total', {
    method: context.request.method,
    tool: context.request.toolName
  });
});

server.onResponse((context) => {
  const duration = Date.now() - context.startTime;
  server.metrics.observeHistogram('mcp_request_duration_seconds', duration / 1000);
});

// In tool handlers
context.metrics.incrementCounter('mcp_tool_executions_total', {
  tool: 'search',
  status: 'success'
});
```

## Context Interfaces

### RequestContext

```typescript
interface RequestContext {
  clientId: string;
  request: MCPRequest;
  startTime: number;
  metadata: Record<string, any>;
}
```

### ResponseContext

```typescript
interface ResponseContext {
  clientId: string;
  request: MCPRequest;
  response?: MCPResponse;
  error?: MCPError;
  duration: number;
  startTime: number;
}
```

### ErrorContext

```typescript
interface ErrorContext {
  clientId: string;
  request: MCPRequest;
  error: Error;
  duration: number;
  startTime: number;
}
```

### ToolContext

```typescript
interface ToolContext {
  clientId: string;
  request: MCPRequest;
  toolName: string;
  input: any;
  result?: ToolResult;
  error?: Error;
  startTime: number;
}
```

### ClientContext

```typescript
interface ClientContext {
  clientId: string;
  connectionInfo: ConnectionInfo;
  metadata: Record<string, any>;
}
```

## Connection Management

### ConnectionInfo

```typescript
interface ConnectionInfo {
  id: string;
  type: 'http' | 'websocket' | 'sse' | 'stdio';
  remoteAddress?: string;
  userAgent?: string;
  connectedAt: Date;
  lastActivity?: Date;
}
```

### Connection Management Methods

```typescript
// Get active connections
const connections = server.getActiveConnections();

// Get connection by ID
const connection = server.getConnection(clientId);

// Disconnect a client
await server.disconnectClient(clientId);

// Broadcast message to all clients
await server.broadcast(message);
```

---

*For more specific examples and advanced usage patterns, see the [Examples](../examples/) section.*
