"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpTransport = void 0;
const fastify_1 = __importDefault(require("fastify"));
const core_1 = require("@mcp-accelerator/core");
const crypto_1 = require("crypto");
/**
 * HTTP transport using Fastify with resilience features
 */
class HttpTransport extends core_1.BaseTransport {
    name = 'http';
    fastify;
    clients = new Map();
    clientMetadata = new Map();
    options;
    listeningAddress = null;
    requestCounters = new Map();
    metrics = {
        rejectedAuth: 0,
        rejectedQuota: 0,
    };
    // Concurrency control
    activeRequests = 0;
    requestQueue = [];
    // Circuit breaker state
    circuitState = 'closed';
    failureCount = 0;
    lastFailureTime = 0;
    successCount = 0;
    constructor(options = {}) {
        super();
        this.options = {
            host: options.host || '127.0.0.1',
            port: options.port ?? 3000,
            authToken: options.authToken ?? '',
            maxRequestsPerMinute: options.maxRequestsPerMinute ?? 0,
            enableCors: options.enableCors ?? false,
            corsOrigin: options.corsOrigin ?? '*',
            requestTimeout: options.requestTimeout ?? 30000,
            connectionTimeout: options.connectionTimeout ?? 5000,
            keepAliveTimeout: options.keepAliveTimeout ?? 72000,
            bodyLimit: options.bodyLimit ?? 1048576, // 1MB
            maxConcurrentRequests: options.maxConcurrentRequests ?? 0,
            maxQueueSize: options.maxQueueSize ?? 100,
            enableBackpressure: options.enableBackpressure ?? true,
            rejectOnBackpressure: options.rejectOnBackpressure ?? true,
            enableCircuitBreaker: options.enableCircuitBreaker ?? false,
            circuitBreakerThreshold: options.circuitBreakerThreshold ?? 5,
            circuitBreakerTimeout: options.circuitBreakerTimeout ?? 60000,
            fastifyOptions: options.fastifyOptions || {},
        };
    }
    /**
     * Start the HTTP transport
     */
    async start() {
        if (this.isStarted) {
            throw new Error('HTTP transport is already started');
        }
        this.fastify = (0, fastify_1.default)({
            logger: false,
            requestTimeout: this.options.requestTimeout,
            connectionTimeout: this.options.connectionTimeout,
            keepAliveTimeout: this.options.keepAliveTimeout,
            bodyLimit: this.options.bodyLimit,
            // Allow graceful shutdown
            pluginTimeout: 10000,
            ...this.options.fastifyOptions,
        });
        // Add CORS headers manually if enabled
        if (this.options.enableCors) {
            this.fastify.addHook('onRequest', async (request, reply) => {
                const origin = request.headers.origin;
                const allowedOrigins = Array.isArray(this.options.corsOrigin)
                    ? this.options.corsOrigin
                    : [this.options.corsOrigin];
                // Check if origin is allowed
                if (this.options.corsOrigin === '*' ||
                    (origin && allowedOrigins.includes(origin))) {
                    reply.header('Access-Control-Allow-Origin', origin || '*');
                }
                reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, x-client-id');
                reply.header('Access-Control-Allow-Credentials', 'true');
                reply.header('Access-Control-Max-Age', '86400'); // 24 hours
            });
            // Handle preflight requests
            this.fastify.options('/*', async (request, reply) => {
                reply.status(200);
                return '';
            });
        }
        // Add request tracking hook
        this.fastify.addHook('onRequest', async (request, reply) => {
            if (!this.authenticateRequest(request, reply)) {
                return;
            }
            if (!this.applyQuota(request, reply)) {
                return;
            }
            // Check circuit breaker
            if (this.options.enableCircuitBreaker) {
                const circuitStatus = this.checkCircuitBreaker();
                if (circuitStatus === 'open') {
                    reply.code(503).send({
                        error: 'Service temporarily unavailable',
                        code: 'CIRCUIT_BREAKER_OPEN',
                        retryAfter: Math.ceil((this.lastFailureTime + this.options.circuitBreakerTimeout - Date.now()) / 1000),
                    });
                    return;
                }
            }
            // Check backpressure
            if (this.options.enableBackpressure && this.options.maxConcurrentRequests > 0) {
                if (this.activeRequests >= this.options.maxConcurrentRequests) {
                    if (this.requestQueue.length >= this.options.maxQueueSize) {
                        if (this.options.rejectOnBackpressure) {
                            reply.code(503).send({
                                error: 'Server overloaded',
                                code: 'BACKPRESSURE',
                                activeRequests: this.activeRequests,
                                queueSize: this.requestQueue.length,
                            });
                            return;
                        }
                    }
                    // Wait in queue
                    await new Promise((resolve) => {
                        this.requestQueue.push(resolve);
                    });
                }
                this.activeRequests++;
            }
        });
        // Track request completion
        this.fastify.addHook('onResponse', async (request, reply) => {
            if (this.options.enableBackpressure && this.options.maxConcurrentRequests > 0) {
                this.activeRequests--;
                // Process next request in queue
                const next = this.requestQueue.shift();
                if (next) {
                    next();
                }
            }
            // Update circuit breaker
            if (this.options.enableCircuitBreaker) {
                const statusCode = reply.statusCode;
                if (statusCode >= 500) {
                    this.recordFailure();
                }
                else {
                    this.recordSuccess();
                }
            }
        });
        // Track errors
        this.fastify.addHook('onError', async (request, reply, error) => {
            console.error('HTTP transport error:', error);
            if (this.options.enableCircuitBreaker) {
                this.recordFailure();
            }
            if (this.options.enableBackpressure && this.options.maxConcurrentRequests > 0) {
                this.activeRequests--;
                const next = this.requestQueue.shift();
                if (next)
                    next();
            }
        });
        // POST endpoint for sending messages
        this.fastify.post('/mcp', async (request, reply) => {
            try {
                const message = request.body;
                const clientId = request.headers['x-client-id'] || (0, crypto_1.randomUUID)();
                // Store client for response
                this.clients.set(clientId, reply);
                // Add metadata from headers
                const metadata = {
                    ip: request.ip,
                    userAgent: request.headers['user-agent'],
                    ...Object.fromEntries(Object.entries(request.headers).filter(([key]) => key.startsWith('x-') || key === 'authorization')),
                };
                // Store metadata for this client
                this.clientMetadata.set(clientId, metadata);
                // Emit message with timeout
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), this.options.requestTimeout);
                });
                await Promise.race([
                    this.emitMessage(clientId, message),
                    timeoutPromise,
                ]);
                // Note: Response will be sent via send() method
            }
            catch (error) {
                const statusCode = error instanceof Error && error.message === 'Request timeout' ? 408 : 400;
                reply.status(statusCode).send({
                    error: error instanceof Error ? error.message : 'Invalid message format',
                    code: statusCode === 408 ? 'REQUEST_TIMEOUT' : 'INVALID_MESSAGE',
                });
            }
        });
        // Health check endpoint
        this.fastify.get('/health', async () => {
            return {
                status: 'ok',
                transport: 'http',
                activeRequests: this.activeRequests,
                queueSize: this.requestQueue.length,
                circuitState: this.options.enableCircuitBreaker ? this.circuitState : 'disabled',
            };
        });
        // Metrics endpoint
        this.fastify.get('/metrics', async () => {
            return {
                activeRequests: this.activeRequests,
                queueSize: this.requestQueue.length,
                connectedClients: this.clients.size,
                circuitBreaker: this.options.enableCircuitBreaker ? {
                    state: this.circuitState,
                    failures: this.failureCount,
                    successes: this.successCount,
                } : null,
            };
        });
        await this.fastify.listen({
            host: this.options.host,
            port: this.options.port,
        });
        const addressInfo = this.fastify.server.address();
        if (addressInfo && typeof addressInfo.port === 'number') {
            const host = addressInfo.address && addressInfo.address !== '::'
                ? addressInfo.address
                : this.options.host;
            this.listeningAddress = { host, port: addressInfo.port };
        }
        this.isStarted = true;
        console.log(`HTTP transport listening on ${this.options.host}:${this.options.port}`);
        console.log(`  Request timeout: ${this.options.requestTimeout}ms`);
        console.log(`  Max concurrent: ${this.options.maxConcurrentRequests || 'unlimited'}`);
        console.log(`  Circuit breaker: ${this.options.enableCircuitBreaker ? 'enabled' : 'disabled'}`);
    }
    /**
     * Stop the HTTP transport
     */
    async stop() {
        if (!this.isStarted || !this.fastify) {
            return;
        }
        // Drain queue
        this.requestQueue.forEach(resolve => resolve());
        this.requestQueue = [];
        await this.fastify.close();
        this.clients.clear();
        this.listeningAddress = null;
        this.isStarted = false;
    }
    /**
     * Send message to client
     */
    async send(clientId, message) {
        if (!this.isStarted) {
            throw new Error('HTTP transport is not started');
        }
        const reply = this.clients.get(clientId);
        if (!reply) {
            throw new Error(`Client not found: ${clientId}`);
        }
        reply.header('Content-Type', 'application/json');
        await reply.send(message);
        this.clients.delete(clientId);
    }
    /**
     * Broadcast not supported in HTTP transport (stateless)
     */
    async broadcast(_message) {
        throw new Error('Broadcast not supported in HTTP transport');
    }
    /**
     * Check circuit breaker state
     */
    checkCircuitBreaker() {
        if (!this.options.enableCircuitBreaker) {
            return 'closed';
        }
        const now = Date.now();
        // Transition from open to half-open after timeout
        if (this.circuitState === 'open') {
            if (now - this.lastFailureTime >= this.options.circuitBreakerTimeout) {
                this.circuitState = 'half-open';
                this.successCount = 0;
            }
        }
        return this.circuitState;
    }
    /**
     * Record a failure for circuit breaker
     */
    recordFailure() {
        if (!this.options.enableCircuitBreaker)
            return;
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.circuitState === 'half-open') {
            // Immediately open on failure in half-open state
            this.circuitState = 'open';
            this.successCount = 0;
        }
        else if (this.failureCount >= this.options.circuitBreakerThreshold) {
            this.circuitState = 'open';
            console.warn(`Circuit breaker opened after ${this.failureCount} failures`);
        }
    }
    /**
     * Record a success for circuit breaker
     */
    recordSuccess() {
        if (!this.options.enableCircuitBreaker)
            return;
        if (this.circuitState === 'half-open') {
            this.successCount++;
            // Close circuit after 3 consecutive successes
            if (this.successCount >= 3) {
                this.circuitState = 'closed';
                this.failureCount = 0;
                this.successCount = 0;
                console.log('Circuit breaker closed after successful requests');
            }
        }
        else if (this.circuitState === 'closed') {
            // Reset failure count on success
            this.failureCount = Math.max(0, this.failureCount - 1);
        }
    }
    /**
     * Get current transport metrics
     */
    getMetrics() {
        return {
            activeRequests: this.activeRequests,
            queueSize: this.requestQueue.length,
            connectedClients: this.clients.size,
            rejectedAuth: this.metrics.rejectedAuth,
            rejectedQuota: this.metrics.rejectedQuota,
            circuitBreaker: this.options.enableCircuitBreaker ? {
                state: this.circuitState,
                failures: this.failureCount,
                successes: this.successCount,
            } : null,
        };
    }
    getListeningAddress() {
        return this.listeningAddress;
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
    /**
     * Get metadata for a client
     */
    getClientMetadata(clientId) {
        return this.clientMetadata.get(clientId) || {};
    }
}
exports.HttpTransport = HttpTransport;
//# sourceMappingURL=http-transport.js.map