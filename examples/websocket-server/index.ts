/**
 * WebSocket example - Real-time calculator server
 * 
 * Installation:
 *   npm install @mcp-accelerator/core @mcp-accelerator/transport-websocket zod
 */

import { MCPServer, z } from '@mcp-accelerator/core';
import { WebSocketTransport } from '@mcp-accelerator/transport-websocket';

async function main() {
  // Create server
  const server = new MCPServer({
    name: 'websocket-calculator',
    version: '1.0.0',
  });

  // Set WebSocket transport
  server.setTransport(new WebSocketTransport({
    host: '127.0.0.1',
    port: 3001,
  }));

  // Register mathematical operation tools
  server.registerTool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
    handler: async (input) => {
      return {
        operation: 'addition',
        result: input.a + input.b,
      };
    },
  });

  server.registerTool({
    name: 'multiply',
    description: 'Multiply two numbers',
    inputSchema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
    handler: async (input) => {
      return {
        operation: 'multiplication',
        result: input.a * input.b,
      };
    },
  });

  server.registerTool({
    name: 'power',
    description: 'Calculate power (a^b)',
    inputSchema: z.object({
      base: z.number().describe('Base number'),
      exponent: z.number().describe('Exponent'),
    }),
    handler: async (input) => {
      return {
        operation: 'power',
        result: Math.pow(input.base, input.exponent),
      };
    },
  });

  // Broadcast tool
  server.registerTool({
    name: 'broadcast',
    description: 'Broadcast a message to all connected clients',
    inputSchema: z.object({
      message: z.string().describe('Message to broadcast'),
    }),
    handler: async (input) => {
      const transport = server.getTransport();
      if (transport) {
        await transport.broadcast({
          type: 'event',
          method: 'notification',
          params: { message: input.message },
        });
      }
      return { broadcasted: true, message: input.message };
    },
  });

  // Start the server
  await server.start();
  
  console.log('WebSocket calculator server is running on ws://127.0.0.1:3001');
  console.log('Available tools: add, multiply, power, broadcast');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
