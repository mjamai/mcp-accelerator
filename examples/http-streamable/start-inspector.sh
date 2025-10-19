#!/bin/bash

# HTTP Streamable Example - MCP Inspector Auto-Start Script
# This script automatically starts the MCP server with MCP Inspector

set -e  # Exit on any error

echo "🚀 Starting HTTP Streamable MCP Server with Inspector..."

# Check if we're in the right directory
if [ ! -f "index.ts" ]; then
    echo "❌ Error: index.ts not found. Please run this script from the http-streamable directory."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed or not in PATH"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
killall node 2>/dev/null || true
lsof -ti:6274,6277,3100 | xargs kill -9 2>/dev/null || true

# Wait a moment for ports to be released
sleep 2

# Check if ports are free
if lsof -i:6274,6277,3100 &> /dev/null; then
    echo "⚠️  Warning: Some ports are still in use. This might cause issues."
fi

echo "🔧 Starting MCP Inspector with HTTP Streamable server..."
echo "📋 Server will be available at: http://localhost:6274"
echo "🛠️  Proxy server will run on: http://localhost:6277"
echo "🌐 Streamable HTTP server will run on: http://127.0.0.1:3100/mcp/stream"
echo "Press Ctrl+C to stop the server"

# Start MCP Inspector with the server
npx @modelcontextprotocol/inspector node index.ts
