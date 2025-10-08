import { trace, Span, SpanStatusCode, context, propagation } from '@opentelemetry/api';
import { Middleware, MCPMessage, MiddlewareContext, HookPhase } from '@mcp-accelerator/core';

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
export function createTracingMiddleware(options: TracingOptions = {}): Middleware {
  const {
    serviceName = 'mcp-server',
    includePayloads = false,
    attributes = {},
  } = options;

  const tracer = trace.getTracer(serviceName);

  return {
    name: 'opentelemetry-tracing',
    priority: 110, // Run early to capture everything
    
    async handler(message: MCPMessage, ctx: MiddlewareContext, next: () => Promise<void>) {
      // Extract context from incoming request (for distributed tracing)
      const parentContext = propagation.extract(context.active(), ctx.metadata || {});

      // Start span
      const span = tracer.startSpan(
        `${message.type}.${message.method || 'unknown'}`,
        {
          kind: 1, // SERVER
          attributes: {
            'service.name': serviceName,
            'mcp.message.type': message.type,
            'mcp.message.method': message.method || 'unknown',
            'mcp.message.id': message.id || 'none',
            'mcp.client.id': ctx.clientId,
            ...attributes,
          },
        },
        parentContext
      );

      // Add payload if requested
      if (includePayloads && message.params) {
        span.setAttribute('mcp.message.params', JSON.stringify(message.params));
      }

      try {
        // Execute with span context
        await context.with(trace.setSpan(parentContext, span), async () => {
          await next();
        });

        // Mark as successful
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        // Record error
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    },
  };
}

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
export function createTracingHooks(options: TracingOptions = {}) {
  const { serviceName = 'mcp-server', attributes = {} } = options;
  const tracer = trace.getTracer(serviceName);

  return [
    {
      name: 'tracing-tool-execution',
      phase: HookPhase.BeforeToolExecution,
      handler: async (hookContext: any) => {
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
      phase: HookPhase.AfterToolExecution,
      handler: async (hookContext: any) => {
        const span = hookContext.metadata?._span as Span;
        const startTime = hookContext.metadata?._spanStartTime as number;
        
        if (span) {
          if (hookContext.error) {
            span.recordException(hookContext.error);
            span.setStatus({ code: SpanStatusCode.ERROR });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
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
      phase: HookPhase.OnError,
      handler: async (hookContext: any) => {
        const span = trace.getActiveSpan();
        if (span && hookContext.error) {
          span.recordException(hookContext.error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: hookContext.error.message,
          });
        }
      },
    },
  ];
}
