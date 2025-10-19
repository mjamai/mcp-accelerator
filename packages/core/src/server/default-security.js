"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDefaultSecurity = void 0;
const types_1 = require("../types");
/**
 * Apply recommended middleware defaults for authentication, rate limiting, and observability.
 * Each block is optional and enabled only when the corresponding configuration or environment variables are provided.
 */
async function applyDefaultSecurity(server, options = {}) {
    const logger = options.logger ?? server.logger;
    await Promise.all([
        setupAuth(server, logger, options.auth),
        setupRateLimit(server, logger, options.rateLimit),
        setupObservability(server, logger, options.observability),
    ]);
}
exports.applyDefaultSecurity = applyDefaultSecurity;
async function setupAuth(server, logger, config) {
    const jwtSecret = config?.jwt?.secret ??
        getEnv('MCP_JWT_SECRET');
    const jwtAlgorithms = config?.jwt?.algorithms ??
        splitEnv('MCP_JWT_ALGORITHMS');
    const jwtHeader = config?.jwt?.headerName ?? process.env.MCP_JWT_HEADER;
    const jwtPrefix = config?.jwt?.tokenPrefix ?? process.env.MCP_JWT_PREFIX;
    const apiKeyHeader = config?.apiKey?.headerName ?? process.env.MCP_API_KEY_HEADER;
    const apiKeys = config?.apiKey?.keys ?? (() => {
        const raw = getEnv('MCP_API_KEYS');
        return raw ? raw.split(',').map((key) => key.trim()).filter(Boolean) : undefined;
    })();
    try {
        if (jwtSecret) {
            const authModule = await safeImport('@mcp-accelerator/middleware-auth', logger);
            if (authModule?.createJWTAuthMiddleware) {
                server.registerMiddleware(authModule.createJWTAuthMiddleware({
                    secret: jwtSecret,
                    algorithms: jwtAlgorithms?.length ? jwtAlgorithms : undefined,
                    headerName: jwtHeader,
                    tokenPrefix: jwtPrefix,
                }));
                logger.info('JWT authentication middleware registered');
            }
        }
        if (apiKeys && Array.isArray(apiKeys) && apiKeys.length > 0) {
            const authModule = await safeImport('@mcp-accelerator/middleware-auth', logger);
            if (authModule?.createAPIKeyAuthMiddleware) {
                server.registerMiddleware(authModule.createAPIKeyAuthMiddleware({
                    keys: apiKeys,
                    headerName: apiKeyHeader,
                }));
                logger.info('API key authentication middleware registered');
            }
        }
    }
    catch (error) {
        logger.error('Failed to configure authentication middleware', error);
    }
}
async function setupRateLimit(server, logger, config) {
    const max = config?.max ??
        parseNumber(process.env.MCP_RATE_LIMIT_MAX);
    const windowMs = config?.windowMs ??
        parseNumber(process.env.MCP_RATE_LIMIT_WINDOW_MS) ??
        60_000;
    if (!max || max <= 0) {
        return;
    }
    try {
        const rateModule = await safeImport('@mcp-accelerator/middleware-ratelimit', logger);
        if (rateModule?.createRateLimitMiddleware) {
            server.registerMiddleware(rateModule.createRateLimitMiddleware({
                max,
                windowMs,
                keyGenerator: (context) => context.metadata?.authorization ??
                    context.clientId ??
                    'anonymous',
            }));
            logger.info(`Rate limiting middleware registered (max ${max} / ${windowMs}ms)`);
        }
    }
    catch (error) {
        logger.error('Failed to configure rate limiting middleware', error);
    }
}
async function setupObservability(server, logger, config) {
    const serviceName = config?.serviceName ??
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
            traceExporter: (config?.traceExporter ?? process.env.OTEL_TRACE_EXPORTER) || 'console',
            metricsExporter: (config?.metricsExporter ?? process.env.OTEL_METRICS_EXPORTER) || 'console',
            otlpTraceEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
            otlpMetricsEndpoint: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
            jaegerEndpoint: process.env.JAEGER_ENDPOINT,
        });
        server.registerMiddleware(obsModule.createTracingMiddleware({
            serviceName,
            includePayloads: config?.includePayloads ?? false,
        }));
        const tracingHooks = obsModule.createTracingHooks({ serviceName });
        tracingHooks.forEach((hook) => server.registerHook(hook));
        const metricsHooks = obsModule.createMetricsHooks({ serviceName });
        metricsHooks.forEach((hook) => server.registerHook(hook));
        server.registerHook({
            name: 'observability-shutdown',
            phase: types_1.HookPhase.OnStop,
            handler: async () => {
                await obsModule.shutdownObservability().catch((error) => {
                    logger.error('Failed to shutdown observability SDK', error);
                });
            },
        });
        logger.info('Observability (tracing + metrics) initialized');
    }
    catch (error) {
        logger.error('Failed to configure observability', error);
    }
}
async function safeImport(moduleName, logger) {
    try {
        return await Promise.resolve(`${moduleName}`).then(s => __importStar(require(s)));
    }
    catch (error) {
        logger.warn(`Optional dependency "${moduleName}" is not available. Skipping.`);
        return null;
    }
}
function getEnv(name) {
    const value = process.env[name];
    return value && value.length > 0 ? value : undefined;
}
function splitEnv(name) {
    const raw = getEnv(name);
    return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : undefined;
}
function parseNumber(value) {
    if (!value)
        return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
//# sourceMappingURL=default-security.js.map