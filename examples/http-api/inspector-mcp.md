# 🔍 Testing with MCP Inspector

This guide explains how to test your MCP HTTP API server with [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector), the official MCP debugging tool.

## 🚀 Quick Start

### Option 1: Using MCP Inspector
```bash
# Start the server first
node index.ts

# In another terminal, run MCP Inspector
npx @modelcontextprotocol/inspector node index.ts
```

### Option 2: Manual testing
```bash
# Terminal 1: Start the server
node index.ts

# Terminal 2: Test health
curl http://127.0.0.1:3000/health
```

## 🔍 MCP Inspector Configuration

### 1. Install MCP Inspector
```bash
npx @modelcontextprotocol/inspector --help
```

### 2. Run with your server
```bash
# For HTTP transport (recommended for testing)
npx @modelcontextprotocol/inspector node index.ts

# Or inspect an already running server
npx @modelcontextprotocol/inspector http://127.0.0.1:3000/mcp
```

### 3. Test the tools

#### 🔤 text-stats
```json
{
  "text": "Hello world! This is a test sentence."
}
```

#### 📄 validate-json
```json
{
  "json": "{\"name\": \"John\", \"age\": 30}",
  "prettify": true
}
```

#### 🔢 array-operations
```json
{
  "numbers": [1, 5, 3, 9, 2],
  "operation": "sum"
}
```

## 🛠️ Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `text-stats` | Analyze text statistics | `text` (string) |
| `validate-json` | Validate and format JSON | `json` (string), `prettify` (boolean) |
| `array-operations` | Operations on arrays | `numbers` (array), `operation` (enum) |

## 🧪 Testing with curl

### List tools
```bash
curl http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "request",
    "id": "list",
    "method": "tools/list"
  }'
```

### Test text-stats
```bash
curl http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "request",
    "id": "test",
    "method": "tools/call",
    "params": {
      "name": "text-stats",
      "arguments": {
        "text": "Hello world!"
      }
    }
  }'
```

## 📋 MCP Inspector Features

The MCP Inspector provides comprehensive testing capabilities:

### 🔧 Server Connection Pane
- Select transport for connecting to the server
- Customize command-line arguments and environment
- Support for both local and remote servers

### 📁 Resources Tab
- Lists all available resources
- Shows resource metadata (MIME types, descriptions)
- Allows resource content inspection
- Supports subscription testing

### 💬 Prompts Tab
- Displays available prompt templates
- Shows prompt arguments and descriptions
- Enables prompt testing with custom arguments
- Previews generated messages

### 🛠️ Tools Tab
- Lists available tools
- Shows tool schemas and descriptions
- Enables tool testing with custom inputs
- Displays tool execution results

### 📢 Notifications Pane
- Presents all logs recorded from the server
- Shows notifications received from the server

## 🔧 Troubleshooting

### Server won't start
- Check that port 3000 is free
- Make sure Node.js is installed

### MCP Inspector can't connect
- Verify the server is running
- Test with curl first
- Check the server logs for errors
- Ensure the server supports the MCP protocol

### Development workflow
1. **Start Development**
   - Launch Inspector with your server
   - Verify basic connectivity
   - Check capability negotiation

2. **Iterative testing**
   - Make server changes
   - Rebuild the server
   - Reconnect the Inspector
   - Test affected features
   - Monitor messages

3. **Test edge cases**
   - Invalid inputs
   - Missing prompt arguments
   - Concurrent operations
   - Verify error handling and error responses

## 📚 Resources

- [MCP Inspector Documentation](https://modelcontextprotocol.io/docs/tools/inspector)
- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP Accelerator](https://github.com/mjamai/MCraPid)
