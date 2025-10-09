# MCP Accelerator 🚀

[![npm version](https://img.shields.io/npm/v/@mcp-accelerator/core.svg)](https://www.npmjs.com/package/@mcp-accelerator/core)
[![npm downloads](https://img.shields.io/npm/dm/@mcp-accelerator/core.svg)](https://www.npmjs.com/package/@mcp-accelerator/core)
[![GitHub release](https://img.shields.io/github/v/release/mjfphp/mcrapid.svg)](https://github.com/mjfphp/mcrapid/releases/tag/v1.0.0)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![CI](https://github.com/mjfphp/MCraPid/workflows/CI/badge.svg)](https://github.com/mjfphp/MCraPid/actions)
[![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen.svg)](./coverage)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> 🎉 **v1.0.0 Now Available on npm!** Install with: `npm install @mcp-accelerator/core`  
> 📦 **10 packages published** | 🏢 [View on npm](https://www.npmjs.com/org/mcp-accelerator) | 🏷️ [Release Notes](https://github.com/mjfphp/mcrapid/releases/tag/v1.0.0)

A modern, modular, and high-performance framework for building **Model Context Protocol (MCP)** servers in TypeScript.

## 🆕 What's New in v1.0.0

- 🛡️ **Safe Handler Utilities** - Automatic timeout, retry, and circuit breaker support
- ✨ **Enhanced Error Messages** - User-friendly validation errors with field-level details
- 📊 **Request/Response Hooks** - Full lifecycle observability for metrics and audit logging
- 🚀 **Production Example** - Complete server with TLS, JWT auth, and rate limiting
- 🧪 **Integration Tests** - 192 tests passing with comprehensive coverage
- 📚 **Complete Documentation** - Production-ready guides and best practices

[See full changelog →](./CHANGELOG.md) | [View examples →](./examples/)

## ✨ Features

- 🎯 **Simple API** - Create servers with minimal boilerplate
- 🔌 **Multi-Transport** - STDIO, HTTP, WebSocket, SSE support
- 📦 **Modular Architecture** - Install only what you need
- 🛠️ **Type-Safe** - Tools with Zod schema validation
- 🧩 **Plugin System** - Extend functionality with custom plugins
- 📝 **Full TypeScript** - Complete type safety and IntelliSense
- ⚡ **High Performance** - Optimized for speed and reliability
- 🔄 **Interchangeable Transports** - Switch transports without code changes

## 📦 Installation

### Basic Installation

```bash
# Core package (lightweight, includes only the core)
npm install @mcp-accelerator/core zod
```

### Add the transports you need

```bash
# STDIO (no external dependencies - Node.js native)
npm install @mcp-accelerator/transport-stdio

# HTTP (Fastify ~2 MB)
npm install @mcp-accelerator/transport-http

# WebSocket (ws ~1 MB)
npm install @mcp-accelerator/transport-websocket

# Server-Sent Events (Fastify ~2 MB)
npm install @mcp-accelerator/transport-sse
```

> **💡 Modular Architecture Benefit**: Install only the transports you need, reducing bundle size and installation time!

## 🚀 Quick Start

### STDIO Example (CLI)

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { StdioTransport } from '@mcp-accelerator/transport-stdio';

const server = new MCPServer({
  name: 'my-cli-server',
  version: '1.0.0',
});

server.setTransport(new StdioTransport());

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

await server.start();
```

### HTTP Example

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';

const server = new MCPServer({
  name: 'my-http-server',
  version: '1.0.0',
});

server.setTransport(new HttpTransport({
  host: '0.0.0.0',
  port: 3000,
}));

server.registerTool({
  name: 'calculate',
  description: 'Perform a calculation',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  }),
  handler: async (input) => {
    const operations = {
      add: input.a + input.b,
      subtract: input.a - input.b,
      multiply: input.a * input.b,
      divide: input.a / input.b,
    };
    return { result: operations[input.operation] };
  },
});

await server.start();
```

### WebSocket Example

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { WebSocketTransport } from '@mcp-accelerator/transport-websocket';

const server = new MCPServer({
  name: 'my-websocket-server',
  version: '1.0.0',
});

server.setTransport(new WebSocketTransport({
  host: '0.0.0.0',
  port: 3001,
}));

server.registerTool({
  name: 'broadcast',
  description: 'Broadcast a message to all clients',
  inputSchema: z.object({
    message: z.string(),
  }),
  handler: async (input, context) => {
    const transport = server.getTransport();
    if (transport) {
      await transport.broadcast({
        type: 'event',
        method: 'notification',
        params: { message: input.message },
      });
    }
    return { broadcasted: true };
  },
});

await server.start();
```

## 📚 Packages

MCP Accelerator is organized into several modular packages:

### Core & Transports

| Package | Description | Size | Dependencies |
|---------|-------------|------|--------------|
| [`@mcp-accelerator/core`](packages/core) | 🎯 Core package with server and types | Lightweight | zod |
| [`@mcp-accelerator/transport-stdio`](packages/transport-stdio) | 📝 Stdin/stdout communication | Minimal | None |
| [`@mcp-accelerator/transport-http`](packages/transport-http) | 🌐 HTTP/REST server | ~2 MB | fastify |
| [`@mcp-accelerator/transport-websocket`](packages/transport-websocket) | 🔌 WebSocket communication | ~1 MB | ws |
| [`@mcp-accelerator/transport-sse`](packages/transport-sse) | 📡 Server-Sent Events | ~2 MB | fastify |

### Security Middleware (Optional)

| Package | Description | Use Case |
|---------|-------------|----------|
| [`@mcp-accelerator/middleware-auth`](packages/middleware-auth) | 🔐 JWT & API Key authentication | Secure APIs |
| [`@mcp-accelerator/middleware-ratelimit`](packages/middleware-ratelimit) | ⏱️ Rate limiting & quotas | Prevent abuse |
| [`@mcp-accelerator/middleware-cors`](packages/middleware-cors) | 🌐 CORS configuration | Browser clients |

### Resilience Middleware (Optional)

| Package | Description | Use Case |
|---------|-------------|----------|
| [`@mcp-accelerator/middleware-resilience`](packages/middleware-resilience) | 🛡️ Circuit breaker, timeout, retry, bulkhead | Production stability |

### Observability Middleware (Optional)

| Package | Description | Use Case |
|---------|-------------|----------|
| [`@mcp-accelerator/middleware-observability`](packages/middleware-observability) | 🔍 OpenTelemetry tracing, metrics & logs | Production monitoring |

> **Note**: Middleware packages are optional. Install only what you need for your use case.

## 🎯 Core Concepts

### 1. Server Configuration

```typescript
import { MCPServer } from '@mcp-accelerator/core';

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  logger: customLogger, // Optional custom logger
  plugins: [myPlugin],  // Optional plugins
});
```

### 2. Tools

Tools are the primary way to expose functionality:

```typescript
import { z } from 'zod';

server.registerTool({
  name: 'searchDatabase',
  description: 'Search the database',
  inputSchema: z.object({
    query: z.string().min(1),
    limit: z.number().optional().default(10),
  }),
  handler: async (input, context) => {
    // Access logger
    context.logger.info(`Searching: ${input.query}`);
    
    // Your business logic
    const results = await database.search(input.query, input.limit);
    
    return { results, count: results.length };
  },
});
```

### 3. Switching Transports

You can easily switch transports without modifying your business logic:

```typescript
import { StdioTransport } from '@mcp-accelerator/transport-stdio';
import { HttpTransport } from '@mcp-accelerator/transport-http';

// Development with STDIO
if (process.env.NODE_ENV === 'development') {
  server.setTransport(new StdioTransport());
}

// Production with HTTP
if (process.env.NODE_ENV === 'production') {
  server.setTransport(new HttpTransport({ port: 3000 }));
}
```

### 4. Plugins

Create reusable plugins:

```typescript
import { Plugin, MCPServerInterface } from '@mcp-accelerator/core';

const rateLimitPlugin: Plugin = {
  name: 'rate-limit',
  version: '1.0.0',
  async initialize(server: MCPServerInterface) {
    server.registerMiddleware({
      name: 'rate-limit',
      priority: 100,
      async handler(message, context, next) {
        // Your rate limiting logic
        await next();
      },
    });
  },
};

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  plugins: [rateLimitPlugin],
});
```

### 5. Lifecycle Hooks

React to server events using the `HookPhase` enum:

```typescript
import { HookPhase } from '@mcp-accelerator/core';

server.registerHook({
  name: 'log-connections',
  phase: HookPhase.OnClientConnect,
  handler: async (context) => {
    console.log(`Client connected: ${context.data.clientId}`);
  },
});

server.registerHook({
  name: 'log-tool-execution',
  phase: HookPhase.BeforeToolExecution,
  handler: async (context) => {
    console.log(`Executing tool: ${context.data.toolName}`);
  },
});
```

**Available Hook Phases:**
- `HookPhase.OnStart` - Server is starting
- `HookPhase.OnStop` - Server is stopping
- `HookPhase.OnClientConnect` - Client connected
- `HookPhase.OnClientDisconnect` - Client disconnected
- `HookPhase.BeforeToolExecution` - Before a tool executes
- `HookPhase.AfterToolExecution` - After a tool executes

## 📖 Examples

Check the [`examples/`](examples/) folder for complete examples:

- [STDIO Basic](examples/basic-stdio/) - Simple CLI server
- [HTTP API](examples/http-api/) - REST API
- [WebSocket Server](examples/websocket-server/) - Real-time server
- [Custom Plugin](examples/custom-plugin/) - Create a custom plugin

## 🔒 Production Security

MCP Accelerator provides **optional security packages** for production deployments:

### Quick Security Setup

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';
import { createJWTAuthMiddleware } from '@mcp-accelerator/middleware-auth';
import { createRateLimitMiddleware } from '@mcp-accelerator/middleware-ratelimit';

const server = new MCPServer({ name: 'secure-api', version: '1.0.0' });
server.setTransport(new HttpTransport({ port: 3000 }));

// Add authentication
server.registerMiddleware(createJWTAuthMiddleware({
  secret: process.env.JWT_SECRET!
}));

// Add rate limiting
server.registerMiddleware(createRateLimitMiddleware({
  max: 100,
  windowMs: 60 * 1000
}));

await server.start();
```

**Learn more**: See [Security Packages Guide](docs/SECURITY_PACKAGES.md) for complete security guide.

## 🔍 Production Observability

MCP Accelerator includes **OpenTelemetry support** for full-stack observability:

### Quick Observability Setup

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import {
  initializeObservability,
  createTracingMiddleware,
  createMetricsHooks,
  createOTelLogger,
} from '@mcp-accelerator/middleware-observability';

// Initialize OpenTelemetry (Jaeger + Prometheus)
await initializeObservability({
  serviceName: 'my-mcp-server',
  traceExporter: 'jaeger',
  metricsExporter: 'prometheus',
  prometheusPort: 9464
});

// Create server with observability
const logger = createOTelLogger({ serviceName: 'my-mcp-server' });
const server = new MCPServer({ name: 'my-server', version: '1.0.0', logger });

// Add tracing
server.registerMiddleware(createTracingMiddleware());

// Add metrics
createMetricsHooks().forEach(hook => server.registerHook(hook));

await server.start();
```

**Includes:**
- ✅ Distributed tracing (Jaeger, Zipkin, OTLP)
- ✅ Metrics collection (Prometheus, OTLP)
- ✅ Structured logging (OpenTelemetry Logs)
- ✅ Auto-instrumentation

**Learn more**: See the [Observability Package README](packages/middleware-observability/README.md).

## 🎨 TypeScript Ergonomics

MCP Accelerator est conçu pour une **expérience développeur exceptionnelle** avec TypeScript :

```typescript
import { z } from '@mcp-accelerator/core';

// ✅ Types inférés automatiquement depuis Zod
const inputSchema = z.object({
  name: z.string(),
  age: z.number(),
});

type Input = z.infer<typeof inputSchema>;

server.registerTool<Input, { result: string }>({
  name: 'my-tool',
  description: 'Fully typed tool',
  inputSchema,
  handler: async (input, context) => {
    // ✅ input.name - Auto-complétion complète!
    // ✅ input.age - Type-safe!
    // ✅ context.metadata.user - Typé avec StrictMetadata!
    
    console.log(input.name);  // string
    console.log(context.metadata.user?.id);  // string | undefined
    
    return { result: `Hello ${input.name}` };
  },
});
```

**Features:**
- ✅ Types génériques pour Tools, Middleware, Hooks
- ✅ `StrictMetadata` pour auto-complétion des métadonnées
- ✅ `MCPRequest<T>`, `MCPResponse<T>`, `MCPEvent<T>` typés
- ✅ Helper types: `InferToolInput`, `InferToolOutput`, `TypedTool`
- ✅ Plus de `any` dans l'API publique

**Learn more**: See [TypeScript Ergonomics Guide](docs/TYPESCRIPT_ERGONOMICS.md).

## 📚 Documentation

Comprehensive guides are available in the [`docs/`](docs/) directory:

| Guide | Description |
|-------|-------------|
| [Security Packages](docs/SECURITY_PACKAGES.md) | Production security guide (auth, rate limiting, CORS) |
| [TypeScript Ergonomics](docs/TYPESCRIPT_ERGONOMICS.md) | Type-safe development guide |
| [Testing Guide](docs/TESTING_GUIDE.md) | Testing best practices and CI/CD |
| [Release Guide](docs/RELEASE_GUIDE.md) | How to release new versions |

See [`docs/README.md`](docs/README.md) for complete documentation index.

## 🏗️ Monorepo Architecture

This project uses npm workspaces to manage multiple packages:

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Build a specific package
npm run build:core
npm run build:stdio
npm run build:http
npm run build:websocket
npm run build:sse

# Watch mode for development
npm run dev

# Tests
npm test
```

## 🔧 Development

```bash
# Clone the repo
git clone https://github.com/mohamedjamai/mcp-accelerator.git
cd mcp-accelerator

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## 📝 Comparison with Monolithic Architecture

| Aspect | Before (Monolithic) | After (Modular) |
|--------|---------------------|-----------------|
| **Minimal install** | ~5 MB | ~500 KB |
| **STDIO bundle** | Includes Fastify + ws | No external dependencies |
| **Flexibility** | All dependencies installed | Choose what you need |
| **Install time** | ~30 seconds | ~5 seconds (core + stdio) |
| **Tree-shaking** | Limited | Optimal |

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT © Mohamed JAMAI

## 🔗 Useful Links

- [MCP Documentation](https://modelcontextprotocol.io)
- [Zod Documentation](https://zod.dev)
- [Fastify Documentation](https://www.fastify.io)
- [ws Documentation](https://github.com/websockets/ws)

---

**Made with ❤️ for the MCP community**
