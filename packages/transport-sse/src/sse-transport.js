"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSETransport = void 0;
const fastify_1 = __importDefault(require("fastify"));
const core_1 = require("@mcp-accelerator/core");
const crypto_1 = require("crypto");
/**
 * Server-Sent Events (SSE) transport for server-to-client streaming
 */
class SSETransport extends core_1.BaseTransport {
    name = 'sse';
    fastify;
    clients = new Map();
    options;
    requestCounters = new Map();
    metrics = {
        rejectedAuth: 0,
        rejectedQuota: 0,
    };
    constructor(options = {}) {
        super();
        this.options = {
            host: options.host || '127.0.0.1',
            port: options.port ?? 3002,
            authToken: options.authToken ?? '',
            maxRequestsPerMinute: options.maxRequestsPerMinute ?? 0,
        };
    }
    /**
     * Start the SSE transport
     */
    async start() {
        if (this.isStarted) {
            throw new Error('SSE transport is already started');
        }
        this.fastify = (0, fastify_1.default)({
            logger: false,
        });
        // SSE endpoint for establishing connection
        this.fastify.get('/mcp/events', async (request, reply) => {
            if (!this.authenticateRequest(request, reply)) {
                return;
            }
            const clientId = (0, crypto_1.randomUUID)();
            // Set SSE headers
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            });
            // Store client
            this.clients.set(clientId, { id: clientId, reply });
            // Send client ID
            reply.raw.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);
            // Emit connect event
            await this.emitConnect(clientId);
            // Handle client disconnect
            request.raw.on('close', async () => {
                this.clients.delete(clientId);
                await this.emitDisconnect(clientId);
                console.log(`SSE client disconnected: ${clientId}`);
            });
            // Keep connection alive
            const keepAliveInterval = setInterval(() => {
                if (reply.raw.writable) {
                    reply.raw.write(': keepalive\n\n');
                }
                else {
                    clearInterval(keepAliveInterval);
                }
            }, 30000);
            request.raw.on('close', () => {
                clearInterval(keepAliveInterval);
            });
        });
        // POST endpoint for receiving messages from client
        this.fastify.post('/mcp/message', async (request, reply) => {
            if (!this.authenticateRequest(request, reply)) {
                return;
            }
            if (!this.applyQuota(request, reply)) {
                return;
            }
            try {
                const clientId = request.headers['x-client-id'];
                if (!clientId || !this.clients.has(clientId)) {
                    return reply.status(404).send({ error: 'Client not found' });
                }
                const message = request.body;
                await this.emitMessage(clientId, message);
                return reply.send({ status: 'ok' });
            }
            catch (error) {
                return reply.status(400).send({
                    error: 'Invalid message format',
                    details: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        });
        // Health check endpoint
        this.fastify.get('/health', async () => {
            return {
                status: 'ok',
                transport: 'sse',
                clients: this.clients.size,
            };
        });
        this.fastify.get('/metrics', async () => ({
            connectedClients: this.clients.size,
            rejectedAuth: this.metrics.rejectedAuth,
            rejectedQuota: this.metrics.rejectedQuota,
            requestCounters: this.requestCounters.size,
        }));
        await this.fastify.listen({
            host: this.options.host,
            port: this.options.port,
        });
        this.isStarted = true;
        console.log(`SSE transport listening on ${this.options.host}:${this.options.port}`);
    }
    /**
     * Stop the SSE transport
     */
    async stop() {
        if (!this.isStarted || !this.fastify) {
            return;
        }
        // Close all client connections
        for (const [clientId, client] of this.clients.entries()) {
            if (client.reply.raw.writable) {
                client.reply.raw.end();
            }
            await this.emitDisconnect(clientId);
        }
        await this.fastify.close();
        this.clients.clear();
        this.requestCounters.clear();
        this.isStarted = false;
    }
    /**
     * Send message to specific client
     */
    async send(clientId, message) {
        if (!this.isStarted) {
            throw new Error('SSE transport is not started');
        }
        const client = this.clients.get(clientId);
        if (!client) {
            throw new Error(`Client not found: ${clientId}`);
        }
        if (client.reply.raw.writable) {
            const data = JSON.stringify(message);
            client.reply.raw.write(`data: ${data}\n\n`);
        }
        else {
            throw new Error(`Client connection not writable: ${clientId}`);
        }
    }
    /**
     * Broadcast message to all connected clients
     */
    async broadcast(message) {
        if (!this.isStarted) {
            throw new Error('SSE transport is not started');
        }
        const data = JSON.stringify(message);
        for (const [clientId, client] of this.clients.entries()) {
            if (client.reply.raw.writable) {
                client.reply.raw.write(`data: ${data}\n\n`);
            }
        }
    }
    /**
     * Get count of connected clients
     */
    getClientCount() {
        return this.clients.size;
    }
    authenticateRequest(request, reply) {
        if (!this.options.authToken) {
            return true;
        }
        const header = request.headers['authorization'];
        const expected = `Bearer ${this.options.authToken}`;
        if (header !== expected) {
            this.metrics.rejectedAuth++;
            reply.code(401).send({ error: 'Unauthorized' });
            return false;
        }
        return true;
    }
    applyQuota(request, reply) {
        if (!this.options.maxRequestsPerMinute || this.options.maxRequestsPerMinute <= 0) {
            return true;
        }
        const clientKey = request.headers['x-client-id'] ||
            request.headers['authorization'] ||
            request.ip;
        const windowMs = 60_000;
        const now = Date.now();
        const record = this.requestCounters.get(clientKey) ?? { windowStart: now, count: 0 };
        if (now - record.windowStart >= windowMs) {
            record.windowStart = now;
            record.count = 0;
        }
        record.count += 1;
        this.requestCounters.set(clientKey, record);
        if (record.count > this.options.maxRequestsPerMinute) {
            this.metrics.rejectedQuota++;
            reply.code(429).send({
                error: 'Rate limit exceeded',
                code: 'RATE_LIMIT',
                limits: { maxRequestsPerMinute: this.options.maxRequestsPerMinute },
            });
            return false;
        }
        return true;
    }
}
exports.SSETransport = SSETransport;
//# sourceMappingURL=sse-transport.js.map