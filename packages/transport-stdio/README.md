# @mcp-accelerator/transport-stdio

STDIO transport for MCP Accelerator framework with full MCP specification compliance.

## Installation

```bash
npm install @mcp-accelerator/transport-stdio
```

## Usage

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import { StdioTransport } from '@mcp-accelerator/transport-stdio';

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
});

server.setTransport(new StdioTransport());
await server.start();
```

## Features

- ✅ **MCP STDIO Specification Compliant** - Fully implements [MCP STDIO transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio)
- ✅ **JSON-RPC 2.0 Support** - Proper error handling with standard error codes
- ✅ **Message Validation** - Prevents embedded newlines as required by MCP spec
- ✅ **Proper Stream Usage** - stdout for messages, stderr for logging
- ✅ **No External Dependencies** - Uses only Node.js built-ins
- ✅ **Lightweight and Fast** - Minimal overhead
- ✅ **Full TypeScript Support** - Complete type safety

## MCP Compliance

This transport is fully compliant with the MCP STDIO specification:

- ✅ Messages are JSON-RPC encoded and UTF-8
- ✅ Messages are delimited by newlines without embedded newlines
- ✅ Server reads from stdin and writes to stdout
- ✅ Logging uses stderr as specified
- ✅ Proper JSON-RPC error responses for parse errors

See [MCP_COMPLIANCE.md](./MCP_COMPLIANCE.md) for detailed compliance information.

## Testing

```bash
npm test
```

Includes comprehensive MCP compliance tests.

## License

MIT
