"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../core/server");
const websocket_transport_1 = require("../../../../transport-websocket/src/websocket-transport");
const zod_1 = require("zod");
const ws_1 = __importDefault(require("ws"));
describe('WebSocket Transport', () => {
    let server;
    let transport;
    let baseUrl;
    let skipSuite = false;
    const createClient = async (headers = {}) => {
        const pending = new Map();
        const ws = new ws_1.default(baseUrl, { headers });
        const send = (payload) => new Promise((resolve, reject) => {
            pending.set(payload.id, { resolve, reject });
            ws.send(JSON.stringify({
                type: 'request',
                id: payload.id,
                method: payload.method,
                params: payload.params,
            }));
        });
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.id && pending.has(message.id)) {
                const resolver = pending.get(message.id);
                if (resolver) {
                    pending.delete(message.id);
                    resolver.resolve(message);
                }
            }
        });
        await new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 2000);
            ws.once('open', () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve();
                }
            });
            ws.once('error', (err) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    reject(err);
                }
            });
            ws.once('close', (code, reason) => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    const textReason = typeof reason === 'string' ? reason : reason.toString();
                    reject(new Error(`Connection closed (${code}) ${textReason}`));
                }
                else if (code === 4401 || code === 1008) {
                    settled = true;
                    reject(new Error('Connection unauthorized'));
                }
            });
        });
        const close = () => new Promise((resolve) => {
            ws.once('close', () => resolve());
            ws.close();
        });
        return { ws, send, close };
    };
    beforeEach(async () => {
        server = new server_1.MCPServer({
            name: 'ws-integration',
            version: '1.0.0',
        });
        server.registerTool({
            name: 'echo',
            description: 'Echo input back',
            inputSchema: zod_1.z.object({ message: zod_1.z.string() }),
            handler: async (input) => ({ echo: input.message }),
        });
        transport = new websocket_transport_1.WebSocketTransport({
            port: 0,
            authToken: 'secret',
            maxMessagesPerMinute: 5,
        });
        try {
            await server.setTransport(transport);
            await server.start();
            const address = transport.getListeningAddress();
            if (!address) {
                throw new Error('WebSocket transport did not report listening address');
            }
            const host = address.host === '::' ? '127.0.0.1' : address.host;
            baseUrl = `ws://${host}:${address.port}`;
        }
        catch (error) {
            const err = error;
            if (err.code === 'EPERM') {
                skipSuite = true;
                console.warn('Skipping WebSocket transport test due to restricted environment');
                await server.stop().catch(() => undefined);
            }
            else {
                throw error;
            }
        }
    });
    afterEach(async () => {
        await server.stop();
    });
    it('handles initialize and tools/call over WebSocket', async () => {
        if (skipSuite) {
            return;
        }
        const client = await createClient({ Authorization: 'Bearer secret' });
        const init = await client.send({
            id: 'init',
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                clientInfo: { name: 'ws-test', version: '0.0.1' },
            },
        });
        expect(init.type).toBe('response');
        expect(init.result.protocolVersion).toBe('2024-11-05');
        const call = await client.send({
            id: 'echo',
            method: 'tools/call',
            params: {
                name: 'echo',
                arguments: { message: 'hello ws' },
            },
        });
        expect(call.type).toBe('response');
        expect(call.result.content[0].type).toBe('text');
        const payload = JSON.parse(call.result.content[0].text);
        expect(payload.echo).toBe('hello ws');
        await client.close();
    });
    it('rejects unauthorized connections', async () => {
        if (skipSuite) {
            return;
        }
        await expect(createClient({ Authorization: 'Bearer invalid-token' })).rejects.toThrow();
    });
});
//# sourceMappingURL=transport-websocket.test.js.map