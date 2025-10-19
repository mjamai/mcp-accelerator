import { WebSocketServer, WebSocket, RawData } from 'ws';
import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { AddressInfo } from 'net';

export interface WebSocketTransportOptions {
  host?: string;
  port?: number;
  /** Require Authorization header with Bearer token */
  authToken?: string;
  
  // Connection limits
  /** Maximum number of concurrent clients (default: 0 = unlimited) */
  maxClients?: number;
  /** Maximum message size in bytes (default: 1048576 = 1MB) */
  maxMessageSize?: number;
  
  // Timeouts
  /** Heartbeat interval in ms (default: 30000 = 30s) */
  heartbeatInterval?: number;
  /** Heartbeat timeout in ms (default: 60000 = 60s) */
  heartbeatTimeout?: number;
  /** Idle timeout in ms (default: 300000 = 5min) */
  idleTimeout?: number;
  
  // Backpressure
  /** Enable backpressure control (default: true) */
  enableBackpressure?: boolean;
  /** High water mark for buffered data in bytes (default: 16MB) */
  highWaterMark?: number;
  
  // Rate limiting per client
  /** Max messages per second per client (default: 0 = unlimited) */
  maxMessagesPerSecond?: number;
  /** Max messages per minute per client (default: 0 = unlimited) */
  maxMessagesPerMinute?: number;
  
  // Custom WebSocket server options
  /** Custom ws server configuration */
  wsOptions?: Record<string, unknown>;
}

interface ClientState {
  ws: WebSocket;
  isAlive: boolean;
  lastActivity: number;
  messageCount: number;
  lastMessageTime: number;
  heartbeatInterval?: NodeJS.Timeout;
}

/**
 * WebSocket transport with resilience features
 */
export class WebSocketTransport extends BaseTransport {
  public readonly name = 'websocket';
  private wss?: WebSocketServer;
  private clients: Map<string, ClientState> = new Map();
  private options: Required<WebSocketTransportOptions>;
  private heartbeatTimer?: NodeJS.Timeout;
  private listeningAddress: { host: string; port: number } | null = null;
  private messageQuota: Map<string, { windowStart: number; count: number }> = new Map();
  private metrics = {
    rejectedAuth: 0,
    rejectedQuota: 0,
  };

  constructor(options: WebSocketTransportOptions = {}) {
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
  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('WebSocket transport is already started');
    }

    this.wss = new WebSocketServer({
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

    await new Promise<void>((resolve, reject) => {
      this.wss!.once('listening', () => resolve());
      this.wss!.once('error', (error) => reject(error));
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      // Check max clients limit
      if (this.options.maxClients > 0 && this.clients.size >= this.options.maxClients) {
        ws.close(1008, 'Server at capacity');
        return;
      }

      const clientId = randomUUID();
      const clientState: ClientState = {
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
      ws.on('message', async (data: RawData) => {
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
            } else {
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
          const message: MCPMessage = JSON.parse(dataStr);
          await this.emitMessage(clientId, message);
        } catch (error) {
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

    const addressInfo = this.wss.address() as AddressInfo;
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
  async stop(): Promise<void> {
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
    await new Promise<void>((resolve, reject) => {
      this.wss!.close((err) => {
        if (err) reject(err);
        else resolve();
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
  async send(clientId: string, message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('WebSocket transport is not started');
    }

    const clientState = this.clients.get(clientId);
    if (!clientState) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const ws = clientState.ws;
    if (ws.readyState !== WebSocket.OPEN) {
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
  async broadcast(message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('WebSocket transport is not started');
    }

    const messageStr = JSON.stringify(message);
    const promises: Promise<void>[] = [];

    for (const [clientId, clientState] of this.clients.entries()) {
      if (clientState.ws.readyState === WebSocket.OPEN) {
        promises.push(
          new Promise((resolve, reject) => {
            // Skip if backpressure is too high
            if (this.options.enableBackpressure) {
              if (clientState.ws.bufferedAmount > this.options.highWaterMark) {
                console.warn(`Skipping broadcast to ${clientId}: backpressure`);
                resolve();
                return;
              }
            }

            clientState.ws.send(messageStr, (error) => {
              if (error) reject(error);
              else resolve();
            });
          })
        );
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Get count of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Setup heartbeat for a specific client
   */
  private setupClientHeartbeat(clientId: string, clientState: ClientState): void {
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
  private startHeartbeatChecker(): void {
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
  private startIdleChecker(): void {
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
  private cleanupClient(clientId: string): void {
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

  getListeningAddress(): { host: string; port: number } | null {
    return this.listeningAddress;
  }

  private authenticateConnection(request: IncomingMessage, ws: WebSocket): boolean {
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

  private applyMessageQuota(clientId: string, ws: WebSocket): boolean {
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
      ws.send(
        JSON.stringify({
          type: 'error',
          error: {
            code: -32003,
            message: 'Message quota exceeded',
            data: { maxMessagesPerMinute: this.options.maxMessagesPerMinute },
          },
        }),
      );
      return false;
    }

    return true;
  }
}
