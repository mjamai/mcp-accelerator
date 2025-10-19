import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';
export interface WebSocketTransportOptions {
    host?: string;
    port?: number;
    /** Require Authorization header with Bearer token */
    authToken?: string;
    /** Maximum number of concurrent clients (default: 0 = unlimited) */
    maxClients?: number;
    /** Maximum message size in bytes (default: 1048576 = 1MB) */
    maxMessageSize?: number;
    /** Heartbeat interval in ms (default: 30000 = 30s) */
    heartbeatInterval?: number;
    /** Heartbeat timeout in ms (default: 60000 = 60s) */
    heartbeatTimeout?: number;
    /** Idle timeout in ms (default: 300000 = 5min) */
    idleTimeout?: number;
    /** Enable backpressure control (default: true) */
    enableBackpressure?: boolean;
    /** High water mark for buffered data in bytes (default: 16MB) */
    highWaterMark?: number;
    /** Max messages per second per client (default: 0 = unlimited) */
    maxMessagesPerSecond?: number;
    /** Max messages per minute per client (default: 0 = unlimited) */
    maxMessagesPerMinute?: number;
    /** Custom ws server configuration */
    wsOptions?: Record<string, unknown>;
}
/**
 * WebSocket transport with resilience features
 */
export declare class WebSocketTransport extends BaseTransport {
    readonly name = "websocket";
    private wss?;
    private clients;
    private options;
    private heartbeatTimer?;
    private listeningAddress;
    private messageQuota;
    private metrics;
    constructor(options?: WebSocketTransportOptions);
    /**
     * Start the WebSocket transport
     */
    start(): Promise<void>;
    /**
     * Stop the WebSocket transport
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
    /**
     * Setup heartbeat for a specific client
     */
    private setupClientHeartbeat;
    /**
     * Start global heartbeat checker
     */
    private startHeartbeatChecker;
    /**
     * Start idle connection checker
     */
    private startIdleChecker;
    /**
     * Cleanup client resources
     */
    private cleanupClient;
    /**
     * Get transport metrics
     */
    getMetrics(): {
        connectedClients: number;
        maxClients: number;
        clients: {
            id: string;
            isAlive: boolean;
            idleTime: number;
            bufferedAmount: number;
            readyState: 0 | 1 | 2 | 3;
        }[];
        rejectedAuth: number;
        rejectedQuota: number;
    };
    getListeningAddress(): {
        host: string;
        port: number;
    } | null;
    private authenticateConnection;
    private applyMessageQuota;
}
//# sourceMappingURL=websocket-transport.d.ts.map