# MCP Accelerator 🚀

[![npm version](https://badge.fury.io/js/@mcp-accelerator%2Fcore.svg)](https://www.npmjs.com/package/@mcp-accelerator/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A modern, modular, and high-performance framework for building **Model Context Protocol (MCP)** servers in TypeScript.

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

| Package | Description | Size | Dependencies |
|---------|-------------|------|--------------|
| [`@mcp-accelerator/core`](packages/core) | 🎯 Core package with server and types | Lightweight | zod |
| [`@mcp-accelerator/transport-stdio`](packages/transport-stdio) | 📝 Stdin/stdout communication | Minimal | None |
| [`@mcp-accelerator/transport-http`](packages/transport-http) | 🌐 HTTP/REST server | ~2 MB | fastify |
| [`@mcp-accelerator/transport-websocket`](packages/transport-websocket) | 🔌 WebSocket communication | ~1 MB | ws |
| [`@mcp-accelerator/transport-sse`](packages/transport-sse) | 📡 Server-Sent Events | ~2 MB | fastify |

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
