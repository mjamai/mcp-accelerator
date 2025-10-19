#!/usr/bin/env node

const { MCPServer, InMemoryResourceProvider, InMemoryPromptProvider } = require('../packages/core/dist');
const { WebSocketTransport } = require('../packages/transport-websocket/dist/websocket-transport');
const { z } = require('zod');
const WebSocket = require('ws');

(async () => {
  let server;
  let transport;
  try {
    server = new MCPServer({
    name: 'e2e-websocket-server',
    version: '1.0.0',
  });

  server.registerTool({
    name: 'ping',
    description: 'Ping tool',
    inputSchema: z.object({ message: z.string() }),
    handler: async (input) => ({ pong: input.message }),
  });

  server.registerResourceProvider(
    new InMemoryResourceProvider('memory', 'Memory resources', [
      {
        uri: 'memory://docs/example',
        name: 'example.txt',
        mimeType: 'text/plain',
        data: 'Hello MCP!',
      },
    ]),
  );

  server.registerPromptProvider(
    new InMemoryPromptProvider('builtin', 'Built-in prompts', [
      {
        id: 'welcome',
        title: 'Welcome message',
        placeholders: [{ id: 'name', required: true }],
        content: [
          { role: 'system', text: 'You are a helpful assistant.' },
          { role: 'user', text: 'Greet {{name}} warmly.' },
        ],
      },
    ]),
  );

    transport = new WebSocketTransport({ host: '127.0.0.1', port: 0 });
  await server.setTransport(transport);
  await server.start();

  const address = transport.getListeningAddress();
  if (!address) {
    throw new Error('WebSocket transport address unavailable');
  }
  const host = address.host === '::' ? '127.0.0.1' : address.host;
  const baseUrl = `ws://${host}:${address.port}`;

  const pending = new Map();
  const ws = new WebSocket(baseUrl);

  const sendRequest = (payload) =>
    new Promise((resolve, reject) => {
      pending.set(payload.id, { resolve, reject });
      ws.send(
        JSON.stringify({
          type: 'request',
          id: payload.id,
          method: payload.method,
          params: payload.params,
        }),
      );
    });

  const waitForOpen = () =>
    new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.id && pending.has(message.id)) {
      const { resolve } = pending.get(message.id);
      pending.delete(message.id);
      resolve(message);
    } else if (message.type === 'event') {
      console.log(`[event] ${message.method}`, message.params);
    } else {
      console.log('[message]', message);
    }
  });

  await waitForOpen();

  const init = await sendRequest({
    id: 'init',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'reference-client', version: '1.0.0' },
    },
  });
  if (init.type !== 'response') throw new Error('Initialize failed');

  const resources = await sendRequest({ id: 'resources-list', method: 'resources/list' });
  console.log('resources/list', resources.result.resources);

  const prompts = await sendRequest({ id: 'prompts-list', method: 'prompts/list' });
  console.log('prompts/list', prompts.result.prompts);

  const promptGet = await sendRequest({
    id: 'prompts-get',
    method: 'prompts/get',
    params: { id: 'welcome', arguments: { name: 'Ada' } },
  });
  console.log('prompts/get', promptGet.result);

  await server.notifyResourcesUpdated({ uris: ['memory://docs/example'], reason: 'sync' });
  await server.notifyPromptsUpdated({ promptIds: ['welcome'], reason: 'refresh' });

  setTimeout(async () => {
    ws.close();
    await server.stop();
    console.log('E2E reference scenario completed successfully');
    process.exit(0);
  }, 500);
  } catch (error) {
    console.error('E2E reference scenario failed:', error);
    try {
      await transport?.stop?.();
      await server?.stop?.();
    } catch (err) {
      console.error('Failed to stop server', err);
    }
    process.exit(1);
  }
})();
