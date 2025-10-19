import { Middleware, HookPhase } from '@mcp-accelerator/core';
/**
 * OpenTelemetry Tracing Middleware
 *
 * Automatically creates spans for all requests and tool executions
 */
export interface TracingOptions {
    /** Service name for tracing */
    serviceName?: string;
    /** Include request/response payloads in spans */
    includePayloads?: boolean;
    /** Custom span attributes */
    attributes?: Record<string, string | number | boolean>;
}
/**
 * Create distributed tracing middleware using OpenTelemetry
 *
 * @example
 * ```typescript
 * import { createTracingMiddleware } from '@mcp-accelerator/middleware-observability';
 *
 * server.registerMiddleware(createTracingMiddleware({
 *   serviceName: 'my-mcp-server',
 *   includePayloads: false
 * }));
 * ```
 */
export declare function createTracingMiddleware(options?: TracingOptions): Middleware;
/**
 * Create hooks for detailed tracing of lifecycle events
 *
 * @example
 * ```typescript
 * import { createTracingHooks } from '@mcp-accelerator/middleware-observability';
 *
 * const hooks = createTracingHooks({ serviceName: 'my-mcp-server' });
 * hooks.forEach(hook => server.registerHook(hook));
 * ```
 */
export declare function createTracingHooks(options?: TracingOptions): {
    name: string;
    phase: HookPhase;
    handler: (hookContext: any) => Promise<void>;
}[];
//# sourceMappingURL=tracing.d.ts.map