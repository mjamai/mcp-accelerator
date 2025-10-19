import http from 'node:http';

const host = process.env.MCP_EXAMPLE_HOST ?? '127.0.0.1';
const port = Number(process.env.MCP_EXAMPLE_PORT ?? '3200');

const EVENTS_URL = `http://${host}:${port}/mcp/events`;
const MESSAGE_URL = `http://${host}:${port}/mcp/message`;

async function main(): Promise<void> {
  console.log('Connecting to SSE transport...');
  const stream = await openEventStream();

  console.log('Sending initialize request...');
  await sendMessage(stream.clientId, {
    type: 'request',
    id: 'init',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'integration-client', version: '1.0.0' },
    },
  });

  const initResponse = await stream.nextMessage();
  console.log('Initialize response:', initResponse);

  console.log('Calling echo tool...');
  await sendMessage(stream.clientId, {
    type: 'request',
    id: 'call-1',
    method: 'tools/call',
    params: { name: 'echo', arguments: { text: 'Hello from SSE test' } },
  });

  const toolResponse = await stream.nextMessage();
  console.log('Tool call response:', toolResponse);

  stream.close();
  console.log('Integration test completed successfully.');
}

async function openEventStream(): Promise<EventStream> {
  const headers = { Accept: 'text/event-stream' };
  const agent = new http.Agent({ keepAlive: true });

  return new Promise((resolve, reject) => {
    const req = http.get(EVENTS_URL, { headers, agent }, (res) => {

      if (res.statusCode !== 200) {
        reject(new Error(`Unexpected status code ${res.statusCode}`));
        return;
      }

      res.setEncoding('utf8');

      const queue: MCPEnvelope[] = [];
      let resolveNext: ((value: MCPEnvelope) => void) | null = null;
      let clientId: string | undefined;
      let buffer = '';

      const deliver = () => {
        if (resolveNext && queue.length > 0) {
          const msg = queue.shift()!;
          const resolver = resolveNext;
          resolveNext = null;
          resolver(msg);
        }
      };

      res.on('data', (chunk) => {
        buffer += chunk;
        let boundary: number;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data:'));

          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;

          const message = JSON.parse(payload) as MCPEnvelope;

          if (message && (message as any).type === 'connected') {
            clientId = (message as any).clientId as string;
            console.log('Connected with clientId:', clientId);
            continue;
          }

          queue.push(message);
          deliver();
        }
      });

      res.on('close', () => {
        if (resolveNext) {
          resolveNext(Promise.reject(new Error('Stream closed')) as never);
        }
      });

      setTimeout(() => {
        if (!clientId) {
          reject(new Error('Stream did not provide clientId'));
        } else {
          resolve({
            clientId,
            nextMessage: () =>
              new Promise((msgResolve, msgReject) => {
                if (queue.length > 0) {
                  msgResolve(queue.shift()!);
                } else {
                  resolveNext = msgResolve;
                  res.once('error', msgReject);
                }
              }),
            close: () => req.destroy(),
          });
        }
      }, 200);
    });

    req.on('error', reject);
  });
}

function sendMessage(clientId: string, message: MCPEnvelope): Promise<void> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(message);
    const req = http.request(
      MESSAGE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Unexpected status ${res.statusCode}`));
          return;
        }
        res.resume();
        res.on('end', resolve);
      },
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

type MCPEnvelope = Record<string, unknown>;

type EventStream = {
  clientId: string;
  nextMessage: () => Promise<MCPEnvelope>;
  close: () => void;
};

main().catch((error) => {
  console.error('Integration script failed:', error);
  process.exit(1);
});
