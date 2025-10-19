"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../server");
const logger_1 = require("../logger");
const in_memory_provider_1 = require("../../resources/providers/in-memory-provider");
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
        if (!this.messageHandler) {
            throw new Error('No message handler registered');
        }
        await this.messageHandler(clientId, message);
    }
    async emitConnect(clientId) {
        if (this.connectHandler) {
            await this.connectHandler(clientId);
        }
    }
    async emitDisconnect(clientId) {
        if (this.disconnectHandler) {
            await this.disconnectHandler(clientId);
        }
    }
}
describe('MCPServer resources support', () => {
    const createServer = () => new server_1.MCPServer({
        name: 'test',
        version: '1.0.0',
        logger: new logger_1.SilentLogger(),
    });
    const createInitializeRequest = (protocolVersion) => ({
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
        const provider = new in_memory_provider_1.InMemoryResourceProvider('memory', 'Memory resources', [
            {
                uri: 'memory://docs/example',
                name: 'example.txt',
                mimeType: 'text/plain',
                data: 'hello world',
            },
        ]);
        server.registerResourceProvider(provider);
        await server.setTransport(transport);
        await transport.emitMessage('c1', createInitializeRequest('2024-11-05'));
        transport.sentMessages.length = 0;
        await transport.emitMessage('c1', {
            type: 'request',
            id: 'resources-list',
            method: 'resources/list',
        });
        const reply = transport.sentMessages[0].message;
        expect(reply.type).toBe('response');
        const result = reply.result;
        expect(Array.isArray(result.resources)).toBe(true);
        expect(result.resources[0].uri).toBe('memory://docs/example');
    });
    it('reads resources via resources/read', async () => {
        const server = createServer();
        const transport = new MockTransport();
        const provider = new in_memory_provider_1.InMemoryResourceProvider('memory', 'Memory resources', [
            {
                uri: 'memory://docs/example',
                name: 'example.txt',
                mimeType: 'text/plain',
                data: 'hello world',
            },
        ]);
        server.registerResourceProvider(provider);
        await server.setTransport(transport);
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
        const result = reply.result;
        expect(result.resource.uri).toBe('memory://docs/example');
        expect(result.resource.data).toBe('hello world');
    });
    it('returns error when uri is missing', async () => {
        const server = createServer();
        const transport = new MockTransport();
        server.registerResourceProvider(new in_memory_provider_1.InMemoryResourceProvider('memory', 'Memory resources', []));
        await server.setTransport(transport);
        await transport.emitMessage('c1', createInitializeRequest('2024-11-05'));
        transport.sentMessages.length = 0;
        await transport.emitMessage('c1', {
            type: 'request',
            id: 'resources-read',
            method: 'resources/read',
        });
        const reply = transport.sentMessages[0].message;
        expect(reply.type).toBe('error');
        expect(reply.error?.code).toBe(error_handler_1.MCPErrorCode.INVALID_PARAMS);
    });
    it('broadcasts resources/updated events', async () => {
        const server = createServer();
        const transport = new MockTransport();
        server.registerResourceProvider(new in_memory_provider_1.InMemoryResourceProvider('memory', 'Memory resources', []));
        await server.setTransport(transport);
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
//# sourceMappingURL=server.resources.test.js.map