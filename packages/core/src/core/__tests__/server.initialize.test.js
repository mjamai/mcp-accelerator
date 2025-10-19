"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../server");
const logger_1 = require("../logger");
const error_handler_1 = require("../error-handler");
class MockTransport {
    name = 'mock';
    sentMessages = [];
    messageHandler;
    connectHandler;
    disconnectHandler;
    async start() {
        // No-op for mock
    }
    async stop() {
        // No-op for mock
    }
    async send(clientId, message) {
        this.sentMessages.push({ clientId, message });
    }
    async broadcast(_message) {
        // Not needed for tests
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
class MutableTestLogger {
    records = [];
    currentLevel;
    constructor(initialLevel = 'info') {
        this.currentLevel = initialLevel;
    }
    setLevel(level) {
        this.currentLevel = level;
    }
    getLevel() {
        return this.currentLevel;
    }
    info(message) {
        this.records.push({ level: 'info', message });
    }
    warn(message) {
        this.records.push({ level: 'warn', message });
    }
    error(message) {
        this.records.push({ level: 'error', message });
    }
    debug(message) {
        this.records.push({ level: 'debug', message });
    }
}
describe('MCPServer initialize negotiation', () => {
    const createServer = (overrides = {}) => new server_1.MCPServer({
        name: 'test',
        version: '1.0.0',
        logger: new logger_1.SilentLogger(),
        ...overrides,
    });
    const createInitializeRequest = (protocolVersion) => ({
        type: 'request',
        id: 'init-1',
        method: 'initialize',
        params: {
            protocolVersion,
            clientInfo: { name: 'unit-test', version: '0.1.0' },
        },
    });
    it('returns negotiated capabilities limited to implemented features', async () => {
        const server = createServer();
        const transport = new MockTransport();
        await server.setTransport(transport);
        await transport.emitMessage('client-1', createInitializeRequest('2024-11-05'));
        expect(transport.sentMessages).toHaveLength(1);
        const reply = transport.sentMessages[0].message;
        expect(reply.type).toBe('response');
        expect(reply.result).toBeDefined();
        if (reply.result && typeof reply.result === 'object') {
            const capabilities = reply.result.capabilities;
            expect(Object.keys(capabilities).sort()).toEqual(['logging', 'tools']);
            expect(reply.result).toMatchObject({
                protocolVersion: '2024-11-05',
            });
        }
    });
    it('falls back to the closest supported version when allowed', async () => {
        const server = createServer({
            protocol: {
                allowBackwardCompatibility: true,
            },
        });
        const transport = new MockTransport();
        await server.setTransport(transport);
        await transport.emitMessage('client-1', createInitializeRequest('2026-01-01'));
        const reply = transport.sentMessages[0].message;
        expect(reply.type).toBe('response');
        if (reply.result && typeof reply.result === 'object') {
            expect(reply.result).toMatchObject({
                protocolVersion: '2025-06-18',
            });
            const capabilities = reply.result.capabilities;
            expect(Object.keys(capabilities).sort()).toEqual(['logging', 'tools']);
        }
    });
    it('returns MCP error when strict mode rejects the requested version', async () => {
        const server = createServer({
            protocol: {
                strictMode: true,
                allowBackwardCompatibility: false,
            },
        });
        const transport = new MockTransport();
        await server.setTransport(transport);
        await transport.emitMessage('client-1', createInitializeRequest('2023-01-01'));
        const reply = transport.sentMessages[0].message;
        expect(reply.type).toBe('error');
        expect(reply.error?.code).toBe(error_handler_1.MCPErrorCode.INVALID_PARAMS);
        expect(reply.error?.message).toContain('Unsupported protocol version');
    });
    it('updates the active logger level via logging/setLevel', async () => {
        const logger = new MutableTestLogger('info');
        const server = createServer({ logger });
        const transport = new MockTransport();
        await server.setTransport(transport);
        await transport.emitMessage('client-1', createInitializeRequest('2024-11-05'));
        transport.sentMessages.length = 0;
        await transport.emitMessage('client-1', {
            type: 'request',
            id: 'log-req-1',
            method: 'logging/setLevel',
            params: { level: 'debug' },
        });
        expect(logger.getLevel()).toBe('debug');
        expect(transport.sentMessages[0].message.type).toBe('response');
    });
    it('rejects invalid log level values', async () => {
        const logger = new MutableTestLogger('info');
        const server = createServer({ logger });
        const transport = new MockTransport();
        await server.setTransport(transport);
        await transport.emitMessage('client-1', createInitializeRequest('2024-11-05'));
        transport.sentMessages.length = 0;
        await transport.emitMessage('client-1', {
            type: 'request',
            id: 'log-req-2',
            method: 'logging/setLevel',
            params: { level: 'verbose' },
        });
        expect(logger.getLevel()).toBe('info');
        const reply = transport.sentMessages[0].message;
        expect(reply.type).toBe('error');
        expect(reply.error?.code).toBe(error_handler_1.MCPErrorCode.INVALID_PARAMS);
    });
    it('validates JSON-RPC request envelope structure', async () => {
        const server = createServer();
        const transport = new MockTransport();
        await server.setTransport(transport);
        await transport.emitMessage('client-1', {
            type: 'request',
            // Invalid id type should trigger INVALID_REQUEST
            id: { invalid: true },
            method: 'tools/list',
        });
        const reply = transport.sentMessages[0].message;
        expect(reply.type).toBe('error');
        expect(reply.error?.code).toBe(error_handler_1.MCPErrorCode.INVALID_REQUEST);
    });
});
//# sourceMappingURL=server.initialize.test.js.map