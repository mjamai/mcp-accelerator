import { MCPServer, z } from '@mcp-accelerator/core';
import { StreamableHttpTransport } from '@mcp-accelerator/transport-http';

async function main() {
  const server = new MCPServer({
    name: 'streamable-http-demo',
    version: '1.0.0',
  });

  await server.setTransport(
    new StreamableHttpTransport({
      host: '127.0.0.1',
      port: 3100,
    }),
  );

  server.registerTool({
    name: 'echo',
    description: 'Echo input text',
    inputSchema: z.object({
      text: z.string(),
    }),
    handler: async (input, context) => {
      context.logger.info('Executing echo tool', { input });
      return {
        content: [
          {
            type: 'text',
            text: input.text,
          },
        ],
      };
    },
  });

  await server.start();

  console.log('Streamable HTTP MCP server running on http://127.0.0.1:3100/mcp/stream');
  console.log('Available tool: echo');
  console.log('Use MCP Inspector or the integration script to test the stream.');

  process.on('SIGINT', async () => {
    console.log('\nStopping server...');
    await server.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start streamable HTTP example', error);
  process.exit(1);
});
