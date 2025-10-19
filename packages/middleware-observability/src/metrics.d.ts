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
export declare class MCPMetrics {
    private options;
    private meter;
    private requestCounter;
    private errorCounter;
    private activeConnections;
    private requestDuration;
    private toolDuration;
    constructor(options?: MetricsOptions);
    /**
     * Create hooks to automatically collect metrics
     */
    createHooks(): {
        name: string;
        phase: HookPhase;
        handler: (context: any) => Promise<void>;
    }[];
    /**
     * Get current metric values (for debugging)
     */
    getMetrics(): Promise<{
        message: string;
    }>;
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
export declare function createMetricsHooks(options?: MetricsOptions): {
    name: string;
    phase: HookPhase;
    handler: (context: any) => Promise<void>;
}[];
//# sourceMappingURL=metrics.d.ts.map