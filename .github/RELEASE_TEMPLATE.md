# 🎉 MCP Accelerator v1.0.0

> A modern, modular framework for building Model Context Protocol servers in TypeScript

We're excited to announce the first stable release of **MCP Accelerator**! 🚀

## 🌟 Highlights

MCP Accelerator brings a **modular architecture** to MCP server development, allowing you to install only what you need:

- **90% smaller bundle** for CLI applications (STDIO only)
- **Independent transport packages** - Mix and match as needed
- **Type-safe everything** - Full TypeScript support with Zod validation
- **Production-ready** - Battle-tested and optimized

## 📦 What's Included

### Core Package
- `@mcp-accelerator/core` - Lightweight core (~500 KB)
  - Server management
  - Tool registration with Zod schemas
  - Plugin system
  - Lifecycle hooks
  - Middleware support

### Transport Packages
- `@mcp-accelerator/transport-stdio` - No external dependencies
- `@mcp-accelerator/transport-http` - Fastify-based HTTP server
- `@mcp-accelerator/transport-websocket` - Real-time WebSocket support
- `@mcp-accelerator/transport-sse` - Server-Sent Events streaming

## 🚀 Quick Start

```bash
# Install core + your transport of choice
npm install @mcp-accelerator/core @mcp-accelerator/transport-stdio zod
```

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { StdioTransport } from '@mcp-accelerator/transport-stdio';

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
});

server.setTransport(new StdioTransport());

server.registerTool({
  name: 'greet',
  description: 'Greet a user',
  inputSchema: z.object({
    name: z.string(),
  }),
  handler: async (input) => {
    return { message: `Hello, ${input.name}!` };
  },
});

await server.start();
```

## ✨ Key Features

### 🎯 Modular Architecture
Install only the transports you need. STDIO-only applications are ~500 KB vs ~5 MB!

### 🛠️ Type-Safe Tools
Full TypeScript support with Zod schema validation ensures type safety from input to output.

### 🧩 Extensible Plugin System
Create and share plugins to extend functionality across projects.

### 🪝 Lifecycle Hooks
React to server events with type-safe hooks using the `HookPhase` enum.

### ⚡ High Performance
Optimized for speed with:
- Efficient tree-shaking
- Minimal dependencies
- Lazy loading support

## 📊 Bundle Size Comparison

| Use Case | Before (Monolithic) | After (Modular) | Savings |
|----------|---------------------|-----------------|---------|
| CLI (STDIO) | ~5 MB | ~500 KB | **90%** |
| HTTP API | ~5 MB | ~2.5 MB | **50%** |
| WebSocket | ~5 MB | ~1.5 MB | **70%** |

## 📚 Documentation

- [Main README](https://github.com/mohamedjamai/mcp-accelerator#readme)
- [Core Package](https://github.com/mohamedjamai/mcp-accelerator/tree/main/packages/core)
- [Examples](https://github.com/mohamedjamai/mcp-accelerator/tree/main/examples)
- [Contributing Guide](https://github.com/mohamedjamai/mcp-accelerator/blob/main/CONTRIBUTING.md)

## 🎓 Examples

Check out the [examples folder](https://github.com/mohamedjamai/mcp-accelerator/tree/main/examples) for:
- Basic STDIO server
- HTTP API with multiple tools
- WebSocket real-time server
- Custom plugin creation

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature request? [Open an issue](https://github.com/mohamedjamai/mcp-accelerator/issues/new)!

## 🤝 Contributing

Contributions are welcome! See our [Contributing Guide](https://github.com/mohamedjamai/mcp-accelerator/blob/main/CONTRIBUTING.md).

## 📄 License

MIT © Mohamed JAMAI

## 🙏 Acknowledgments

Special thanks to:
- The Model Context Protocol team
- All contributors and early adopters
- The TypeScript and Node.js communities

---

**Ready to build amazing MCP servers?** Get started now:

```bash
npm install @mcp-accelerator/core zod
```

**Full Changelog**: https://github.com/mohamedjamai/mcp-accelerator/blob/main/CHANGELOG.md
