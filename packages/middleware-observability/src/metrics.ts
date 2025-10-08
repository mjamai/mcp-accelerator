import { metrics, Counter, Histogram, UpDownCounter } from '@opentelemetry/api';
import { HookPhase } from '@mcp-accelerator/core';

/**
 * OpenTelemetry Metrics for MCP Server
 * 
 * Tracks requests, errors, latency, and more
 */

export interface MetricsOptions {
  /** Service name for metrics */
  serviceName?: string;
  /** Enable detailed metrics per tool */
  perToolMetrics?: boolean;
}

export class MCPMetrics {
  private meter;
  private requestCounter: Counter;
  private errorCounter: Counter;
  private activeConnections: UpDownCounter;
  private requestDuration: Histogram;
  private toolDuration: Histogram;

  constructor(private options: MetricsOptions = {}) {
    const { serviceName = 'mcp-server' } = options;
    
    this.meter = metrics.getMeter(serviceName);

    // Initialize metrics
    this.requestCounter = this.meter.createCounter('mcp.requests.total', {
      description: 'Total number of MCP requests',
    });

    this.errorCounter = this.meter.createCounter('mcp.errors.total', {
      description: 'Total number of errors',
    });

    this.activeConnections = this.meter.createUpDownCounter('mcp.connections.active', {
      description: 'Number of active client connections',
    });

    this.requestDuration = this.meter.createHistogram('mcp.request.duration', {
      description: 'Request duration in milliseconds',
      unit: 'ms',
    });

    this.toolDuration = this.meter.createHistogram('mcp.tool.duration', {
      description: 'Tool execution duration in milliseconds',
      unit: 'ms',
    });
  }

  /**
   * Create hooks to automatically collect metrics
   */
  createHooks() {
    return [
      {
        name: 'metrics-client-connect',
        phase: HookPhase.OnClientConnect,
        handler: async () => {
          this.activeConnections.add(1);
        },
      },
      {
        name: 'metrics-client-disconnect',
        phase: HookPhase.OnClientDisconnect,
        handler: async () => {
          this.activeConnections.add(-1);
        },
      },
      {
        name: 'metrics-request',
        phase: HookPhase.OnRequest,
        handler: async (context: any) => {
          this.requestCounter.add(1, {
            method: context.request?.method || 'unknown',
            type: context.request?.type || 'unknown',
          });
        },
      },
      {
        name: 'metrics-response',
        phase: HookPhase.OnResponse,
        handler: async (context: any) => {
          if (context.duration) {
            this.requestDuration.record(context.duration, {
              method: context.request?.method || 'unknown',
              success: !context.error,
            });
          }
        },
      },
      {
        name: 'metrics-tool-execution',
        phase: HookPhase.AfterToolExecution,
        handler: async (context: any) => {
          if (context.duration && context.toolName) {
            const attributes: Record<string, string | boolean> = {
              tool: context.toolName,
              success: !context.error,
            };

            this.toolDuration.record(context.duration, attributes);
          }
        },
      },
      {
        name: 'metrics-error',
        phase: HookPhase.OnError,
        handler: async (context: any) => {
          this.errorCounter.add(1, {
            error_type: context.error?.name || 'unknown',
            client_id: context.clientId || 'unknown',
          });
        },
      },
    ];
  }

  /**
   * Get current metric values (for debugging)
   */
  async getMetrics() {
    // This would require implementing a metrics reader
    // For now, metrics are exported to configured backend
    return {
      message: 'Metrics are exported to configured backend (Prometheus, OTLP, etc.)',
    };
  }
}

/**
 * Create metrics collection hooks
 * 
 * @example
 * ```typescript
 * import { createMetricsHooks } from '@mcp-accelerator/middleware-observability';
 * 
 * const hooks = createMetricsHooks({ serviceName: 'my-mcp-server' });
 * hooks.forEach(hook => server.registerHook(hook));
 * ```
 */
export function createMetricsHooks(options: MetricsOptions = {}) {
  const metrics = new MCPMetrics(options);
  return metrics.createHooks();
}
