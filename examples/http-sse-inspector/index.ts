import { MCPServer, z, SilentLogger } from '@mcp-accelerator/core';
import { SSETransport } from '@mcp-accelerator/transport-sse';

const host = process.env.MCP_EXAMPLE_HOST ?? '127.0.0.1';
const port = Number(process.env.MCP_EXAMPLE_PORT ?? '3200');

async function main(): Promise<void> {
  const server = new MCPServer({
    name: 'sse-http-demo',
    version: '1.0.0',
    logger: new SilentLogger(),
  });

  await server.setTransport(
    new SSETransport({
      host,
      port,
    }),
  );

  server.registerTool({
    name: 'echo',
    description: 'Echo input text',
    inputSchema: z.object({
      text: z.string(),
    }),
    handler: async (input) => ({
      content: [
        {
          type: 'text',
          text: input.text,
        },
      ],
    }),
  });

  await server.start();

  process.stderr.write('SSE HTTP MCP server running:\n');
  process.stderr.write(`- Events stream:  http://${host}:${port}/mcp/events\n`);
  process.stderr.write(`- Message POST:   http://${host}:${port}/mcp/message\n`);
  process.stderr.write(`- Health check:   http://${host}:${port}/health\n`);
  process.stderr.write('Environment overrides: MCP_EXAMPLE_HOST, MCP_EXAMPLE_PORT\n');

  process.on('SIGINT', async () => {
    console.log('\nStopping server...');
    await server.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start SSE example', error);
  process.exit(1);
});
