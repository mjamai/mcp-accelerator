import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';

import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';

interface SSETransportOptions {
  host?: string;
  port?: number;
  authToken?: string;
  maxRequestsPerMinute?: number;
}

interface SSEClient {
  id: string;
  reply: FastifyReply;
}

const CORS_ALLOW_HEADERS =
  'content-type, authorization, x-auth-token, x-client-id, mcp-session-id';

/**
 * Server-Sent Events (SSE) transport for server-to-client streaming
 */
export class SSETransport extends BaseTransport {
  public readonly name = 'sse';
  private fastify?: FastifyInstance;
  private clients: Map<string, SSEClient> = new Map();
  private options: SSETransportOptions;
  private requestCounters: Map<string, { windowStart: number; count: number }> = new Map();
  private metrics = {
    rejectedAuth: 0,
    rejectedQuota: 0,
  };

  constructor(options: SSETransportOptions = {}) {
    super();
    this.options = {
      host: options.host || '127.0.0.1',
      port: options.port ?? 3002,
      authToken: options.authToken ?? '',
      maxRequestsPerMinute: options.maxRequestsPerMinute ?? 0,
    };
  }

  /**
   * Start the SSE transport
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('SSE transport is already started');
    }

    this.fastify = Fastify({ logger: false });

    this.fastify.addHook('onRequest', (request, reply, done) => {
      const origin = request.headers.origin ?? '*';
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Credentials', 'true');
      done();
    });

    this.fastify.options('/mcp/events', async (request, reply) => {
      reply
        .header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        .header('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS)
        .status(204)
        .send();
    });

    this.fastify.options('/mcp/message', async (request, reply) => {
      reply
        .header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        .header('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS)
        .status(204)
        .send();
    });

    // SSE endpoint for establishing connection
    this.fastify.get('/mcp/events', async (request: FastifyRequest, reply: FastifyReply) => {
      if (!this.authenticateRequest(request, reply)) {
        return;
      }

      const clientId = randomUUID();

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': request.headers.origin ?? '*',
        'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
        'Access-Control-Allow-Credentials': 'true',
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
      if (!this.authenticateRequest(request, reply)) {
        return;
      }

      if (!this.applyQuota(request, reply)) {
        return;
      }

      try {
        const clientId = request.headers['x-client-id'] as string;
        if (!clientId || !this.clients.has(clientId)) {
          return reply.status(404).send({ error: 'Client not found' });
        }

        const message = request.body as MCPMessage;
        await this.emitMessage(clientId, message);

        return reply
          .header('Access-Control-Allow-Origin', request.headers.origin ?? '*')
          .header('Access-Control-Allow-Credentials', 'true')
          .send({ status: 'ok' });
      } catch (error) {
        return reply
          .header('Access-Control-Allow-Origin', request.headers.origin ?? '*')
          .header('Access-Control-Allow-Credentials', 'true')
          .status(400)
          .send({
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
    this.fastify.get('/metrics', async () => ({
      connectedClients: this.clients.size,
      rejectedAuth: this.metrics.rejectedAuth,
      rejectedQuota: this.metrics.rejectedQuota,
      requestCounters: this.requestCounters.size,
    }));

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
    this.requestCounters.clear();
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

  private authenticateRequest(request: FastifyRequest, reply: FastifyReply): boolean {
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

  private applyQuota(request: FastifyRequest, reply: FastifyReply): boolean {
    if (!this.options.maxRequestsPerMinute || this.options.maxRequestsPerMinute <= 0) {
      return true;
    }

    const clientKey =
      (request.headers['x-client-id'] as string) ||
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
}
