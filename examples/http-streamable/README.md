# HTTP Streamable Example

This example demonstrates an MCP (Model Context Protocol) server using Streamable HTTP transport. It's designed for real-time streaming communication over HTTP connections.

## Features

- **Streamable HTTP Transport**: Uses HTTP with streaming capabilities for real-time communication
- **Echo Tool**: Simple demonstration tool for testing streaming functionality
- **MCP Inspector Compatible**: Works seamlessly with MCP Inspector for testing
- **Real-time Communication**: Supports streaming responses and real-time updates

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Server

```bash
# Direct execution
node index.ts

# Or with TypeScript compilation
npx tsc && node dist-temp/index.js
```

### 3. Test with MCP Inspector

```bash
# Launch MCP Inspector with the server
npx @modelcontextprotocol/inspector node index.ts
```

Then open http://localhost:6274 in your browser.

## Available Tools

The server provides the following tools:

- **echo**: Echo back the input text with streaming support

## Testing

### Method 1: MCP Inspector (Recommended)

MCP Inspector is the official interactive developer tool for testing and debugging MCP servers. It provides a web-based interface to interact with your MCP server.

#### Quick Start with MCP Inspector

```bash
# Method 1: Direct launch with MCP Inspector
npx @modelcontextprotocol/inspector node index.ts

# Method 2: Using the auto-start script
./start-inspector.sh

# Method 3: Using npm scripts
npm run inspector
npm run mcp-inspector
npm run auto-start
```

#### MCP Inspector Interface

Once launched, MCP Inspector will:

1. **Automatically start your MCP server** in the background
2. **Open your browser** to http://localhost:6274
3. **Connect to the server** automatically - no manual configuration needed!

#### Available Features in MCP Inspector

- **Tools Tab**: Test all available tools (echo with streaming)
- **Resources Tab**: View server resources
- **Prompts Tab**: Test server prompts
- **Logs Tab**: Monitor server logs and communication
- **Settings Tab**: Configure connection settings

#### Testing Your Tools

1. **Open MCP Inspector** at http://localhost:6274
2. **Go to the "Tools" tab**
3. **Select the "echo" tool**
4. **Fill in the parameters**:
   - For `echo`: `{"text": "Hello World"}`
5. **Click "Execute"** to run the tool
6. **View the streaming results** in the response panel

#### Troubleshooting MCP Inspector

If MCP Inspector doesn't work:

1. **Check if ports are free**:
   ```bash
   lsof -i:6274,6277,3100
   ```

2. **Kill existing processes**:
   ```bash
   killall node
   lsof -ti:6274,6277,3100 | xargs kill -9
   ```

3. **Restart MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector node index.ts
   ```

### Method 2: Manual Testing

You can test the server manually by sending HTTP requests to the streaming endpoint:

```bash
# Test the streaming endpoint
curl -X POST http://127.0.0.1:3100/mcp/stream \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
```

### Method 3: Using the Auto-Start Script

```bash
# Make the script executable
chmod +x start-inspector.sh

# Run the auto-start script
./start-inspector.sh
```

## Configuration

The server uses the following default configuration:

- **Transport**: Streamable HTTP
- **Host**: 127.0.0.1
- **Port**: 3100
- **Endpoint**: /mcp/stream
- **Protocol Version**: 2024-11-05
- **Server Name**: "streamable-http-demo"
- **Server Version**: "1.0.0"

## Development

### Project Structure

```
http-streamable/
├── index.ts              # Main server file
├── package.json          # Dependencies and scripts
├── README.md             # This file
├── start-inspector.sh    # Auto-start script
└── dist-temp/            # Compiled JavaScript (generated)
```

### Adding New Tools

To add a new tool, register it in the server:

```typescript
server.registerTool({
  name: 'my_tool',
  description: 'Description of my tool',
  inputSchema: z.object({
    input: z.string().describe('Input parameter')
  }),
  handler: async (args, context) => {
    // Your tool logic here
    return { content: 'Tool executed successfully' };
  }
});
```

### Compiling TypeScript

```bash
# Compile TypeScript to JavaScript
npx tsc index.ts --outDir dist-temp --target es2020 --module commonjs --esModuleInterop --skipLibCheck
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Make sure to run `npm install` first
2. **TypeScript compilation errors**: Check that all dependencies are installed
3. **MCP Inspector connection issues**: Ensure no other processes are using ports 6274/6277/3100
4. **Streaming connection issues**: Check that the server is running on port 3100

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=mcp* npx @modelcontextprotocol/inspector node index.ts
```

### Port Conflicts

If you encounter port conflicts:

```bash
# Kill existing processes
killall node
lsof -ti:6274,6277,3100 | xargs kill -9
```

## Integration with Claude Desktop

To use this server with Claude Desktop, add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "http-streamable": {
      "command": "node",
      "args": ["/path/to/examples/http-streamable/index.ts"],
      "env": {}
    }
  }
}
```

## Next Steps

- Explore the `basic-stdio` example for STDIO transport
- Check the `http-api` example for standard HTTP transport
- Review the `production-ready` example for deployment considerations

## Support

For issues and questions:
- Check the main project documentation
- Review the MCP specification
- Test with MCP Inspector for debugging