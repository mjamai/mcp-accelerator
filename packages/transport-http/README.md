# @mcp-accelerator/transport-http

HTTP transport for MCP Accelerator. Fast HTTP/REST server based on Fastify.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/transport-http zod
```

## Usage

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';

const server = new MCPServer({
  name: 'my-http-server',
  version: '1.0.0',
});

// Use HTTP transport
server.setTransport(new HttpTransport({
  host: '0.0.0.0',
  port: 3000,
}));

server.registerTool({
  name: 'getData',
  description: 'Get some data',
  inputSchema: z.object({
    id: z.string(),
  }),
  handler: async (input) => {
    return { data: `Data for ${input.id}` };
  },
});

await server.start();
```

## Configuration

```typescript
new HttpTransport({
  host: '127.0.0.1', // Listen address (default: '127.0.0.1')
  port: 3000,        // Listen port (default: 3000)
})
```

## Endpoints

- `POST /mcp` - Send MCP messages
- `GET /health` - Health check

## Features

- ✅ Based on Fastify (high performance)
- ✅ Standard REST support
- ✅ Built-in health check
- ⚠️ No broadcast (stateless transport)

## License

MIT
