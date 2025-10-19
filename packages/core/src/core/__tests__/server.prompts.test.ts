import { MCPServer } from '../server';
import { SilentLogger } from '../logger';
import {
  MCPMessage,
  MessageHandler,
  ConnectHandler,
  DisconnectHandler,
} from '../../types';
import { InMemoryPromptProvider } from '../../prompts/providers/in-memory-provider';
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
    if (!this.messageHandler) throw new Error('No message handler registered');
    await this.messageHandler(clientId, message);
  }
}

describe('MCPServer prompts support', () => {
  const createServer = () =>
    new MCPServer({
      name: 'test',
      version: '1.0.0',
      logger: new SilentLogger(),
    });

  const initialize = async (server: MCPServer, transport: MockTransport): Promise<void> => {
    await server.setTransport(transport as unknown as any);
    await transport.emitMessage('client', {
      type: 'request',
      id: 'init',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'test-client', version: '0.0.1' },
      },
    });
    transport.sentMessages.length = 0;
  };

  it('lists prompts via prompts/list', async () => {
    const server = createServer();
    const transport = new MockTransport();

    server.registerPromptProvider(
      new InMemoryPromptProvider('builtin', 'Builtin prompts', [
        {
          id: 'welcome',
          title: 'Welcome message',
          content: [
            { role: 'system', text: 'You are a helpful assistant.' },
            { role: 'user', text: 'Greet {{name}} warmly.' },
          ],
          placeholders: [{ id: 'name', required: true }],
        },
      ]),
    );

    await initialize(server, transport);

    await transport.emitMessage('client', {
      type: 'request',
      id: 'prompts-list',
      method: 'prompts/list',
    });

    const reply = transport.sentMessages[0].message;
    expect(reply.type).toBe('response');
    const result = reply.result as { prompts: Array<{ id: string }> };
    expect(result.prompts[0].id).toBe('welcome');
  });

  it('retrieves prompt via prompts/get and validates placeholders', async () => {
    const server = createServer();
    const transport = new MockTransport();
    server.registerPromptProvider(
      new InMemoryPromptProvider('builtin', 'Builtin prompts', [
        {
          id: 'welcome',
          title: 'Welcome message',
          content: [
            { role: 'system', text: 'You are a helpful assistant.' },
            { role: 'user', text: 'Greet {{name}} warmly.' },
          ],
          placeholders: [{ id: 'name', required: true }],
        },
      ]),
    );

    await initialize(server, transport);

    await transport.emitMessage('client', {
      type: 'request',
      id: 'prompts-get',
      method: 'prompts/get',
      params: {
        id: 'welcome',
        arguments: {
          name: 'Ada',
        },
      },
    });

    const reply = transport.sentMessages[0].message;
    expect(reply.type).toBe('response');
    const result = reply.result as { prompt: { id: string }; arguments: Record<string, unknown> };
    expect(result.prompt.id).toBe('welcome');
    expect(result.arguments.name).toBe('Ada');
  });

  it('fails when required placeholders are missing', async () => {
    const server = createServer();
    const transport = new MockTransport();
    server.registerPromptProvider(
      new InMemoryPromptProvider('builtin', 'Builtin prompts', [
        {
          id: 'welcome',
          title: 'Welcome message',
          content: [
            { role: 'system', text: 'You are a helpful assistant.' },
            { role: 'user', text: 'Greet {{name}} warmly.' },
          ],
          placeholders: [{ id: 'name', required: true }],
        },
      ]),
    );

    await initialize(server, transport);

    await transport.emitMessage('client', {
      type: 'request',
      id: 'prompts-get',
      method: 'prompts/get',
      params: {
        id: 'welcome',
        arguments: {},
      },
    });

    const reply = transport.sentMessages[0].message;
    expect(reply.type).toBe('error');
    expect(reply.error?.code).toBe(MCPErrorCode.INVALID_PARAMS);
  });

  it('broadcasts prompts/updated events', async () => {
    const server = createServer();
    const transport = new MockTransport();
    server.registerPromptProvider(
      new InMemoryPromptProvider('builtin', 'Builtin prompts', []),
    );

    await initialize(server, transport);

    await server.notifyPromptsUpdated({
      promptIds: ['welcome'],
      reason: 'prompt-sync',
    });

    expect(transport.broadcastMessages).toHaveLength(1);
    expect(transport.broadcastMessages[0]).toMatchObject({
      type: 'event',
      method: 'prompts/updated',
      params: {
        listChanged: true,
        promptIds: ['welcome'],
        reason: 'prompt-sync',
      },
    });
  });
});
