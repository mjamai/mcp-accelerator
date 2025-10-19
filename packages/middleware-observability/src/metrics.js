"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetricsHooks = exports.MCPMetrics = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@mcp-accelerator/core");
class MCPMetrics {
    options;
    meter;
    requestCounter;
    errorCounter;
    activeConnections;
    requestDuration;
    toolDuration;
    constructor(options = {}) {
        this.options = options;
        const { serviceName = 'mcp-server' } = options;
        this.meter = api_1.metrics.getMeter(serviceName);
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
                phase: core_1.HookPhase.OnClientConnect,
                handler: async () => {
                    this.activeConnections.add(1);
                },
            },
            {
                name: 'metrics-client-disconnect',
                phase: core_1.HookPhase.OnClientDisconnect,
                handler: async () => {
                    this.activeConnections.add(-1);
                },
            },
            {
                name: 'metrics-request',
                phase: core_1.HookPhase.OnRequest,
                handler: async (context) => {
                    this.requestCounter.add(1, {
                        method: context.request?.method || 'unknown',
                        type: context.request?.type || 'unknown',
                    });
                },
            },
            {
                name: 'metrics-response',
                phase: core_1.HookPhase.OnResponse,
                handler: async (context) => {
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
                phase: core_1.HookPhase.AfterToolExecution,
                handler: async (context) => {
                    if (context.duration && context.toolName) {
                        const attributes = {
                            tool: context.toolName,
                            success: !context.error,
                        };
                        this.toolDuration.record(context.duration, attributes);
                    }
                },
            },
            {
                name: 'metrics-error',
                phase: core_1.HookPhase.OnError,
                handler: async (context) => {
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
exports.MCPMetrics = MCPMetrics;
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
function createMetricsHooks(options = {}) {
    const metrics = new MCPMetrics(options);
    return metrics.createHooks();
}
exports.createMetricsHooks = createMetricsHooks;
//# sourceMappingURL=metrics.js.map