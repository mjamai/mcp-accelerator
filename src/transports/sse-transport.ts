import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MCPMessage } from '../types';
import { BaseTransport } from './base-transport';
import { randomUUID } from 'crypto';

interface SSETransportOptions {
  host?: string;
  port?: number;
}

interface SSEClient {
  id: string;
  reply: FastifyReply;
}

/**
 * Server-Sent Events (SSE) transport for server-to-client streaming
 */
export class SSETransport extends BaseTransport {
  public readonly name = 'sse';
  private fastify?: FastifyInstance;
  private clients: Map<string, SSEClient> = new Map();
  private options: SSETransportOptions;

  constructor(options: SSETransportOptions = {}) {
    super();
    this.options = {
      host: options.host || '127.0.0.1',
      port: options.port || 3002,
    };
  }

  /**
   * Start the SSE transport
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('SSE transport is already started');
    }

    this.fastify = Fastify({
      logger: false,
    });

    // SSE endpoint for establishing connection
    this.fastify.get('/mcp/events', async (request: FastifyRequest, reply: FastifyReply) => {
      const clientId = randomUUID();

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
        } else {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      request.raw.on('close', () => {
        clearInterval(keepAliveInterval);
      });
    });

    // POST endpoint for receiving messages from client
    this.fastify.post('/mcp/message', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const clientId = request.headers['x-client-id'] as string;
        if (!clientId || !this.clients.has(clientId)) {
          return reply.status(404).send({ error: 'Client not found' });
        }

        const message = request.body as MCPMessage;
        await this.emitMessage(clientId, message);

        return reply.send({ status: 'ok' });
      } catch (error) {
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
  async stop(): Promise<void> {
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
    this.isStarted = false;
  }

  /**
   * Send message to specific client
   */
  async send(clientId: string, message: MCPMessage): Promise<void> {
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
    } else {
      throw new Error(`Client connection not writable: ${clientId}`);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  async broadcast(message: MCPMessage): Promise<void> {
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
  getClientCount(): number {
    return this.clients.size;
  }
}

