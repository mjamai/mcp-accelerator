import { MCPServer } from '../core/server';
import { HookPhase, Logger } from '../types';

type Maybe<T> = T | undefined | null;

export interface DefaultAuthConfig {
  jwt?: {
    secret?: string;
    algorithms?: string[];
    headerName?: string;
    tokenPrefix?: string;
  };
  apiKey?: {
    headerName?: string;
    keys?: string[] | ((key: string) => Promise<boolean> | boolean);
  };
}

export interface DefaultRateLimitConfig {
  max?: number;
  windowMs?: number;
}

export interface DefaultObservabilityConfig {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  traceExporter?: 'otlp' | 'jaeger' | 'console' | 'none';
  metricsExporter?: 'otlp' | 'prometheus' | 'console' | 'none';
  includePayloads?: boolean;
}

export interface DefaultSecurityOptions {
  auth?: DefaultAuthConfig;
  rateLimit?: DefaultRateLimitConfig;
  observability?: DefaultObservabilityConfig;
  logger?: Logger;
}

/**
 * Apply recommended middleware defaults for authentication, rate limiting, and observability.
 * Each block is optional and enabled only when the corresponding configuration or environment variables are provided.
 */
export async function applyDefaultSecurity(
  server: MCPServer,
  options: DefaultSecurityOptions = {},
): Promise<void> {
  const logger = options.logger ?? server.logger;

  await Promise.all([
    setupAuth(server, logger, options.auth),
    setupRateLimit(server, logger, options.rateLimit),
    setupObservability(server, logger, options.observability),
  ]);
}

async function setupAuth(
  server: MCPServer,
  logger: Logger,
  config?: DefaultAuthConfig,
): Promise<void> {
  const jwtSecret =
    config?.jwt?.secret ??
    getEnv('MCP_JWT_SECRET');

  const jwtAlgorithms =
    config?.jwt?.algorithms ??
    splitEnv('MCP_JWT_ALGORITHMS');

  const jwtHeader = config?.jwt?.headerName ?? process.env.MCP_JWT_HEADER;
  const jwtPrefix = config?.jwt?.tokenPrefix ?? process.env.MCP_JWT_PREFIX;

  const apiKeyHeader = config?.apiKey?.headerName ?? process.env.MCP_API_KEY_HEADER;
  const apiKeys =
    config?.apiKey?.keys ?? (() => {
      const raw = getEnv('MCP_API_KEYS');
      return raw ? raw.split(',').map((key) => key.trim()).filter(Boolean) : undefined;
    })();

  try {
    if (jwtSecret) {
      const authModule = await safeImport('@mcp-accelerator/middleware-auth', logger);
      if (authModule?.createJWTAuthMiddleware) {
        server.registerMiddleware(
          authModule.createJWTAuthMiddleware({
            secret: jwtSecret,
            algorithms: jwtAlgorithms?.length ? jwtAlgorithms : undefined,
            headerName: jwtHeader,
            tokenPrefix: jwtPrefix,
          }),
        );
        logger.info('JWT authentication middleware registered');
      }
    }

    if (apiKeys && Array.isArray(apiKeys) && apiKeys.length > 0) {
      const authModule = await safeImport('@mcp-accelerator/middleware-auth', logger);
      if (authModule?.createAPIKeyAuthMiddleware) {
        server.registerMiddleware(
          authModule.createAPIKeyAuthMiddleware({
            keys: apiKeys,
            headerName: apiKeyHeader,
          }),
        );
        logger.info('API key authentication middleware registered');
      }
    }
  } catch (error) {
    logger.error('Failed to configure authentication middleware', error as Error);
  }
}

async function setupRateLimit(
  server: MCPServer,
  logger: Logger,
  config?: DefaultRateLimitConfig,
): Promise<void> {
  const max =
    config?.max ??
    parseNumber(process.env.MCP_RATE_LIMIT_MAX);

  const windowMs =
    config?.windowMs ??
    parseNumber(process.env.MCP_RATE_LIMIT_WINDOW_MS) ??
    60_000;

  if (!max || max <= 0) {
    return;
  }

  try {
    const rateModule = await safeImport('@mcp-accelerator/middleware-ratelimit', logger);
    if (rateModule?.createRateLimitMiddleware) {
      server.registerMiddleware(
        rateModule.createRateLimitMiddleware({
          max,
          windowMs,
          keyGenerator: (context: { metadata?: Record<string, unknown>; clientId?: string }) =>
            (context.metadata?.authorization as string) ??
            context.clientId ??
            'anonymous',
        }),
      );
      logger.info(`Rate limiting middleware registered (max ${max} / ${windowMs}ms)`);
    }
  } catch (error) {
    logger.error('Failed to configure rate limiting middleware', error as Error);
  }
}

async function setupObservability(
  server: MCPServer,
  logger: Logger,
  config?: DefaultObservabilityConfig,
): Promise<void> {
  const serviceName =
    config?.serviceName ??
    getEnv('OTEL_SERVICE_NAME');

  if (!serviceName) {
    return;
  }

  try {
    const obsModule = await safeImport('@mcp-accelerator/middleware-observability', logger);
    if (!obsModule) {
      return;
    }

    await obsModule.initializeObservability({
      serviceName,
      serviceVersion: config?.serviceVersion ?? process.env.OTEL_SERVICE_VERSION ?? '1.0.0',
      environment: config?.environment ?? process.env.OTEL_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      traceExporter: (config?.traceExporter ?? (process.env.OTEL_TRACE_EXPORTER as any)) || 'console',
      metricsExporter: (config?.metricsExporter ?? (process.env.OTEL_METRICS_EXPORTER as any)) || 'console',
      otlpTraceEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      otlpMetricsEndpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
      jaegerEndpoint: process.env.JAEGER_ENDPOINT,
    });

    server.registerMiddleware(
      obsModule.createTracingMiddleware({
        serviceName,
        includePayloads: config?.includePayloads ?? false,
      }),
    );

    const tracingHooks = obsModule.createTracingHooks({ serviceName });
    tracingHooks.forEach((hook: any) => server.registerHook(hook));

    const metricsHooks = obsModule.createMetricsHooks({ serviceName });
    metricsHooks.forEach((hook: any) => server.registerHook(hook));

    server.registerHook({
      name: 'observability-shutdown',
      phase: HookPhase.OnStop,
      handler: async () => {
        await obsModule.shutdownObservability().catch((error: unknown) => {
          logger.error('Failed to shutdown observability SDK', error as Error);
        });
      },
    });

    logger.info('Observability (tracing + metrics) initialized');
  } catch (error) {
    logger.error('Failed to configure observability', error as Error);
  }
}

async function safeImport(moduleName: string, logger: Logger): Promise<any | null> {
  try {
    return await import(moduleName);
  } catch (error) {
    logger.warn(`Optional dependency "${moduleName}" is not available. Skipping.`);
    return null;
  }
}

function getEnv(name: string): Maybe<string> {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function splitEnv(name: string): string[] | undefined {
  const raw = getEnv(name);
  return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : undefined;
}

function parseNumber(value: Maybe<string>): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
