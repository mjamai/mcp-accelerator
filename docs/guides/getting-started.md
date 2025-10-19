# Getting Started with MCP Accelerator

Welcome to MCP Accelerator! This guide will help you create your first MCP server in minutes.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **TypeScript** 5.3+
- **npm** or **yarn**

### Installation

```bash
# Install the core package
npm install @mcp-accelerator/core

# Or install specific packages
npm install @mcp-accelerator/transport-http
npm install @mcp-accelerator/middleware-auth
```

### Your First MCP Server

Create a new file `my-server.ts`:

```typescript
import { MCPServer, ToolDefinition } from '@mcp-accelerator/core';
import { HTTPTransport } from '@mcp-accelerator/transport-http';

// Define a simple tool
const echoTool: ToolDefinition = {
  name: 'echo',
  description: 'Echo back the input message',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Message to echo back'
      }
    },
    required: ['message']
  }
};

// Create and configure the server
const server = new MCPServer({
  name: 'My First MCP Server',
  version: '1.0.0'
});

// Register the tool
server.addTool(echoTool, async (input) => {
  return {
    content: [
      {
        type: 'text',
        text: `Echo: ${input.message}`
      }
    ]
  };
});

// Start the server with HTTP transport
const transport = new HTTPTransport({
  port: 3000,
  host: 'localhost'
});

server.start(transport);
console.log('🚀 Server running on http://localhost:3000');
```

### Run Your Server

```bash
# Compile TypeScript
npx tsc my-server.ts

# Run the server
node my-server.js
```

### Test Your Server

```bash
# Test with curl
curl -X POST http://localhost:3000/tools/echo \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello MCP!"}'
```

Expected response:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Echo: Hello MCP!"
    }
  ]
}
```

## ⚙️ Scaffold With The CLI

The `mcp-accelerator` CLI streamlines boilerplate generation:

```bash
# Inside your project root
npx mcp-accelerator generate tool echo-tool --description "Echo tool"
npx mcp-accelerator generate resource filesystem
npx mcp-accelerator generate prompt onboarding --skip-test

# Generate tests later when you expand coverage
npx mcp-accelerator generate test tool echo-tool

# Audit the project for MCP best practices
npx mcp-accelerator doctor
```

Use `--project <path>` to scaffold or validate directories outside the current working directory, and `--force` when you intentionally overwrite existing files.

## 🎯 Key Concepts

### 1. **MCPServer**
The main server class that manages tools, middleware, and lifecycle.

### 2. **Tools**
Functions that can be called by MCP clients. Each tool has:
- `name`: Unique identifier
- `description`: Human-readable description
- `inputSchema`: JSON Schema for input validation
- `handler`: Async function that processes the input

### 3. **Transports**
How your server communicates:
- **HTTP**: REST API over HTTP
- **WebSocket**: Real-time bidirectional communication
- **SSE**: Server-sent events for streaming
- **STDIO**: Standard input/output for CLI tools

### 4. **Middleware**
Plugins that add functionality:
- **Authentication**: API keys, JWT tokens
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Observability**: Logging, metrics, tracing

## 📚 Next Steps

Now that you have a basic server running, explore:

1. **[Core Concepts](./core-concepts.md)** - Deep dive into the architecture
2. **[Transport Layer](./transports.md)** - Choose the right transport for your use case
3. **[Middleware System](./middleware.md)** - Add authentication, rate limiting, and more
4. **[Examples](../examples/)** - See real-world implementations

## 🆘 Need Help?

- Check the [API Reference](../api/core.md) for detailed documentation
- Browse [examples](../examples/) for inspiration
- Join [GitHub Discussions](https://github.com/mjfphp/mcrapid/discussions) for community support
- Report issues on [GitHub Issues](https://github.com/mjfphp/mcrapid/issues)

---

*Ready to build something amazing? Let's move to [Core Concepts](./core-concepts.md)!* 🚀
