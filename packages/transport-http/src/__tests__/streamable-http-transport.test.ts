import http from 'node:http';
import { AddressInfo } from 'node:net';

import { StreamableHttpTransport } from '../streamable-http-transport';
import type { MCPMessage } from '@mcp-accelerator/core';
import { MCPErrorCode } from '@mcp-accelerator/core';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('StreamableHttpTransport', () => {
  let transport: StreamableHttpTransport;

  afterEach(async () => {
    if (transport) {
      await transport.stop();
    }
  });

  it('parses incoming JSON lines and emits responses as JSON lines', async () => {
    transport = new StreamableHttpTransport({ port: 0, idleTimeoutMs: 0 });

    const received: MCPMessage[] = [];
    transport.onMessage(async (clientId, message) => {
      received.push(message);
      await transport.send(clientId, {
        type: 'response',
        id: (message as any).id ?? null,
        result: { ok: true },
      } as MCPMessage);
    });

    await transport.start();
    const address = (transport as any).server.address() as AddressInfo;

    const responseChunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: address.port,
          path: '/mcp/stream',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': 'client-1',
          },
        },
        (res) => {
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            responseChunks.push(chunk);
            req.destroy();
          });
          res.on('end', resolve);
        },
      );
      req.on('error', reject);

      const requestMessage = {
        type: 'request',
        id: 'req-1',
        method: 'initialize',
        params: { protocolVersion: '2024-11-05' },
      };

      req.write(`${JSON.stringify(requestMessage)}\n`);
      req.end();
    });

    expect(received).toHaveLength(1);
    expect((received[0] as any).method).toBe('initialize');

    const payload = responseChunks.join('');
    const responseLine = payload.split('\n').find((line) => line.trim().length > 0);
    expect(responseLine).toBeDefined();
    const parsedResponse = JSON.parse(responseLine!);
    expect(parsedResponse).toMatchObject({
      type: 'response',
      id: 'req-1',
      result: { ok: true },
    });
  });

  it('returns protocol errors when payload is invalid JSON', async () => {
    transport = new StreamableHttpTransport({ port: 0, idleTimeoutMs: 0 });
    await transport.start();
    const address = (transport as any).server.address() as AddressInfo;

    const responseChunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: address.port,
          path: '/mcp/stream',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-client-id': 'client-err' },
        },
        (res) => {
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            responseChunks.push(chunk);
            req.destroy();
          });
          res.on('end', resolve);
        },
      );
      req.on('error', reject);

      req.write('not-json\n');
      req.end();
    });

    const responseLine = responseChunks.join('').split('\n').find((line) => line.trim());
    expect(responseLine).toBeDefined();
    const parsed = JSON.parse(responseLine!);
    expect(parsed).toMatchObject({
      type: 'error',
      error: { code: MCPErrorCode.INVALID_REQUEST },
    });
  });

  it('handles backpressure when writing large payloads', async () => {
    transport = new StreamableHttpTransport({ port: 0, idleTimeoutMs: 0 });
    await transport.start();
    const address = (transport as any).server.address() as AddressInfo;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path: '/mcp/stream',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': 'client-backpressure' },
      },
      () => {
        /* keep stream open */
      },
    );
    req.write('\n');

    // Attendre que la session soit enregistrée
    for (let attempt = 0; attempt < 10; attempt++) {
      if ((transport as any).sessionsByClient?.has('client-backpressure')) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await wait(10);
    }

    const session: any = (transport as any).sessionsByClient.get('client-backpressure');
    expect(session).toBeDefined();

    const response: any = session.response;
    const writes: string[] = [];
    const originalWrite = response.write.bind(response);
    response.write = jest.fn((chunk: string, callback?: (err?: Error) => void) => {
      writes.push(chunk);
      process.nextTick(() => {
        response.emit('drain');
        callback?.();
      });
      return false;
    });

    const message: MCPMessage = {
      type: 'response',
      id: 'bp',
      result: { data: 'x'.repeat(1024 * 128) },
    };

    await expect(transport.send('client-backpressure', message)).resolves.toBeUndefined();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toBe(`${JSON.stringify(message)}\n`);

    response.write = originalWrite;
    req.destroy();
  });
});
