#!/usr/bin/env bash

set -euo pipefail

if ! command -v openssl >/dev/null; then
  echo "openssl not found" >&2
  exit 1
fi

TOKEN=$(openssl rand -hex 32)
export MCP_PROXY_AUTH_TOKEN="$TOKEN"

HOST=${MCP_EXAMPLE_HOST:-127.0.0.1}
PORT=${MCP_EXAMPLE_PORT:-3200}

echo "MCP Inspector token: $MCP_PROXY_AUTH_TOKEN"
open "http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=$MCP_PROXY_AUTH_TOKEN&events=http://${HOST}:${PORT}/mcp/events&messages=http://${HOST}:${PORT}/mcp/message"
