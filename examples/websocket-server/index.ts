/**
 * WebSocket example - Real-time calculator server
 */

import { createServer, z } from '../../src';

async function main() {
  // Create server with WebSocket transport
  const server = createServer({
    name: 'websocket-calculator',
    version: '1.0.0',
    transport: {
      type: 'websocket',
      port: 3001,
      host: '127.0.0.1',
    },
  });

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

  // Start the server
  await server.start();
  
  console.log('WebSocket calculator server is running on ws://127.0.0.1:3001');
  console.log('Available tools: add, multiply, power');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);

