import { ServerConfig, MCPServerInterface, TransportConfig } from './types';
import { MCPServer } from './core/server';
import {
  StdioTransport,
  HttpTransport,
  WebSocketTransport,
  SSETransport,
} from './transports';

/**
 * Create and configure an MCP server instance
 */
export function createServer(config: ServerConfig): MCPServerInterface {
  const server = new MCPServer(config);

  // Setup transport if specified
  if (config.transport) {
    const transport = createTransport(config.transport);
    server.setTransport(transport);
  }

  return server;
}

/**
 * Create a transport based on configuration
 */
export function createTransport(config: TransportConfig) {
  switch (config.type) {
    case 'stdio':
      return new StdioTransport();
    
    case 'http':
      return new HttpTransport({
        host: config.host,
        port: config.port,
      });
    
    case 'websocket':
      return new WebSocketTransport({
        host: config.host,
        port: config.port,
      });
    
    case 'sse':
      return new SSETransport({
        host: config.host,
        port: config.port,
      });
    
    default:
      throw new Error(`Unknown transport type: ${(config as any).type}`);
  }
}

