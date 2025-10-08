import { Plugin, MCPServerInterface, HookPhase } from '../types';

/**
 * Example logging plugin that adds request/response logging
 */
export class LoggingPlugin implements Plugin {
  name = 'logging-plugin';
  version = '1.0.0';
  priority = 10;

  async initialize(server: MCPServerInterface): Promise<void> {
    server.logger.info('Initializing logging plugin');

    // Add middleware to log all messages
    server.registerMiddleware({
      name: 'logging-middleware',
      priority: 100,
      handler: async (message, context, next) => {
        const start = Date.now();
        
        context.logger.info('Incoming message', {
          type: message.type,
          method: message.method,
          clientId: context.clientId,
        });

        await next();

        const duration = Date.now() - start;
        context.logger.info('Message processed', {
          duration,
          clientId: context.clientId,
        });
      },
    });

    // Add hooks for lifecycle events
    server.registerHook({
      name: 'log-client-connect',
      phase: HookPhase.OnClientConnect,
      handler: async (ctx) => {
        server.logger.info('Client connected', { clientId: ctx.data });
      },
    });

    server.registerHook({
      name: 'log-client-disconnect',
      phase: HookPhase.OnClientDisconnect,
      handler: async (ctx) => {
        server.logger.info('Client disconnected', { clientId: ctx.data });
      },
    });
  }

  async cleanup(): Promise<void> {
    // Cleanup if needed
  }
}

/**
 * Example metrics plugin that tracks tool execution statistics
 */
export class MetricsPlugin implements Plugin {
  name = 'metrics-plugin';
  version = '1.0.0';
  priority = 5;

  private metrics = {
    toolExecutions: 0,
    totalDuration: 0,
    errors: 0,
  };

  async initialize(server: MCPServerInterface): Promise<void> {
    server.logger.info('Initializing metrics plugin');

    // Track tool executions
    server.registerHook({
      name: 'metrics-before-tool',
      phase: HookPhase.BeforeToolExecution,
      handler: async () => {
        this.metrics.toolExecutions++;
      },
    });

    server.registerHook({
      name: 'metrics-after-tool',
      phase: HookPhase.AfterToolExecution,
      handler: async (ctx: any) => {
        if (ctx.data?.result) {
          this.metrics.totalDuration += ctx.data.result.duration || 0;
          
          if (!ctx.data.result.success) {
            this.metrics.errors++;
          }
        }
      },
    });

    // Log metrics periodically
    setInterval(() => {
      server.logger.info('Metrics report', this.metrics);
    }, 60000); // Every minute
  }

  getMetrics() {
    return { ...this.metrics };
  }

  async cleanup(): Promise<void> {
    // Cleanup timers if needed
  }
}

/**
 * Example rate limiting plugin
 */
export class RateLimitPlugin implements Plugin {
  name = 'rate-limit-plugin';
  version = '1.0.0';
  priority = 50;

  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async initialize(server: MCPServerInterface): Promise<void> {
    server.logger.info('Initializing rate limit plugin', {
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    });

    server.registerMiddleware({
      name: 'rate-limit-middleware',
      priority: 90,
      handler: async (message, context, next) => {
        const { clientId } = context;
        const now = Date.now();

        // Get client request history
        let requests = this.requests.get(clientId) || [];
        
        // Remove old requests outside the window
        requests = requests.filter(time => now - time < this.windowMs);

        // Check if limit exceeded
        if (requests.length >= this.maxRequests) {
          throw new Error(`Rate limit exceeded for client ${clientId}`);
        }

        // Add current request
        requests.push(now);
        this.requests.set(clientId, requests);

        await next();
      },
    });

    // Cleanup old entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [clientId, requests] of this.requests.entries()) {
        const filtered = requests.filter(time => now - time < this.windowMs);
        if (filtered.length === 0) {
          this.requests.delete(clientId);
        } else {
          this.requests.set(clientId, filtered);
        }
      }
    }, this.windowMs);
  }

  async cleanup(): Promise<void> {
    this.requests.clear();
  }
}

