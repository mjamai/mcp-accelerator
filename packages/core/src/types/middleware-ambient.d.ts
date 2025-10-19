import type { Middleware, MiddlewareContext, LifecycleHook, HookPhase } from '../types';

declare module '@mcp-accelerator/middleware-auth' {
  export interface JWTAuthOptions {
    secret: string;
    algorithms?: string[];
    headerName?: string;
    tokenPrefix?: string;
    verify?: (decoded: unknown, context: MiddlewareContext) => Promise<boolean> | boolean;
  }

  export interface APIKeyAuthOptions {
    keys: string[] | ((key: string) => Promise<boolean> | boolean);
    headerName?: string;
    getUserInfo?: (key: string) => Promise<unknown> | unknown;
  }

  export function createJWTAuthMiddleware(options: JWTAuthOptions): Middleware;
  export function createAPIKeyAuthMiddleware(options: APIKeyAuthOptions): Middleware;
}

declare module '@mcp-accelerator/middleware-ratelimit' {
  export interface RateLimitOptions {
    max: number;
    windowMs: number;
    keyGenerator?: (context: MiddlewareContext) => string;
    message?: string;
    skip?: (context: MiddlewareContext) => Promise<boolean> | boolean;
  }

  export function createRateLimitMiddleware(options: RateLimitOptions): Middleware;
}

declare module '@mcp-accelerator/middleware-observability' {
  export interface TracingOptions {
    serviceName?: string;
    includePayloads?: boolean;
    attributes?: Record<string, string | number | boolean>;
  }

  export interface MetricsOptions {
    serviceName?: string;
    perToolMetrics?: boolean;
  }

  export interface OTelConfig {
    serviceName: string;
    serviceVersion?: string;
    environment?: string;
    traceExporter?: 'otlp' | 'jaeger' | 'console' | 'none';
    metricsExporter?: 'otlp' | 'prometheus' | 'console' | 'none';
    otlpTraceEndpoint?: string;
    otlpMetricsEndpoint?: string;
    jaegerEndpoint?: string;
    prometheusPort?: number;
    autoInstrumentation?: boolean;
  }

  export function createTracingMiddleware(options?: TracingOptions): Middleware;
  export function createTracingHooks(options?: TracingOptions): Array<LifecycleHook>;
  export function createMetricsHooks(options?: MetricsOptions): Array<LifecycleHook>;
  export function initializeObservability(config: OTelConfig): Promise<unknown>;
  export function shutdownObservability(): Promise<void>;
  export const presets: Record<string, Partial<OTelConfig>>;
}
