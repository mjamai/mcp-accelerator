import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';
interface SSETransportOptions {
    host?: string;
    port?: number;
    authToken?: string;
    maxRequestsPerMinute?: number;
}
/**
 * Server-Sent Events (SSE) transport for server-to-client streaming
 */
export declare class SSETransport extends BaseTransport {
    readonly name = "sse";
    private fastify?;
    private clients;
    private options;
    private requestCounters;
    private metrics;
    constructor(options?: SSETransportOptions);
    /**
     * Start the SSE transport
     */
    start(): Promise<void>;
    /**
     * Stop the SSE transport
     */
    stop(): Promise<void>;
    /**
     * Send message to specific client
     */
    send(clientId: string, message: MCPMessage): Promise<void>;
    /**
     * Broadcast message to all connected clients
     */
    broadcast(message: MCPMessage): Promise<void>;
    /**
     * Get count of connected clients
     */
    getClientCount(): number;
    private authenticateRequest;
    private applyQuota;
}
export {};
//# sourceMappingURL=sse-transport.d.ts.map