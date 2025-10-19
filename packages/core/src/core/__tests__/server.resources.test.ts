import { MCPServer } from '../server';
import { SilentLogger } from '../logger';
import {
  MCPMessage,
  MessageHandler,
  ConnectHandler,
  DisconnectHandler,
} from '../../types';
import { InMemoryResourceProvider } from '../../resources/providers/in-memory-provider';
import { MCPErrorCode } from '../error-handler';

class MockTransport {
  public readonly name = 'mock';
  public readonly sentMessages: Array<{ clientId: string; message: MCPMessage }> = [];
  public readonly broadcastMessages: MCPMessage[] = [];
  private messageHandler?: MessageHandler;
  private connectHandler?: ConnectHandler;
  private disconnectHandler?: DisconnectHandler;

  async start(): Promise<void> {}
  async stop(): Promise<void> {}

  async send(clientId: string, message: MCPMessage): Promise<void> {
    this.sentMessages.push({ clientId, message });
  }

  async broadcast(message: MCPMessage): Promise<void> {
    this.broadcastMessages.push(message);
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onConnect(handler: ConnectHandler): void {
    this.connectHandler = handler;
  }

  onDisconnect(handler: DisconnectHandler): void {
    this.disconnectHandler = handler;
  }

  async emitMessage(clientId: string, message: MCPMessage): Promise<void> {
    if (!this.messageHandler) {
      throw new Error('No message handler registered');
    }
    await this.messageHandler(clientId, message);
  }

  async emitConnect(clientId: string): Promise<void> {
    if (this.connectHandler) {
      await this.connectHandler(clientId);
    }
  }

  async emitDisconnect(clientId: string): Promise<void> {
    if (this.disconnectHandler) {
      await this.disconnectHandler(clientId);
    }
  }
}

describe('MCPServer resources support', () => {
  const createServer = () =>
    new MCPServer({
      name: 'test',
      version: '1.0.0',
      logger: new SilentLogger(),
    });

  const createInitializeRequest = (protocolVersion: string): MCPMessage => ({
    type: 'request',
    id: 'init',
    method: 'initialize',
    params: {
      protocolVersion,
      clientInfo: { name: 'tests', version: '0.0.1' },
    },
  });

  it('lists resources from registered providers', async () => {
    const server = createServer();
    const transport = new MockTransport();
    const provider = new InMemoryResourceProvider('memory', 'Memory resources', [
      {
        uri: 'memory://docs/example',
        name: 'example.txt',
        mimeType: 'text/plain',
        data: 'hello world',
      },
    ]);

    server.registerResourceProvider(provider);

    await server.setTransport(transport as any);
    await transport.emitMessage('c1', createInitializeRequest('2024-11-05'));
    transport.sentMessages.length = 0;

    await transport.emitMessage('c1', {
      type: 'request',
      id: 'resources-list',
      method: 'resources/list',
    });

    const reply = transport.sentMessages[0].message;
    expect(reply.type).toBe('response');
    const result = reply.result as { resources: Array<{ uri: string }> };
    expect(Array.isArray(result.resources)).toBe(true);
    expect(result.resources[0].uri).toBe('memory://docs/example');
  });

  it('reads resources via resources/read', async () => {
    const server = createServer();
    const transport = new MockTransport();
    const provider = new InMemoryResourceProvider('memory', 'Memory resources', [
      {
        uri: 'memory://docs/example',
        name: 'example.txt',
        mimeType: 'text/plain',
        data: 'hello world',
      },
    ]);

    server.registerResourceProvider(provider);

    await server.setTransport(transport as any);
    await transport.emitMessage('c1', createInitializeRequest('2024-11-05'));
    transport.sentMessages.length = 0;

    await transport.emitMessage('c1', {
      type: 'request',
      id: 'resources-read',
      method: 'resources/read',
      params: { uri: 'memory://docs/example' },
    });

    const reply = transport.sentMessages[0].message;
    expect(reply.type).toBe('response');
    const result = reply.result as { resource: { uri: string; data: string } };
    expect(result.resource.uri).toBe('memory://docs/example');
    expect(result.resource.data).toBe('hello world');
  });

  it('returns error when uri is missing', async () => {
    const server = createServer();
    const transport = new MockTransport();
    server.registerResourceProvider(
      new InMemoryResourceProvider('memory', 'Memory resources', []),
    );

    await server.setTransport(transport as any);
    await transport.emitMessage('c1', createInitializeRequest('2024-11-05'));
    transport.sentMessages.length = 0;

    await transport.emitMessage('c1', {
      type: 'request',
      id: 'resources-read',
      method: 'resources/read',
    });

    const reply = transport.sentMessages[0].message;
    expect(reply.type).toBe('error');
    expect(reply.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
  });

  it('broadcasts resources/updated events', async () => {
    const server = createServer();
    const transport = new MockTransport();
    server.registerResourceProvider(
      new InMemoryResourceProvider('memory', 'Memory resources', []),
    );

    await server.setTransport(transport as any);
    await transport.emitMessage('c1', createInitializeRequest('2024-11-05'));
    transport.sentMessages.length = 0;

    await server.notifyResourcesUpdated({
      uris: ['memory://docs/example'],
      reason: 'test-update',
    });

    expect(transport.broadcastMessages).toHaveLength(1);
    expect(transport.broadcastMessages[0]).toMatchObject({
      type: 'event',
      method: 'resources/updated',
      params: {
        listChanged: true,
        uris: ['memory://docs/example'],
        reason: 'test-update',
      },
    });
  });
});
