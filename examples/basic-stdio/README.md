# Basic STDIO Example

This example demonstrates a simple MCP (Model Context Protocol) server using STDIO transport. It's the most straightforward way to create an MCP server that communicates via standard input/output.

## Features

- **STDIO Transport**: Uses standard input/output for communication
- **Basic Tools**: Includes simple utility tools for demonstration
- **No Dependencies**: Minimal setup with no external dependencies
- **MCP Inspector Compatible**: Works seamlessly with MCP Inspector for testing

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

- **echo**: Echo back the input text
- **get_time**: Get current timestamp
- **calculate**: Perform basic arithmetic operations
- **reverse**: Reverse a string
- **uppercase**: Convert text to uppercase
- **lowercase**: Convert text to lowercase

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

- **Tools Tab**: Test all available tools (echo, get_time, calculate, reverse, uppercase, lowercase)
- **Resources Tab**: View server resources
- **Prompts Tab**: Test server prompts
- **Logs Tab**: Monitor server logs and communication
- **Settings Tab**: Configure connection settings

#### Testing Your Tools

1. **Open MCP Inspector** at http://localhost:6274
2. **Go to the "Tools" tab**
3. **Select a tool** (e.g., "echo")
4. **Fill in the parameters**:
   - For `echo`: `{"text": "Hello World"}`
   - For `get_time`: `{}`
   - For `calculate`: `{"operation": "add", "a": 5, "b": 3}`
   - For `reverse`: `{"text": "Hello World"}`
   - For `uppercase`: `{"text": "hello world"}`
   - For `lowercase`: `{"text": "HELLO WORLD"}`
5. **Click "Execute"** to run the tool
6. **View the results** in the response panel

#### Troubleshooting MCP Inspector

If MCP Inspector doesn't work:

1. **Check if ports are free**:
   ```bash
   lsof -i:6274,6277
   ```

2. **Kill existing processes**:
   ```bash
   killall node
   lsof -ti:6274,6277 | xargs kill -9
   ```

3. **Restart MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector node index.ts
   ```

### Method 2: Manual Testing

You can test the server manually by sending JSON-RPC messages via stdin:

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node index.ts
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

- **Transport**: STDIO (standard input/output)
- **Protocol Version**: 2024-11-05
- **Server Name**: "Basic STDIO Server"
- **Server Version**: "1.0.0"

## Development

### Project Structure

```
basic-stdio/
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
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input parameter' }
    },
    required: ['input']
  },
  handler: async (args) => {
    // Your tool logic here
    return { result: 'Tool executed successfully' };
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
3. **MCP Inspector connection issues**: Ensure no other processes are using ports 6274/6277

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
lsof -ti:6274,6277 | xargs kill -9
```

## Integration with Claude Desktop

To use this server with Claude Desktop, add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "basic-stdio": {
      "command": "node",
      "args": ["/path/to/examples/basic-stdio/index.ts"],
      "env": {}
    }
  }
}
```

## Next Steps

- Explore the `http-api` example for HTTP transport
- Check the `custom-plugin` example for advanced features
- Review the `production-ready` example for deployment considerations

## Support

For issues and questions:
- Check the main project documentation
- Review the MCP specification
- Test with MCP Inspector for debugging