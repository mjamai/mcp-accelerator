#!/bin/bash

# Script to start MCP HTTP API server and test with MCP Inspector

echo "🔍 Starting MCP HTTP API server with MCP Inspector..."

# Check if MCP Inspector is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not installed. Please install Node.js first."
    exit 1
fi

# Check if MCP Inspector package exists
echo "📦 Checking MCP Inspector availability..."
if ! npx @modelcontextprotocol/inspector --help &> /dev/null; then
    echo "📥 Installing MCP Inspector..."
    npx @modelcontextprotocol/inspector --help
fi

echo "🚀 Starting MCP HTTP API server..."

# Start the server in background
node index.ts &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Check if server is running
if curl -s http://127.0.0.1:3000/health > /dev/null; then
    echo "✅ Server started successfully!"
    echo ""
    echo "📋 Server Information:"
    echo "   - URL: http://127.0.0.1:3000"
    echo "   - Health: http://127.0.0.1:3000/health"
    echo "   - MCP Endpoint: http://127.0.0.1:3000/mcp"
    echo ""
    echo "🔍 Available tools:"
    curl -s http://127.0.0.1:3000/mcp \
      -H 'Content-Type: application/json' \
      -d '{"type":"request","id":"test","method":"tools/list"}' | jq '.result.tools[].name' 2>/dev/null || echo "   - text-stats"
    echo "   - validate-json"
    echo "   - array-operations"
    echo ""
    echo "🔍 To test with MCP Inspector:"
    echo "   1. Run: npx @modelcontextprotocol/inspector node index.ts"
    echo "   2. Or inspect running server: npx @modelcontextprotocol/inspector http://127.0.0.1:3000/mcp"
    echo ""
    echo "🛑 To stop the server: Ctrl+C"
    
    # Wait for interruption
    trap "echo '🛑 Stopping server...'; kill $SERVER_PID; exit 0" INT
    wait $SERVER_PID
else
    echo "❌ Error: Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
