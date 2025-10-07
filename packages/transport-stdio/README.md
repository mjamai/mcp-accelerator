# @mcp-accelerator/transport-stdio

STDIO transport for MCP Accelerator. Communication via stdin/stdout for command-line applications.

## Installation

```bash
npm install @mcp-accelerator/core @mcp-accelerator/transport-stdio zod
```

## Usage

```typescript
import { MCPServer, z } from '@mcp-accelerator/core';
import { StdioTransport } from '@mcp-accelerator/transport-stdio';

const server = new MCPServer({
  name: 'my-cli-server',
  version: '1.0.0',
});

// Use STDIO transport
server.setTransport(new StdioTransport());

server.registerTool({
  name: 'echo',
  description: 'Echo a message',
  inputSchema: z.object({
    message: z.string(),
  }),
  handler: async (input) => {
    return { echo: input.message };
  },
});

await server.start();
```

## Features

- ✅ No external dependencies (Node.js native)
- ✅ Perfect for CLI and processes
- ✅ Bidirectional communication via pipes
- ✅ Compatible with UNIX workflows

## License

MIT
