import { WebSocketServer, WebSocket } from 'ws';
import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

interface WebSocketTransportOptions {
  host?: string;
  port?: number;
}

/**
 * WebSocket transport for real-time bidirectional communication
 */
export class WebSocketTransport extends BaseTransport {
  public readonly name = 'websocket';
  private wss?: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private options: WebSocketTransportOptions;

  constructor(options: WebSocketTransportOptions = {}) {
    super();
    this.options = {
      host: options.host || '127.0.0.1',
      port: options.port || 3001,
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
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      const clientId = randomUUID();
      this.clients.set(clientId, ws);

      console.log(`WebSocket client connected: ${clientId}`);
      this.emitConnect(clientId);

      // Handle messages
      ws.on('message', async (data) => {
        try {
          const message: MCPMessage = JSON.parse(data.toString());
          await this.emitMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: {
              code: -32700,
              message: 'Parse error',
            },
          }));
        }
      });

      // Handle close
      ws.on('close', () => {
        this.clients.delete(clientId);
        this.emitDisconnect(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
        this.emitDisconnect(clientId);
      });
    });

    this.isStarted = true;
    console.log(`WebSocket transport listening on ${this.options.host}:${this.options.port}`);
  }

  /**
   * Stop the WebSocket transport
   */
  async stop(): Promise<void> {
    if (!this.isStarted || !this.wss) {
      return;
    }

    // Close all client connections
    for (const [clientId, ws] of this.clients.entries()) {
      ws.close();
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
    this.isStarted = false;
  }

  /**
   * Send message to specific client
   */
  async send(clientId: string, message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('WebSocket transport is not started');
    }

    const ws = this.clients.get(clientId);
    if (!ws) {
      throw new Error(`Client not found: ${clientId}`);
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      throw new Error(`Client connection not open: ${clientId}`);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  async broadcast(message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('WebSocket transport is not started');
    }

    const messageStr = JSON.stringify(message);
    
    for (const [clientId, ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }

  /**
   * Get count of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

