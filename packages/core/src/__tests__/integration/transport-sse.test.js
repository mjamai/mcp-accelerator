"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../core/server");
const sse_transport_1 = require("../../../../transport-sse/src/sse-transport");
const zod_1 = require("zod");
describe('SSE Transport', () => {
    let server;
    let transport;
    let baseUrl;
    let skipSuite = false;
    beforeEach(async () => {
        skipSuite = false;
        server = new server_1.MCPServer({
            name: 'sse-integration',
            version: '1.0.0',
        });
        server.registerTool({
            name: 'echo',
            description: 'Echo input back',
            inputSchema: zod_1.z.object({ message: zod_1.z.string() }),
            handler: async (input) => ({ echo: input.message }),
        });
        transport = new sse_transport_1.SSETransport({
            port: 0,
            authToken: 'secret',
            maxRequestsPerMinute: 5,
        });
        try {
            await server.setTransport(transport);
            await server.start();
            const address = transport.fastify?.server.address();
            if (!address || typeof address.port !== 'number') {
                throw new Error('SSE transport address unavailable');
            }
            const host = address.address && address.address !== '::' ? address.address : '127.0.0.1';
            baseUrl = `http://${host}:${address.port}`;
        }
        catch (error) {
            const err = error;
            if (err.code === 'EPERM') {
                skipSuite = true;
                console.warn('Skipping SSE transport test due to restricted environment');
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
    it('delivers events and supports tools/call via SSE endpoints', async () => {
        if (skipSuite) {
            return;
        }
        const eventResponse = await fetch(`${baseUrl}/mcp/events`, {
            headers: { Authorization: 'Bearer secret' },
        });
        expect(eventResponse.status).toBe(200);
        const reader = eventResponse.body?.getReader();
        if (!reader) {
            throw new Error('Missing SSE reader');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        const readEvent = async () => {
            while (true) {
                const { value, done } = await reader.read();
                if (done)
                    throw new Error('Stream ended');
                buffer += decoder.decode(value, { stream: true });
                const segments = buffer.split('\n\n');
                if (segments.length > 1) {
                    const eventChunk = segments.shift();
                    buffer = segments.join('\n\n');
                    const dataLine = eventChunk.split('\n').find((line) => line.startsWith('data: '));
                    if (dataLine) {
                        return JSON.parse(dataLine.slice(6));
                    }
                }
            }
        };
        const initialEvent = await readEvent();
        const clientId = initialEvent.clientId;
        expect(clientId).toBeDefined();
        const initializeResponse = await fetch(`${baseUrl}/mcp/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': clientId,
                Authorization: 'Bearer secret',
            },
            body: JSON.stringify({
                type: 'request',
                id: 'init',
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    clientInfo: { name: 'sse-client', version: '1.0.0' },
                },
            }),
        });
        expect(initializeResponse.status).toBe(200);
        const initAck = await readEvent();
        expect(initAck.id).toBe('init');
        const callResponse = await fetch(`${baseUrl}/mcp/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': clientId,
                Authorization: 'Bearer secret',
            },
            body: JSON.stringify({
                type: 'request',
                id: 'echo',
                method: 'tools/call',
                params: {
                    name: 'echo',
                    arguments: { message: 'hello sse' },
                },
            }),
        });
        expect(callResponse.status).toBe(200);
        const callEvent = await readEvent();
        expect(callEvent.id).toBe('echo');
        const payload = JSON.parse(callEvent.result.content[0].text);
        expect(payload.echo).toBe('hello sse');
    });
});
//# sourceMappingURL=transport-sse.test.js.map