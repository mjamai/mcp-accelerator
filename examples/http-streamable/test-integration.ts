import http from 'node:http';

const STREAM_URL = 'http://127.0.0.1:3100/mcp/stream';
const SESSION_HEADERS = {
  'Content-Type': 'application/json',
  'x-client-id': 'integration-client',
};

async function main() {
  console.log('Starting integration test for Streamable HTTP transport...');

  const messages = await openStream();
  console.log('Handshake and tool call validated.');

  sendNotification();

  const notification = await new Promise<string>((resolve, reject) => {
    messages.on('notification', resolve);
    messages.on('error', reject);
  });

  console.log('Received notification payload:', notification);
  console.log('Integration test completed successfully.');
  messages.close();
}

type StreamMessageEvents = {
  on: (event: 'notification', listener: (payload: string) => void) => void;
  on: (event: 'error', listener: (err: Error) => void) => void;
  close: () => void;
};

function openStream(): Promise<StreamMessageEvents> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      STREAM_URL,
      {
        method: 'POST',
        headers: SESSION_HEADERS,
      },
      (res) => {
        res.setEncoding('utf8');

        const listeners: { [key: string]: Array<(...args: unknown[]) => void> } = {
          notification: [],
          error: [],
        };

        const events: StreamMessageEvents = {
          on(event, listener) {
            listeners[event].push(listener);
            return this;
          },
          close() {
            req.destroy();
          },
        };

        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const message = JSON.parse(trimmed);
              handleServerMessage(req, events, message, listeners);
            } catch (error) {
              listeners.error.forEach((listener) => listener(error as Error));
            }
          }
        });

        res.on('end', () => resolve(events));

        sendInitialize(req);
        setTimeout(() => sendToolsCall(req), 50);
      },
    );

    req.on('error', reject);
  });
}

function sendInitialize(req: http.ClientRequest): void {
  const initializeRequest = {
    type: 'request',
    id: 'init',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      clientInfo: {
        name: 'integration-test-client',
        version: '1.0.0',
      },
    },
  };

  req.write(`${JSON.stringify(initializeRequest)}\n`);
}

function sendToolsCall(req: http.ClientRequest): void {
  const toolsCall = {
    type: 'request',
    id: 'call-1',
    method: 'tools/call',
    params: {
      name: 'echo',
      arguments: { text: 'Hello from integration test' },
    },
  };

  req.write(`${JSON.stringify(toolsCall)}\n`);
}

function handleServerMessage(
  req: http.ClientRequest,
  events: StreamMessageEvents,
  message: any,
  listeners: Record<string, Array<(...args: unknown[]) => void>>,
): void {
  if (message.type === 'response' && message.id === 'init') {
    console.log('Initialize response:', message.result);
  } else if (message.type === 'response' && message.id === 'call-1') {
  console.log('Tool call response:', message.result);
  if (!Array.isArray(message.result?.content)) {
    throw new Error('Expected content array in tool call response');
  }
    if (!Array.isArray(message.result?.content)) {
      throw new Error('Expected content array in tool call response');
    }
  } else if (message.type === 'notification') {
    console.log('Notification received:', message);
    listeners.notification.forEach((listener) => listener(JSON.stringify(message)));
  }
}

function sendNotification(): void {
  const payload = JSON.stringify({ notice: 'Integration notification' });

  const options = {
    hostname: '127.0.0.1',
    port: 3100,
    path: '/mcp/stream',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': 'integration-server',
    },
  };

  const req = http.request(options, () => {
    /* keep open */
  });

  const notification = {
    type: 'notification',
    method: 'resources/updated',
    params: { payload },
  };

  req.write(`${JSON.stringify(notification)}\n`);
  req.end();
}

main().catch((error) => {
  console.error('Integration test failed:', error);
  process.exit(1);
});
