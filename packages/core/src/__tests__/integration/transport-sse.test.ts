import { MCPServer } from '../../core/server';
import { SSETransport } from '../../../../transport-sse/src/sse-transport';
import { z } from 'zod';

describe('SSE Transport', () => {
  let server: MCPServer;
  let transport: SSETransport;
  let baseUrl: string;
  let skipSuite = false;

  beforeEach(async () => {
    skipSuite = false;
    server = new MCPServer({
      name: 'sse-integration',
      version: '1.0.0',
    });

    server.registerTool({
      name: 'echo',
      description: 'Echo input back',
      inputSchema: z.object({ message: z.string() }),
      handler: async (input) => ({ echo: input.message }),
    });

    transport = new SSETransport({
      port: 0,
      authToken: 'secret',
      maxRequestsPerMinute: 5,
    });

    try {
      await server.setTransport(transport);
      await server.start();

      const address = (transport as unknown as { fastify?: { server: { address: () => any } } }).fastify?.server.address();
      if (!address || typeof address.port !== 'number') {
        throw new Error('SSE transport address unavailable');
      }
      const host = address.address && address.address !== '::' ? address.address : '127.0.0.1';
      baseUrl = `http://${host}:${address.port}`;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EPERM') {
        skipSuite = true;
        console.warn('Skipping SSE transport test due to restricted environment');
        await server.stop().catch(() => undefined);
      } else {
        throw error;
      }
    }
  });

  afterEach(async () => {
    await server.stop();
  });

  it('delivers events and supports tools/call via SSE endpoints', async () => {
    if (skipSuite) {
      return;
    }
    const eventResponse = await fetch(`${baseUrl}/mcp/events`, {
      headers: { Authorization: 'Bearer secret' },
    });
    expect(eventResponse.status).toBe(200);

    const reader = eventResponse.body?.getReader();
    if (!reader) {
      throw new Error('Missing SSE reader');
    }
    const decoder = new TextDecoder();
    let buffer = '';

    const readEvent = async (): Promise<any> => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) throw new Error('Stream ended');
        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split('\n\n');
        if (segments.length > 1) {
          const eventChunk = segments.shift() as string;
          buffer = segments.join('\n\n');
          const dataLine = eventChunk.split('\n').find((line) => line.startsWith('data: '));
          if (dataLine) {
            return JSON.parse(dataLine.slice(6));
          }
        }
      }
    };

    const initialEvent = await readEvent();
    const clientId = initialEvent.clientId as string;
    expect(clientId).toBeDefined();

    const initializeResponse = await fetch(`${baseUrl}/mcp/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        Authorization: 'Bearer secret',
      },
      body: JSON.stringify({
        type: 'request',
        id: 'init',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          clientInfo: { name: 'sse-client', version: '1.0.0' },
        },
      }),
    });
    expect(initializeResponse.status).toBe(200);
    const initAck = await readEvent();
    expect(initAck.id).toBe('init');

    const callResponse = await fetch(`${baseUrl}/mcp/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        Authorization: 'Bearer secret',
      },
      body: JSON.stringify({
        type: 'request',
        id: 'echo',
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: 'hello sse' },
        },
      }),
    });
    expect(callResponse.status).toBe(200);
    const callEvent = await readEvent();
    expect(callEvent.id).toBe('echo');
    const payload = JSON.parse(callEvent.result.content[0].text);
    expect(payload.echo).toBe('hello sse');
  });
});
