"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../server");
const logger_1 = require("../logger");
const in_memory_provider_1 = require("../../prompts/providers/in-memory-provider");
const error_handler_1 = require("../error-handler");
class MockTransport {
    name = 'mock';
    sentMessages = [];
    broadcastMessages = [];
    messageHandler;
    connectHandler;
    disconnectHandler;
    async start() { }
    async stop() { }
    async send(clientId, message) {
        this.sentMessages.push({ clientId, message });
    }
    async broadcast(message) {
        this.broadcastMessages.push(message);
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    onConnect(handler) {
        this.connectHandler = handler;
    }
    onDisconnect(handler) {
        this.disconnectHandler = handler;
    }
    async emitMessage(clientId, message) {
        if (!this.messageHandler)
            throw new Error('No message handler registered');
        await this.messageHandler(clientId, message);
    }
}
describe('MCPServer prompts support', () => {
    const createServer = () => new server_1.MCPServer({
        name: 'test',
        version: '1.0.0',
        logger: new logger_1.SilentLogger(),
    });
    const initialize = async (server, transport) => {
        await server.setTransport(transport);
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
        server.registerPromptProvider(new in_memory_provider_1.InMemoryPromptProvider('builtin', 'Builtin prompts', [
            {
                id: 'welcome',
                title: 'Welcome message',
                content: [
                    { role: 'system', text: 'You are a helpful assistant.' },
                    { role: 'user', text: 'Greet {{name}} warmly.' },
                ],
                placeholders: [{ id: 'name', required: true }],
            },
        ]));
        await initialize(server, transport);
        await transport.emitMessage('client', {
            type: 'request',
            id: 'prompts-list',
            method: 'prompts/list',
        });
        const reply = transport.sentMessages[0].message;
        expect(reply.type).toBe('response');
        const result = reply.result;
        expect(result.prompts[0].id).toBe('welcome');
    });
    it('retrieves prompt via prompts/get and validates placeholders', async () => {
        const server = createServer();
        const transport = new MockTransport();
        server.registerPromptProvider(new in_memory_provider_1.InMemoryPromptProvider('builtin', 'Builtin prompts', [
            {
                id: 'welcome',
                title: 'Welcome message',
                content: [
                    { role: 'system', text: 'You are a helpful assistant.' },
                    { role: 'user', text: 'Greet {{name}} warmly.' },
                ],
                placeholders: [{ id: 'name', required: true }],
            },
        ]));
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
        const result = reply.result;
        expect(result.prompt.id).toBe('welcome');
        expect(result.arguments.name).toBe('Ada');
    });
    it('fails when required placeholders are missing', async () => {
        const server = createServer();
        const transport = new MockTransport();
        server.registerPromptProvider(new in_memory_provider_1.InMemoryPromptProvider('builtin', 'Builtin prompts', [
            {
                id: 'welcome',
                title: 'Welcome message',
                content: [
                    { role: 'system', text: 'You are a helpful assistant.' },
                    { role: 'user', text: 'Greet {{name}} warmly.' },
                ],
                placeholders: [{ id: 'name', required: true }],
            },
        ]));
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
        expect(reply.error?.code).toBe(error_handler_1.MCPErrorCode.INVALID_PARAMS);
    });
    it('broadcasts prompts/updated events', async () => {
        const server = createServer();
        const transport = new MockTransport();
        server.registerPromptProvider(new in_memory_provider_1.InMemoryPromptProvider('builtin', 'Builtin prompts', []));
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
//# sourceMappingURL=server.prompts.test.js.map