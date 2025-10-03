import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MCPMessage } from '../types';
import { BaseTransport } from './base-transport';
import { randomUUID } from 'crypto';

interface HttpTransportOptions {
  host?: string;
  port?: number;
}

/**
 * HTTP transport using Fastify
 */
export class HttpTransport extends BaseTransport {
  public readonly name = 'http';
  private fastify?: FastifyInstance;
  private clients: Map<string, FastifyReply> = new Map();
  private options: HttpTransportOptions;

  constructor(options: HttpTransportOptions = {}) {
    super();
    this.options = {
      host: options.host || '127.0.0.1',
      port: options.port || 3000,
    };
  }

  /**
   * Start the HTTP transport
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('HTTP transport is already started');
    }

    this.fastify = Fastify({
      logger: false,
    });

    // POST endpoint for sending messages
    this.fastify.post('/mcp', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const message = request.body as MCPMessage;
        const clientId = (request.headers['x-client-id'] as string) || randomUUID();

        // Store client for response
        this.clients.set(clientId, reply);

        // Emit message
        await this.emitMessage(clientId, message);

        // Note: Response will be sent via send() method
      } catch (error) {
        reply.status(400).send({
          error: 'Invalid message format',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Health check endpoint
    this.fastify.get('/health', async () => {
      return { status: 'ok', transport: 'http' };
    });

    await this.fastify.listen({
      host: this.options.host,
      port: this.options.port,
    });

    this.isStarted = true;
    console.log(`HTTP transport listening on ${this.options.host}:${this.options.port}`);
  }

  /**
   * Stop the HTTP transport
   */
  async stop(): Promise<void> {
    if (!this.isStarted || !this.fastify) {
      return;
    }

    await this.fastify.close();
    this.clients.clear();
    this.isStarted = false;
  }

  /**
   * Send message to client
   */
  async send(clientId: string, message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('HTTP transport is not started');
    }

    const reply = this.clients.get(clientId);
    if (!reply) {
      throw new Error(`Client not found: ${clientId}`);
    }

    await reply.send(message);
    this.clients.delete(clientId);
  }

  /**
   * Broadcast not supported in HTTP transport (stateless)
   */
  async broadcast(_message: MCPMessage): Promise<void> {
    throw new Error('Broadcast not supported in HTTP transport');
  }
}

