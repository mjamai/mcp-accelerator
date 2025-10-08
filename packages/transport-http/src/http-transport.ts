import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';
import { randomUUID } from 'crypto';

export interface HttpTransportOptions {
  host?: string;
  port?: number;
  
  // Timeouts
  /** Request timeout in milliseconds (default: 30000 = 30s) */
  requestTimeout?: number;
  /** Connection timeout in milliseconds (default: 5000 = 5s) */
  connectionTimeout?: number;
  /** Keep-alive timeout in milliseconds (default: 72000 = 72s) */
  keepAliveTimeout?: number;
  
  // Limits
  /** Maximum body size in bytes (default: 1048576 = 1MB) */
  bodyLimit?: number;
  /** Maximum concurrent requests (default: 0 = unlimited) */
  maxConcurrentRequests?: number;
  /** Maximum pending requests in queue (default: 100) */
  maxQueueSize?: number;
  
  // Backpressure
  /** Enable backpressure protection (default: true) */
  enableBackpressure?: boolean;
  /** Reject requests when queue is full (default: true) */
  rejectOnBackpressure?: boolean;
  
  // Circuit Breaker
  /** Enable circuit breaker (default: false) */
  enableCircuitBreaker?: boolean;
  /** Circuit breaker failure threshold (default: 5) */
  circuitBreakerThreshold?: number;
  /** Circuit breaker timeout in ms (default: 60000 = 1min) */
  circuitBreakerTimeout?: number;
  
  // Custom Fastify options
  /** Custom Fastify configuration */
  fastifyOptions?: Record<string, unknown>;
}

/**
 * HTTP transport using Fastify with resilience features
 */
export class HttpTransport extends BaseTransport {
  public readonly name = 'http';
  private fastify?: FastifyInstance;
  private clients: Map<string, FastifyReply> = new Map();
  private options: Required<HttpTransportOptions>;
  
  // Concurrency control
  private activeRequests = 0;
  private requestQueue: Array<() => void> = [];
  
  // Circuit breaker state
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(options: HttpTransportOptions = {}) {
    super();
    this.options = {
      host: options.host || '127.0.0.1',
      port: options.port || 3000,
      requestTimeout: options.requestTimeout ?? 30000,
      connectionTimeout: options.connectionTimeout ?? 5000,
      keepAliveTimeout: options.keepAliveTimeout ?? 72000,
      bodyLimit: options.bodyLimit ?? 1048576, // 1MB
      maxConcurrentRequests: options.maxConcurrentRequests ?? 0,
      maxQueueSize: options.maxQueueSize ?? 100,
      enableBackpressure: options.enableBackpressure ?? true,
      rejectOnBackpressure: options.rejectOnBackpressure ?? true,
      enableCircuitBreaker: options.enableCircuitBreaker ?? false,
      circuitBreakerThreshold: options.circuitBreakerThreshold ?? 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout ?? 60000,
      fastifyOptions: options.fastifyOptions || {},
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
      requestTimeout: this.options.requestTimeout,
      connectionTimeout: this.options.connectionTimeout,
      keepAliveTimeout: this.options.keepAliveTimeout,
      bodyLimit: this.options.bodyLimit,
      // Allow graceful shutdown
      pluginTimeout: 10000,
      ...this.options.fastifyOptions,
    });

    // Add request tracking hook
    this.fastify.addHook('onRequest', async (request, reply) => {
      // Check circuit breaker
      if (this.options.enableCircuitBreaker) {
        const circuitStatus = this.checkCircuitBreaker();
        if (circuitStatus === 'open') {
          reply.code(503).send({
            error: 'Service temporarily unavailable',
            code: 'CIRCUIT_BREAKER_OPEN',
            retryAfter: Math.ceil((this.lastFailureTime + this.options.circuitBreakerTimeout - Date.now()) / 1000),
          });
          return;
        }
      }

      // Check backpressure
      if (this.options.enableBackpressure && this.options.maxConcurrentRequests > 0) {
        if (this.activeRequests >= this.options.maxConcurrentRequests) {
          if (this.requestQueue.length >= this.options.maxQueueSize) {
            if (this.options.rejectOnBackpressure) {
              reply.code(503).send({
                error: 'Server overloaded',
                code: 'BACKPRESSURE',
                activeRequests: this.activeRequests,
                queueSize: this.requestQueue.length,
              });
              return;
            }
          }
          
          // Wait in queue
          await new Promise<void>((resolve) => {
            this.requestQueue.push(resolve);
          });
        }
        
        this.activeRequests++;
      }
    });

    // Track request completion
    this.fastify.addHook('onResponse', async (request, reply) => {
      if (this.options.enableBackpressure && this.options.maxConcurrentRequests > 0) {
        this.activeRequests--;
        
        // Process next request in queue
        const next = this.requestQueue.shift();
        if (next) {
          next();
        }
      }

      // Update circuit breaker
      if (this.options.enableCircuitBreaker) {
        const statusCode = reply.statusCode;
        if (statusCode >= 500) {
          this.recordFailure();
        } else {
          this.recordSuccess();
        }
      }
    });

    // Track errors
    this.fastify.addHook('onError', async (request, reply, error) => {
      console.error('HTTP transport error:', error);
      
      if (this.options.enableCircuitBreaker) {
        this.recordFailure();
      }
      
      if (this.options.enableBackpressure && this.options.maxConcurrentRequests > 0) {
        this.activeRequests--;
        const next = this.requestQueue.shift();
        if (next) next();
      }
    });

    // POST endpoint for sending messages
    this.fastify.post('/mcp', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const message = request.body as MCPMessage;
        const clientId = (request.headers['x-client-id'] as string) || randomUUID();

        // Store client for response
        this.clients.set(clientId, reply);

        // Add metadata from headers
        const metadata: Record<string, unknown> = {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          ...Object.fromEntries(
            Object.entries(request.headers).filter(([key]) => 
              key.startsWith('x-') || key === 'authorization'
            )
          ),
        };

        // Emit message with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.options.requestTimeout);
        });

        await Promise.race([
          this.emitMessage(clientId, message),
          timeoutPromise,
        ]);

        // Note: Response will be sent via send() method
      } catch (error) {
        const statusCode = error instanceof Error && error.message === 'Request timeout' ? 408 : 400;
        reply.status(statusCode).send({
          error: error instanceof Error ? error.message : 'Invalid message format',
          code: statusCode === 408 ? 'REQUEST_TIMEOUT' : 'INVALID_MESSAGE',
        });
      }
    });

    // Health check endpoint
    this.fastify.get('/health', async () => {
      return {
        status: 'ok',
        transport: 'http',
        activeRequests: this.activeRequests,
        queueSize: this.requestQueue.length,
        circuitState: this.options.enableCircuitBreaker ? this.circuitState : 'disabled',
      };
    });

    // Metrics endpoint
    this.fastify.get('/metrics', async () => {
      return {
        activeRequests: this.activeRequests,
        queueSize: this.requestQueue.length,
        connectedClients: this.clients.size,
        circuitBreaker: this.options.enableCircuitBreaker ? {
          state: this.circuitState,
          failures: this.failureCount,
          successes: this.successCount,
        } : null,
      };
    });

    await this.fastify.listen({
      host: this.options.host,
      port: this.options.port,
    });

    this.isStarted = true;
    console.log(`HTTP transport listening on ${this.options.host}:${this.options.port}`);
    console.log(`  Request timeout: ${this.options.requestTimeout}ms`);
    console.log(`  Max concurrent: ${this.options.maxConcurrentRequests || 'unlimited'}`);
    console.log(`  Circuit breaker: ${this.options.enableCircuitBreaker ? 'enabled' : 'disabled'}`);
  }

  /**
   * Stop the HTTP transport
   */
  async stop(): Promise<void> {
    if (!this.isStarted || !this.fastify) {
      return;
    }

    // Drain queue
    this.requestQueue.forEach(resolve => resolve());
    this.requestQueue = [];

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

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(): 'open' | 'closed' | 'half-open' {
    if (!this.options.enableCircuitBreaker) {
      return 'closed';
    }

    const now = Date.now();

    // Transition from open to half-open after timeout
    if (this.circuitState === 'open') {
      if (now - this.lastFailureTime >= this.options.circuitBreakerTimeout) {
        this.circuitState = 'half-open';
        this.successCount = 0;
      }
    }

    return this.circuitState;
  }

  /**
   * Record a failure for circuit breaker
   */
  private recordFailure(): void {
    if (!this.options.enableCircuitBreaker) return;

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitState === 'half-open') {
      // Immediately open on failure in half-open state
      this.circuitState = 'open';
      this.successCount = 0;
    } else if (this.failureCount >= this.options.circuitBreakerThreshold) {
      this.circuitState = 'open';
      console.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  /**
   * Record a success for circuit breaker
   */
  private recordSuccess(): void {
    if (!this.options.enableCircuitBreaker) return;

    if (this.circuitState === 'half-open') {
      this.successCount++;
      // Close circuit after 3 consecutive successes
      if (this.successCount >= 3) {
        this.circuitState = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        console.log('Circuit breaker closed after successful requests');
      }
    } else if (this.circuitState === 'closed') {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Get current transport metrics
   */
  getMetrics() {
    return {
      activeRequests: this.activeRequests,
      queueSize: this.requestQueue.length,
      connectedClients: this.clients.size,
      circuitBreaker: this.options.enableCircuitBreaker ? {
        state: this.circuitState,
        failures: this.failureCount,
        successes: this.successCount,
      } : null,
    };
  }
}