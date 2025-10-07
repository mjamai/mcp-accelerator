/**
 * HTTP example - RESTful API server with data processing tools
 * 
 * Installation:
 *   npm install @mcp-accelerator/core @mcp-accelerator/transport-http zod
 */

import { MCPServer, z, LoggingPlugin, MetricsPlugin } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';

async function main() {
  // Create server
  const server = new MCPServer({
    name: 'http-api-server',
    version: '1.0.0',
    plugins: [
      new LoggingPlugin(),
      new MetricsPlugin(),
    ],
  });

  // Set HTTP transport
  server.setTransport(new HttpTransport({
    host: '127.0.0.1',
    port: 3000,
  }));

  // Text processing tool
  server.registerTool({
    name: 'text-stats',
    description: 'Get statistics about a text',
    inputSchema: z.object({
      text: z.string().describe('Text to analyze'),
    }),
    handler: async (input) => {
      const words = input.text.split(/\s+/).filter(w => w.length > 0);
      const characters = input.text.length;
      const lines = input.text.split('\n').length;
      
      return {
        words: words.length,
        characters,
        lines,
        averageWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length || 0,
      };
    },
  });

  // JSON validation tool
  server.registerTool({
    name: 'validate-json',
    description: 'Validate and format JSON',
    inputSchema: z.object({
      json: z.string().describe('JSON string to validate'),
      prettify: z.boolean().optional().describe('Whether to prettify output'),
    }),
    handler: async (input) => {
      try {
        const parsed = JSON.parse(input.json);
        return {
          valid: true,
          formatted: input.prettify ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed),
        };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid JSON',
        };
      }
    },
  });

  // Array operations tool
  server.registerTool({
    name: 'array-operations',
    description: 'Perform operations on arrays',
    inputSchema: z.object({
      numbers: z.array(z.number()).describe('Array of numbers'),
      operation: z.enum(['sum', 'average', 'min', 'max', 'sort']).describe('Operation to perform'),
    }),
    handler: async (input) => {
      const { numbers, operation } = input;
      
      let result: number | number[];
      
      switch (operation) {
        case 'sum':
          result = numbers.reduce((a, b) => a + b, 0);
          break;
        case 'average':
          result = numbers.reduce((a, b) => a + b, 0) / numbers.length;
          break;
        case 'min':
          result = Math.min(...numbers);
          break;
        case 'max':
          result = Math.max(...numbers);
          break;
        case 'sort':
          result = [...numbers].sort((a, b) => a - b);
          break;
      }
      
      return {
        operation,
        input: numbers,
        result,
      };
    },
  });

  // Start the server
  await server.start();
  
  console.log('HTTP API server is running on http://127.0.0.1:3000');
  console.log('Health check: http://127.0.0.1:3000/health');
  console.log('Endpoint: POST http://127.0.0.1:3000/mcp');
  console.log('\nAvailable tools:');
  console.log('  - text-stats: Analyze text statistics');
  console.log('  - validate-json: Validate and format JSON');
  console.log('  - array-operations: Perform operations on number arrays');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
