import { 
  Plugin, 
  MCPServerInterface, 
  HookPhase, 
  HookContext,
} from '../types';

/**
 * Plugin de logging des événements serveur
 */
export class LoggingPlugin implements Plugin {
  name = 'logging-plugin';
  version = '1.0.0';

  async initialize(server: MCPServerInterface): Promise<void> {
    server.logger.info('LoggingPlugin initialized');

    // Log client connections
    server.registerHook({
      name: 'log-client-connect',
      phase: HookPhase.OnClientConnect,
      handler: async (ctx: HookContext) => {
        server.logger.info('Client connected', {
          clientId: ctx.clientId,
        });
      },
    });

    // Log client disconnections
    server.registerHook({
      name: 'log-client-disconnect',
      phase: HookPhase.OnClientDisconnect,
      handler: async (ctx: HookContext) => {
        server.logger.info('Client disconnected', {
          clientId: ctx.clientId,
        });
      },
    });

    // Log errors
    server.registerHook({
      name: 'log-errors',
      phase: HookPhase.OnError,
      handler: async (ctx: HookContext) => {
        if (ctx.error) {
          server.logger.error('Error occurred', ctx.error, {
            clientId: ctx.clientId,
            toolName: ctx.toolName,
          });
        }
      },
    });
  }
}

/**
 * Plugin de métriques basiques
 */
export class MetricsPlugin implements Plugin {
  name = 'metrics-plugin';
  version = '1.0.0';

  private metrics = {
    totalRequests: 0,
    totalErrors: 0,
    totalDuration: 0,
    toolCalls: new Map<string, number>(),
  };

  async initialize(server: MCPServerInterface): Promise<void> {
    server.logger.info('MetricsPlugin initialized');

    // Track tool executions (before)
    server.registerHook({
      name: 'metrics-before-tool',
      phase: HookPhase.BeforeToolExecution,
      handler: async (ctx: HookContext) => {
        if (ctx.toolName) {
          this.metrics.totalRequests++;
          const currentCount = this.metrics.toolCalls.get(ctx.toolName) || 0;
          this.metrics.toolCalls.set(ctx.toolName, currentCount + 1);
        }
      },
    });

    // Track tool executions (after)
    server.registerHook({
      name: 'metrics-after-tool',
      phase: HookPhase.AfterToolExecution,
      handler: async (ctx: HookContext) => {
        if (ctx.duration !== undefined) {
          this.metrics.totalDuration += ctx.duration;
        }
        if (ctx.error) {
          this.metrics.totalErrors++;
        }
      },
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      totalRequests: this.metrics.totalRequests,
      totalErrors: this.metrics.totalErrors,
      averageDuration: this.metrics.totalRequests > 0
        ? this.metrics.totalDuration / this.metrics.totalRequests
        : 0,
      toolCalls: Object.fromEntries(this.metrics.toolCalls),
    };
  }

  async cleanup(): Promise<void> {
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalDuration: 0,
      toolCalls: new Map(),
    };
  }
}