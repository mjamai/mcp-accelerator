# @mcp-accelerator/core

Core package for the MCP Accelerator framework. Contains the base functionality for creating MCP servers.

## Installation

```bash
npm install @mcp-accelerator/core zod
```

## Usage

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

## Contents

- **Core Server**: Main MCP server
- **Types**: TypeScript interfaces and types
- **Tool Manager**: Tool management system
- **Error Handler**: Error handling
- **Logger**: Logging system
- **Plugins**: Plugin system
- **Base Transport**: Base class for transports

## Available Transports

Transports are in separate packages:

- `@mcp-accelerator/transport-stdio` - Stdin/stdout communication
- `@mcp-accelerator/transport-http` - HTTP server
- `@mcp-accelerator/transport-websocket` - WebSocket server
- `@mcp-accelerator/transport-sse` - Server-Sent Events

## License

MIT
