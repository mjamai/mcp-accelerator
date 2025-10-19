"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
const ws_1 = require("ws");
const core_1 = require("@mcp-accelerator/core");
const crypto_1 = require("crypto");
/**
 * WebSocket transport with resilience features
 */
class WebSocketTransport extends core_1.BaseTransport {
    name = 'websocket';
    wss;
    clients = new Map();
    options;
    heartbeatTimer;
    listeningAddress = null;
    messageQuota = new Map();
    metrics = {
        rejectedAuth: 0,
        rejectedQuota: 0,
    };
    constructor(options = {}) {
        super();
        this.options = {
            host: options.host || '127.0.0.1',
            port: options.port ?? 3001,
            authToken: options.authToken ?? '',
            maxClients: options.maxClients ?? 0,
            maxMessageSize: options.maxMessageSize ?? 1048576, // 1MB
            heartbeatInterval: options.heartbeatInterval ?? 30000,
            heartbeatTimeout: options.heartbeatTimeout ?? 60000,
            idleTimeout: options.idleTimeout ?? 300000, // 5 minutes
            enableBackpressure: options.enableBackpressure ?? true,
            highWaterMark: options.highWaterMark ?? 16 * 1024 * 1024, // 16MB
            maxMessagesPerSecond: options.maxMessagesPerSecond ?? 0,
            maxMessagesPerMinute: options.maxMessagesPerMinute ?? 0,
            wsOptions: options.wsOptions || {},
        };
    }
    /**
     * Start the WebSocket transport
     */
    async start() {
        if (this.isStarted) {
            throw new Error('WebSocket transport is already started');
        }
        this.wss = new ws_1.WebSocketServer({
            host: this.options.host,
            port: this.options.port,
            maxPayload: this.options.maxMessageSize,
            verifyClient: (info, done) => {
                if (this.options.authToken) {
                    const header = info.req.headers['authorization'];
                    const expected = `Bearer ${this.options.authToken}`;
                    if (header !== expected) {
                        this.metrics.rejectedAuth++;
                        done(false, 401, 'Unauthorized');
                        return;
                    }
                }
                done(true);
            },
            ...this.options.wsOptions,
        });
        await new Promise((resolve, reject) => {
            this.wss.once('listening', () => resolve());
            this.wss.once('error', (error) => reject(error));
        });
        this.wss.on('connection', (ws, request) => {
            // Check max clients limit
            if (this.options.maxClients > 0 && this.clients.size >= this.options.maxClients) {
                ws.close(1008, 'Server at capacity');
                return;
            }
            const clientId = (0, crypto_1.randomUUID)();
            const clientState = {
                ws,
                isAlive: true,
                lastActivity: Date.now(),
                messageCount: 0,
                lastMessageTime: Date.now(),
            };
            this.clients.set(clientId, clientState);
            this.emitConnect(clientId);
            // Setup heartbeat for this client
            this.setupClientHeartbeat(clientId, clientState);
            // Handle pong (response to ping)
            ws.on('pong', () => {
                clientState.isAlive = true;
                clientState.lastActivity = Date.now();
            });
            // Handle messages
            ws.on('message', async (data) => {
                try {
                    // Check message size
                    const dataStr = data.toString();
                    if (dataStr.length > this.options.maxMessageSize) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            error: {
                                code: -32000,
                                message: 'Message too large',
                                data: { maxSize: this.options.maxMessageSize },
                            },
                        }));
                        return;
                    }
                    // Rate limiting check
                    if (this.options.maxMessagesPerSecond > 0) {
                        const now = Date.now();
                        const timeSinceLastMessage = now - clientState.lastMessageTime;
                        if (timeSinceLastMessage < 1000) {
                            clientState.messageCount++;
                            if (clientState.messageCount > this.options.maxMessagesPerSecond) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    error: {
                                        code: -32001,
                                        message: 'Rate limit exceeded',
                                        data: { maxRate: this.options.maxMessagesPerSecond },
                                    },
                                }));
                                return;
                            }
                        }
                        else {
                            clientState.messageCount = 1;
                            clientState.lastMessageTime = now;
                        }
                    }
                    if (!this.applyMessageQuota(clientId, ws)) {
                        return;
                    }
                    // Update activity
                    clientState.lastActivity = Date.now();
                    // Parse and process message
                    const message = JSON.parse(dataStr);
                    await this.emitMessage(clientId, message);
                }
                catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: {
                            code: -32700,
                            message: 'Parse error',
                            data: error instanceof Error ? error.message : 'Unknown error',
                        },
                    }));
                }
            });
            // Handle close
            ws.on('close', (code, reason) => {
                this.cleanupClient(clientId);
            });
            // Handle errors
            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
                this.cleanupClient(clientId);
            });
            // Check backpressure
            if (this.options.enableBackpressure) {
                ws.on('drain', () => {
                    // Buffer has been drained, can resume sending
                    console.log(`WebSocket drain event for client ${clientId}`);
                });
            }
        });
        // Start global heartbeat checker
        this.startHeartbeatChecker();
        // Start idle connection checker
        this.startIdleChecker();
        const addressInfo = this.wss.address();
        if (addressInfo && typeof addressInfo.port === 'number') {
            const host = addressInfo.address && addressInfo.address !== '::'
                ? addressInfo.address
                : this.options.host;
            this.listeningAddress = { host, port: addressInfo.port };
        }
        this.isStarted = true;
        console.log(`WebSocket transport listening on ${this.options.host}:${this.options.port}`);
        console.log(`  Max clients: ${this.options.maxClients || 'unlimited'}`);
        console.log(`  Heartbeat: ${this.options.heartbeatInterval}ms`);
        console.log(`  Max message size: ${this.options.maxMessageSize} bytes`);
    }
    /**
     * Stop the WebSocket transport
     */
    async stop() {
        if (!this.isStarted || !this.wss) {
            return;
        }
        // Stop timers
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        // Close all client connections
        for (const [clientId, clientState] of this.clients.entries()) {
            if (clientState.heartbeatInterval) {
                clearInterval(clientState.heartbeatInterval);
            }
            clientState.ws.close(1000, 'Server shutting down');
            await this.emitDisconnect(clientId);
        }
        // Close server
        await new Promise((resolve, reject) => {
            this.wss.close((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        this.clients.clear();
        this.messageQuota.clear();
        this.isStarted = false;
        this.listeningAddress = null;
    }
    /**
     * Send message to specific client
     */
    async send(clientId, message) {
        if (!this.isStarted) {
            throw new Error('WebSocket transport is not started');
        }
        const clientState = this.clients.get(clientId);
        if (!clientState) {
            throw new Error(`Client not found: ${clientId}`);
        }
        const ws = clientState.ws;
        if (ws.readyState !== ws_1.WebSocket.OPEN) {
            throw new Error(`Client connection not open: ${clientId}`);
        }
        const messageStr = JSON.stringify(message);
        // Check backpressure
        if (this.options.enableBackpressure) {
            const bufferedAmount = ws.bufferedAmount;
            if (bufferedAmount > this.options.highWaterMark) {
                throw new Error(`Backpressure: client buffer full (${bufferedAmount} bytes)`);
            }
        }
        ws.send(messageStr, (error) => {
            if (error) {
                console.error(`Failed to send message to ${clientId}:`, error);
            }
        });
    }
    /**
     * Broadcast message to all connected clients
     */
    async broadcast(message) {
        if (!this.isStarted) {
            throw new Error('WebSocket transport is not started');
        }
        const messageStr = JSON.stringify(message);
        const promises = [];
        for (const [clientId, clientState] of this.clients.entries()) {
            if (clientState.ws.readyState === ws_1.WebSocket.OPEN) {
                promises.push(new Promise((resolve, reject) => {
                    // Skip if backpressure is too high
                    if (this.options.enableBackpressure) {
                        if (clientState.ws.bufferedAmount > this.options.highWaterMark) {
                            console.warn(`Skipping broadcast to ${clientId}: backpressure`);
                            resolve();
                            return;
                        }
                    }
                    clientState.ws.send(messageStr, (error) => {
                        if (error)
                            reject(error);
                        else
                            resolve();
                    });
                }));
            }
        }
        await Promise.allSettled(promises);
    }
    /**
     * Get count of connected clients
     */
    getClientCount() {
        return this.clients.size;
    }
    /**
     * Setup heartbeat for a specific client
     */
    setupClientHeartbeat(clientId, clientState) {
        clientState.heartbeatInterval = setInterval(() => {
            if (!clientState.isAlive) {
                console.log(`WebSocket client ${clientId} failed heartbeat, terminating`);
                clientState.ws.terminate();
                this.cleanupClient(clientId);
                return;
            }
            clientState.isAlive = false;
            clientState.ws.ping();
        }, this.options.heartbeatInterval);
    }
    /**
     * Start global heartbeat checker
     */
    startHeartbeatChecker() {
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();
            for (const [clientId, clientState] of this.clients.entries()) {
                const timeSinceActivity = now - clientState.lastActivity;
                // Check heartbeat timeout
                if (timeSinceActivity > this.options.heartbeatTimeout) {
                    console.log(`WebSocket client ${clientId} heartbeat timeout, closing`);
                    clientState.ws.close(1000, 'Heartbeat timeout');
                    this.cleanupClient(clientId);
                }
            }
        }, this.options.heartbeatInterval);
    }
    /**
     * Start idle connection checker
     */
    startIdleChecker() {
        setInterval(() => {
            const now = Date.now();
            for (const [clientId, clientState] of this.clients.entries()) {
                const idleTime = now - clientState.lastActivity;
                if (idleTime > this.options.idleTimeout) {
                    console.log(`WebSocket client ${clientId} idle for ${idleTime}ms, closing`);
                    clientState.ws.close(1000, 'Idle timeout');
                    this.cleanupClient(clientId);
                }
            }
        }, this.options.idleTimeout / 2); // Check at half the timeout interval
    }
    /**
     * Cleanup client resources
     */
    cleanupClient(clientId) {
        const clientState = this.clients.get(clientId);
        if (clientState) {
            if (clientState.heartbeatInterval) {
                clearInterval(clientState.heartbeatInterval);
            }
            this.clients.delete(clientId);
            this.emitDisconnect(clientId);
        }
        this.messageQuota.delete(clientId);
    }
    /**
     * Get transport metrics
     */
    getMetrics() {
        const now = Date.now();
        const clientMetrics = Array.from(this.clients.entries()).map(([id, state]) => ({
            id,
            isAlive: state.isAlive,
            idleTime: now - state.lastActivity,
            bufferedAmount: state.ws.bufferedAmount,
            readyState: state.ws.readyState,
        }));
        return {
            connectedClients: this.clients.size,
            maxClients: this.options.maxClients,
            clients: clientMetrics,
            rejectedAuth: this.metrics.rejectedAuth,
            rejectedQuota: this.metrics.rejectedQuota,
        };
    }
    getListeningAddress() {
        return this.listeningAddress;
    }
    authenticateConnection(request, ws) {
        if (!this.options.authToken) {
            return true;
        }
        const header = request.headers['authorization'];
        const expected = `Bearer ${this.options.authToken}`;
        if (header !== expected) {
            this.metrics.rejectedAuth++;
            ws.close(4401, 'Unauthorized');
            return false;
        }
        return true;
    }
    applyMessageQuota(clientId, ws) {
        if (!this.options.maxMessagesPerMinute || this.options.maxMessagesPerMinute <= 0) {
            return true;
        }
        const windowMs = 60_000;
        const now = Date.now();
        const record = this.messageQuota.get(clientId) ?? { windowStart: now, count: 0 };
        if (now - record.windowStart >= windowMs) {
            record.windowStart = now;
            record.count = 0;
        }
        record.count += 1;
        this.messageQuota.set(clientId, record);
        if (record.count > this.options.maxMessagesPerMinute) {
            this.metrics.rejectedQuota++;
            ws.send(JSON.stringify({
                type: 'error',
                error: {
                    code: -32003,
                    message: 'Message quota exceeded',
                    data: { maxMessagesPerMinute: this.options.maxMessagesPerMinute },
                },
            }));
            return false;
        }
        return true;
    }
}
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=websocket-transport.js.map