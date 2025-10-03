import { Transport, MessageHandler, ConnectHandler, DisconnectHandler, MCPMessage } from '../types';

/**
 * Abstract base class for transports providing common functionality
 */
export abstract class BaseTransport implements Transport {
  public abstract readonly name: string;
  
  protected messageHandlers: MessageHandler[] = [];
  protected connectHandlers: ConnectHandler[] = [];
  protected disconnectHandlers: DisconnectHandler[] = [];
  protected isStarted = false;

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract send(clientId: string, message: MCPMessage): Promise<void>;
  abstract broadcast(message: MCPMessage): Promise<void>;

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Register connect handler
   */
  onConnect(handler: ConnectHandler): void {
    this.connectHandlers.push(handler);
  }

  /**
   * Register disconnect handler
   */
  onDisconnect(handler: DisconnectHandler): void {
    this.disconnectHandlers.push(handler);
  }

  /**
   * Emit message event to all handlers
   */
  protected async emitMessage(clientId: string, message: MCPMessage): Promise<void> {
    for (const handler of this.messageHandlers) {
      await handler(clientId, message);
    }
  }

  /**
   * Emit connect event to all handlers
   */
  protected async emitConnect(clientId: string): Promise<void> {
    for (const handler of this.connectHandlers) {
      await handler(clientId);
    }
  }

  /**
   * Emit disconnect event to all handlers
   */
  protected async emitDisconnect(clientId: string): Promise<void> {
    for (const handler of this.disconnectHandlers) {
      await handler(clientId);
    }
  }

  /**
   * Check if transport is started
   */
  getIsStarted(): boolean {
    return this.isStarted;
  }
}

