/**
 * Basic STDIO example - Simple echo server
 * 
 * Installation:
 *   npm install @mcp-accelerator/core @mcp-accelerator/transport-stdio zod
 */

import { MCPServer, z } from '@mcp-accelerator/core';
import { StdioTransport } from '@mcp-accelerator/transport-stdio';

async function main() {
  // Create server
  const server = new MCPServer({
    name: 'basic-stdio-server',
    version: '1.0.0',
  });

  // Set STDIO transport
  server.setTransport(new StdioTransport());

  // Register a simple echo tool
  server.registerTool({
    name: 'echo',
    description: 'Echo back the input message',
    inputSchema: z.object({
      message: z.string().describe('Message to echo back'),
    }),
    handler: async (input, context) => {
      context.logger.info('Echo tool called', { message: input.message });
      return {
        original: input.message,
        echoed: input.message,
        timestamp: new Date().toISOString(),
      };
    },
  });

  // Start the server
  await server.start();
  
  console.error('STDIO server is running. Send messages via stdin.');
}

main().catch(console.error);
