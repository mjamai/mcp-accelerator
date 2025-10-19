import { Transport, MessageHandler, ConnectHandler, DisconnectHandler, MCPMessage } from '../types';
/**
 * Abstract base class for transports providing common functionality
 */
export declare abstract class BaseTransport implements Transport {
    abstract readonly name: string;
    protected messageHandlers: MessageHandler[];
    protected connectHandlers: ConnectHandler[];
    protected disconnectHandlers: DisconnectHandler[];
    protected isStarted: boolean;
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    abstract send(clientId: string, message: MCPMessage): Promise<void>;
    abstract broadcast(message: MCPMessage): Promise<void>;
    /**
     * Register message handler
     */
    onMessage(handler: MessageHandler): void;
    /**
     * Register connect handler
     */
    onConnect(handler: ConnectHandler): void;
    /**
     * Register disconnect handler
     */
    onDisconnect(handler: DisconnectHandler): void;
    /**
     * Emit message event to all handlers
     */
    protected emitMessage(clientId: string, message: MCPMessage): Promise<void>;
    /**
     * Emit connect event to all handlers
     */
    protected emitConnect(clientId: string): Promise<void>;
    /**
     * Emit disconnect event to all handlers
     */
    protected emitDisconnect(clientId: string): Promise<void>;
    /**
     * Check if transport is started
     */
    getIsStarted(): boolean;
}
//# sourceMappingURL=base-transport.d.ts.map