#!/bin/bash

# Basic STDIO Example - MCP Inspector Auto-Start Script
# This script automatically starts the MCP server with MCP Inspector

set -e  # Exit on any error

echo "🚀 Starting Basic STDIO MCP Server with Inspector..."

# Check if we're in the right directory
if [ ! -f "index.ts" ]; then
    echo "❌ Error: index.ts not found. Please run this script from the basic-stdio directory."
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

# Kill any existing processes on the required ports
echo "🧹 Cleaning up existing processes..."
killall node 2>/dev/null || true
lsof -ti:6274,6277 | xargs kill -9 2>/dev/null || true

# Wait a moment for ports to be released
sleep 2

# Check if MCP Inspector is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is not available"
    exit 1
fi

echo "🔧 Starting MCP Inspector with Basic STDIO server..."
echo "📋 Server will be available at: http://localhost:6274"
echo "🛠️  Proxy server will run on: http://localhost:6277"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start MCP Inspector with the basic-stdio server
npx @modelcontextprotocol/inspector node index.ts
