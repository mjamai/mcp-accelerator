# MCP Accelerator 🚀

A modern, modular, and high-performance framework for building **Model Context Protocol (MCP)** servers in TypeScript.

## ✨ Features

- 🎯 **Simple API** - Create servers with minimal boilerplate
- 🔌 **Multi-Transport** - STDIO, HTTP, WebSocket, SSE support out of the box
- 🛠️ **Type-Safe Tools** - Define tools with Zod schema validation
- 🧩 **Plugin System** - Extend functionality with custom plugins
- 🎨 **CLI Generators** - Scaffold projects, tools, and transports quickly
- 📝 **Full TypeScript** - Complete type safety and IntelliSense
- ⚡ **High Performance** - Optimized for speed and reliability
- 🔄 **Interchangeable Transports** - Switch between transports without code changes

## 📦 Installation

```bash
npm install mcp-accelerator
```

## 🚀 Quick Start

### Create a Simple Server

```typescript
import { createServer, z } from 'mcp-accelerator';

const server = createServer({
  name: 'my-mcp-server',
  version: '1.0.0',
  transport: {
    type: 'stdio', // or 'http', 'websocket', 'sse'
  },
});

// Register a tool
server.registerTool({
  name: 'greet',
  description: 'Greet a user by name',
  inputSchema: z.object({
    name: z.string().describe('Name of the person to greet'),
  }),
  handler: async (input) => {
    return { message: `Hello, ${input.name}!` };
  },
});

// Start the server
await server.start();
```

### Using the CLI

Generate a complete project:

```bash
npx mcp-accelerator create-project my-server --transport websocket
cd my-server
npm install
npm run dev
```

Generate a new tool:

```bash
npx mcp-accelerator generate-tool calculator --description "Perform calculations"
```

Generate a custom transport:

```bash
npx mcp-accelerator generate-transport mqtt
```

## 📚 Core Concepts

### 1. Server Configuration

```typescript
import { createServer } from 'mcp-accelerator';

const server = createServer({
  name: 'my-server',
  version: '1.0.0',
  logger: customLogger, // Optional custom logger
  transport: {
    type: 'http',
    port: 3000,
    host: '127.0.0.1',
  },
  plugins: [myPlugin], // Optional plugins
});
```

### 2. Tools

Tools are the primary way to expose functionality in MCP servers.

```typescript
import { z } from 'mcp-accelerator';

server.registerTool({
  name: 'process-data',
  description: 'Process data with custom logic',
  inputSchema: z.object({
    data: z.string(),
    options: z.object({
      format: z.enum(['json', 'xml', 'csv']),
      validate: z.boolean().optional(),
    }),
  }),
  handler: async (input, context) => {
    context.logger.info('Processing data');
    
    // Your logic here
    const result = processData(input.data, input.options);
    
    return {
      success: true,
      processed: result,
    };
  },
  metadata: {
    category: 'data-processing',
    version: '1.0.0',
  },
});
```

### 3. Transports

MCP Accelerator supports multiple transports that can be switched without changing your tool logic.

#### STDIO Transport

Perfect for CLI tools and process communication:

```typescript
import { StdioTransport } from 'mcp-accelerator';

const transport = new StdioTransport();
await server.setTransport(transport);
```

#### HTTP Transport

RESTful API with Fastify:

```typescript
import { HttpTransport } from 'mcp-accelerator';

const transport = new HttpTransport({
  host: '127.0.0.1',
  port: 3000,
});
await server.setTransport(transport);
```

#### WebSocket Transport

Real-time bidirectional communication:

```typescript
import { WebSocketTransport } from 'mcp-accelerator';

const transport = new WebSocketTransport({
  host: '127.0.0.1',
  port: 3001,
});
await server.setTransport(transport);
```

#### SSE Transport

Server-Sent Events for streaming:

```typescript
import { SSETransport } from 'mcp-accelerator';

const transport = new SSETransport({
  host: '127.0.0.1',
  port: 3002,
});
await server.setTransport(transport);
```

### 4. Plugins

Extend server functionality with plugins:

```typescript
import { Plugin, MCPServerInterface } from 'mcp-accelerator';

class MyPlugin implements Plugin {
  name = 'my-plugin';
  version = '1.0.0';
  priority = 10; // Higher priority runs first

  async initialize(server: MCPServerInterface): Promise<void> {
    // Add middleware
    server.registerMiddleware({
      name: 'my-middleware',
      handler: async (message, context, next) => {
        console.log('Processing message');
        await next();
      },
    });

    // Add lifecycle hooks
    server.registerHook({
      name: 'my-hook',
      phase: 'beforeToolExecution',
      handler: async (ctx) => {
        console.log('Tool executing:', ctx.toolName);
      },
    });
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}

// Use the plugin
const server = createServer({
  name: 'my-server',
  version: '1.0.0',
  plugins: [new MyPlugin()],
});
```

### 5. Middleware

Process messages before they reach tools:

```typescript
server.registerMiddleware({
  name: 'logging-middleware',
  priority: 100,
  handler: async (message, context, next) => {
    const start = Date.now();
    console.log('Request received:', message.method);
    
    await next(); // Call next middleware or handler
    
    const duration = Date.now() - start;
    console.log('Request completed in', duration, 'ms');
  },
});
```

### 6. Lifecycle Hooks

React to server events:

```typescript
server.registerHook({
  name: 'client-connect-logger',
  phase: 'onClientConnect',
  handler: async (ctx) => {
    console.log('Client connected:', ctx.clientId);
  },
});

server.registerHook({
  name: 'tool-execution-logger',
  phase: 'beforeToolExecution',
  handler: async (ctx) => {
    console.log('Executing tool:', ctx.toolName);
  },
});
```

Available phases:
- `onStart` - Server starting
- `onStop` - Server stopping
- `onClientConnect` - Client connected
- `onClientDisconnect` - Client disconnected
- `beforeToolExecution` - Before tool executes
- `afterToolExecution` - After tool executes

## 🎨 Built-in Plugins

### Logging Plugin

Adds comprehensive logging for all requests and lifecycle events:

```typescript
import { LoggingPlugin } from 'mcp-accelerator';

const server = createServer({
  name: 'my-server',
  version: '1.0.0',
  plugins: [new LoggingPlugin()],
});
```

### Metrics Plugin

Tracks tool execution statistics:

```typescript
import { MetricsPlugin } from 'mcp-accelerator';

const metricsPlugin = new MetricsPlugin();

const server = createServer({
  name: 'my-server',
  version: '1.0.0',
  plugins: [metricsPlugin],
});

// Get metrics
const metrics = metricsPlugin.getMetrics();
console.log(metrics); // { toolExecutions: 42, totalDuration: 1234, errors: 2 }
```

### Rate Limit Plugin

Protect your server from abuse:

```typescript
import { RateLimitPlugin } from 'mcp-accelerator';

const server = createServer({
  name: 'my-server',
  version: '1.0.0',
  plugins: [
    new RateLimitPlugin(100, 60000), // 100 requests per minute
  ],
});
```

## 🔧 Advanced Usage

### Custom Logger

Implement your own logger:

```typescript
import { Logger } from 'mcp-accelerator';
import pino from 'pino';

class PinoLogger implements Logger {
  private logger = pino();

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta, message);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta, message);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.logger.error({ ...meta, err: error }, message);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(meta, message);
  }
}

const server = createServer({
  name: 'my-server',
  version: '1.0.0',
  logger: new PinoLogger(),
});
```

### Error Handling

Centralized error handling:

```typescript
import { ErrorHandler, MCPErrorCode } from 'mcp-accelerator';

const errorHandler = new ErrorHandler();

// Register custom error handler
errorHandler.registerHandler(MCPErrorCode.VALIDATION_ERROR, (error) => {
  console.error('Validation failed:', error.message);
  // Send notification, log to external service, etc.
});
```

### Dynamic Tool Registration

Add and remove tools at runtime:

```typescript
// Add tool
server.registerTool(newTool);

// Remove tool
server.unregisterTool('tool-name');

// List all tools
const tools = server.listTools();
```

### Server Status

Monitor server status:

```typescript
const status = server.getStatus();
console.log(status);
// {
//   name: 'my-server',
//   version: '1.0.0',
//   isRunning: true,
//   transport: 'websocket',
//   toolsCount: 5,
//   clientsCount: 3
// }
```

## 📖 Examples

Check out the [examples/](./examples) directory for complete working examples:

- **basic-stdio** - Simple echo server
- **websocket-server** - Real-time calculator
- **http-api** - RESTful API with data processing
- **custom-plugin** - Authentication plugin example

## 🧪 Testing

MCP Accelerator is designed to be testable:

```typescript
import { createServer, SilentLogger, z } from 'mcp-accelerator';

describe('My Tool', () => {
  let server;

  beforeEach(() => {
    server = createServer({
      name: 'test-server',
      version: '1.0.0',
      logger: new SilentLogger(), // Silent logger for tests
    });

    server.registerTool({
      name: 'test-tool',
      description: 'Test tool',
      inputSchema: z.object({
        value: z.number(),
      }),
      handler: async (input) => {
        return { doubled: input.value * 2 };
      },
    });
  });

  it('should execute tool correctly', async () => {
    const toolManager = server['toolManager'];
    const result = await toolManager.executeTool(
      'test-tool',
      { value: 5 },
      { clientId: 'test', logger: new SilentLogger() }
    );

    expect(result.success).toBe(true);
    expect(result.result.doubled).toBe(10);
  });
});
```

## 📝 API Documentation

Generate full API documentation:

```bash
npm run docs
```

This will generate TypeDoc documentation in the `docs/` directory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:
- [Zod](https://github.com/colinhacks/zod) - Schema validation
- [Fastify](https://www.fastify.io/) - HTTP server
- [ws](https://github.com/websockets/ws) - WebSocket implementation
- [Commander](https://github.com/tj/commander.js) - CLI framework

---

**Made with ❤️ for the MCP community**

