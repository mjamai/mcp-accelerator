"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTracingHooks = exports.createTracingMiddleware = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@mcp-accelerator/core");
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
function createTracingMiddleware(options = {}) {
    const { serviceName = 'mcp-server', includePayloads = false, attributes = {}, } = options;
    const tracer = api_1.trace.getTracer(serviceName);
    return {
        name: 'opentelemetry-tracing',
        priority: 110, // Run early to capture everything
        async handler(message, ctx, next) {
            // Extract context from incoming request (for distributed tracing)
            const parentContext = api_1.propagation.extract(api_1.context.active(), ctx.metadata || {});
            // Start span
            const span = tracer.startSpan(`${message.type}.${message.method || 'unknown'}`, {
                kind: 1, // SERVER
                attributes: {
                    'service.name': serviceName,
                    'mcp.message.type': message.type,
                    'mcp.message.method': message.method || 'unknown',
                    'mcp.message.id': message.id || 'none',
                    'mcp.client.id': ctx.clientId,
                    ...attributes,
                },
            }, parentContext);
            // Add payload if requested
            if (includePayloads && message.params) {
                span.setAttribute('mcp.message.params', JSON.stringify(message.params));
            }
            try {
                // Execute with span context
                await api_1.context.with(api_1.trace.setSpan(parentContext, span), async () => {
                    await next();
                });
                // Mark as successful
                span.setStatus({ code: api_1.SpanStatusCode.OK });
            }
            catch (error) {
                // Record error
                span.recordException(error);
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        },
    };
}
exports.createTracingMiddleware = createTracingMiddleware;
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
function createTracingHooks(options = {}) {
    const { serviceName = 'mcp-server', attributes = {} } = options;
    const tracer = api_1.trace.getTracer(serviceName);
    return [
        {
            name: 'tracing-tool-execution',
            phase: core_1.HookPhase.BeforeToolExecution,
            handler: async (hookContext) => {
                const span = tracer.startSpan(`tool.${hookContext.toolName}`, {
                    attributes: {
                        'service.name': serviceName,
                        'tool.name': hookContext.toolName,
                        'client.id': hookContext.clientId,
                        ...attributes,
                    },
                });
                // Store span in context for AfterToolExecution
                hookContext.metadata = hookContext.metadata || {};
                hookContext.metadata._span = span;
                hookContext.metadata._spanStartTime = Date.now();
            },
        },
        {
            name: 'tracing-tool-completion',
            phase: core_1.HookPhase.AfterToolExecution,
            handler: async (hookContext) => {
                const span = hookContext.metadata?._span;
                const startTime = hookContext.metadata?._spanStartTime;
                if (span) {
                    if (hookContext.error) {
                        span.recordException(hookContext.error);
                        span.setStatus({ code: api_1.SpanStatusCode.ERROR });
                    }
                    else {
                        span.setStatus({ code: api_1.SpanStatusCode.OK });
                    }
                    if (startTime) {
                        span.setAttribute('tool.duration_ms', Date.now() - startTime);
                    }
                    span.end();
                }
            },
        },
        {
            name: 'tracing-errors',
            phase: core_1.HookPhase.OnError,
            handler: async (hookContext) => {
                const span = api_1.trace.getActiveSpan();
                if (span && hookContext.error) {
                    span.recordException(hookContext.error);
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: hookContext.error.message,
                    });
                }
            },
        },
    ];
}
exports.createTracingHooks = createTracingHooks;
//# sourceMappingURL=tracing.js.map