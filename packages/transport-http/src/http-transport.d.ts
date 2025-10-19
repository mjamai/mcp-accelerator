import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';
export interface HttpTransportOptions {
    host?: string;
    port?: number;
    /** Require Authorization header with Bearer token */
    authToken?: string;
    /** Maximum requests per minute per client (0 = unlimited) */
    maxRequestsPerMinute?: number;
    /** Enable CORS support (default: false) */
    enableCors?: boolean;
    /** CORS origin (default: '*' for all origins) */
    corsOrigin?: string | string[];
    /** Request timeout in milliseconds (default: 30000 = 30s) */
    requestTimeout?: number;
    /** Connection timeout in milliseconds (default: 5000 = 5s) */
    connectionTimeout?: number;
    /** Keep-alive timeout in milliseconds (default: 72000 = 72s) */
    keepAliveTimeout?: number;
    /** Maximum body size in bytes (default: 1048576 = 1MB) */
    bodyLimit?: number;
    /** Maximum concurrent requests (default: 0 = unlimited) */
    maxConcurrentRequests?: number;
    /** Maximum pending requests in queue (default: 100) */
    maxQueueSize?: number;
    /** Enable backpressure protection (default: true) */
    enableBackpressure?: boolean;
    /** Reject requests when queue is full (default: true) */
    rejectOnBackpressure?: boolean;
    /** Enable circuit breaker (default: false) */
    enableCircuitBreaker?: boolean;
    /** Circuit breaker failure threshold (default: 5) */
    circuitBreakerThreshold?: number;
    /** Circuit breaker timeout in ms (default: 60000 = 1min) */
    circuitBreakerTimeout?: number;
    /** Custom Fastify configuration */
    fastifyOptions?: Record<string, unknown>;
}
/**
 * HTTP transport using Fastify with resilience features
 */
export declare class HttpTransport extends BaseTransport {
    readonly name = "http";
    private fastify?;
    private clients;
    private clientMetadata;
    private options;
    private listeningAddress;
    private requestCounters;
    private metrics;
    private activeRequests;
    private requestQueue;
    private circuitState;
    private failureCount;
    private lastFailureTime;
    private successCount;
    constructor(options?: HttpTransportOptions);
    /**
     * Start the HTTP transport
     */
    start(): Promise<void>;
    /**
     * Stop the HTTP transport
     */
    stop(): Promise<void>;
    /**
     * Send message to client
     */
    send(clientId: string, message: MCPMessage): Promise<void>;
    /**
     * Broadcast not supported in HTTP transport (stateless)
     */
    broadcast(_message: MCPMessage): Promise<void>;
    /**
     * Check circuit breaker state
     */
    private checkCircuitBreaker;
    /**
     * Record a failure for circuit breaker
     */
    private recordFailure;
    /**
     * Record a success for circuit breaker
     */
    private recordSuccess;
    /**
     * Get current transport metrics
     */
    getMetrics(): {
        activeRequests: number;
        queueSize: number;
        connectedClients: number;
        rejectedAuth: number;
        rejectedQuota: number;
        circuitBreaker: {
            state: "closed" | "open" | "half-open";
            failures: number;
            successes: number;
        } | null;
    };
    getListeningAddress(): {
        host: string;
        port: number;
    } | null;
    private authenticateRequest;
    private applyQuota;
    /**
     * Get metadata for a client
     */
    getClientMetadata(clientId: string): Record<string, unknown>;
}
//# sourceMappingURL=http-transport.d.ts.map