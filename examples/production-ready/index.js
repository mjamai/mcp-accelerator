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
const core_1 = require("@mcp-accelerator/core");
const transport_http_1 = require("@mcp-accelerator/transport-http");
const middleware_auth_1 = require("@mcp-accelerator/middleware-auth");
const middleware_ratelimit_1 = require("@mcp-accelerator/middleware-ratelimit");
const middleware_cors_1 = require("@mcp-accelerator/middleware-cors");
const middleware_observability_1 = require("@mcp-accelerator/middleware-observability");
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
/**
 * Production-Ready MCP Server
 *
 * Features:
 * - ✅ TLS/HTTPS encryption
 * - ✅ JWT Authentication
 * - ✅ Rate Limiting (100 req/min per user)
 * - ✅ CORS protection
 * - ✅ OpenTelemetry Observability
 * - ✅ Circuit Breaker for resilience
 * - ✅ Graceful Shutdown
 * - ✅ Error handling with safe handlers
 * - ✅ Request timeout protection
 * - ✅ Health and metrics endpoints
 */
async function main() {
    // Initialize observability stack
    (0, middleware_observability_1.initializeObservability)({
        serviceName: 'production-mcp-server',
        serviceVersion: '1.0.0',
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    });
    // Create server
    const server = new core_1.MCPServer({
        name: 'production-server',
        version: '1.0.0',
    });
    // ========================================
    // Middleware Stack (priority order)
    // ========================================
    // 1. Error boundary (priority: 150)
    server.registerMiddleware({
        name: 'error-boundary',
        priority: 150,
        handler: async (message, context, next) => {
            try {
                await next();
            }
            catch (error) {
                context.logger.error('Unhandled middleware error', error, {
                    method: message.method,
                    clientId: context.clientId,
                });
                throw error;
            }
        },
    });
    // 2. Request validation (priority: 140)
    server.registerMiddleware({
        name: 'request-validator',
        priority: 140,
        handler: async (message, context, next) => {
            if (message.type === 'request' && !message.method) {
                throw new Error('Invalid request: missing method');
            }
            await next();
        },
    });
    // 3. JWT Authentication (priority: 100)
    server.registerMiddleware((0, middleware_auth_1.createJWTAuthMiddleware)({
        secret: process.env.JWT_SECRET || 'your-secret-key-change-me',
        algorithms: ['HS256'],
        required: true,
        skipMethods: ['health/check', 'tools/list'], // Public endpoints
        priority: 100,
    }));
    // 4. Rate Limiting (priority: 90)
    server.registerMiddleware((0, middleware_ratelimit_1.createRateLimitMiddleware)({
        maxRequests: 100,
        windowMs: 60000, // 1 minute
        keyGenerator: (context) => context.metadata.user?.id || context.clientId,
        priority: 90,
    }));
    // 5. CORS (priority: 80)
    server.registerMiddleware((0, middleware_cors_1.createCorsMiddleware)({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['POST', 'GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        priority: 80,
    }));
    // 6. Request timing (priority: 10)
    server.registerMiddleware({
        name: 'request-timing',
        priority: 10,
        handler: async (message, context, next) => {
            const startTime = Date.now();
            let success = true;
            try {
                await next();
            }
            catch (error) {
                success = false;
                throw error;
            }
            finally {
                const duration = Date.now() - startTime;
                context.logger.debug('Request completed', {
                    method: message.method,
                    duration,
                    success,
                    userId: context.metadata.user?.id,
                });
            }
        },
    });
    // ========================================
    // Observability Hooks
    // ========================================
    const metricsHooks = (0, middleware_observability_1.createMetricsHooks)({ serviceName: 'production-mcp-server' });
    metricsHooks.forEach(hook => server.registerHook(hook));
    // ========================================
    // Tool Registration
    // ========================================
    // Example tool: Process user data with safe handler
    server.registerTool({
        name: 'process-data',
        description: 'Process user data with authentication and validation',
        inputSchema: zod_1.z.object({
            userId: zod_1.z.string().uuid(),
            action: zod_1.z.enum(['fetch', 'update', 'delete']),
            data: zod_1.z.record(zod_1.z.unknown()).optional(),
        }),
        handler: (0, core_1.safeHandler)(async (input, context) => {
            context.logger.info('Processing data', {
                userId: input.userId,
                action: input.action,
                requestor: context.metadata.user?.id,
            });
            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 100));
            // Business logic here
            return {
                success: true,
                userId: input.userId,
                action: input.action,
                timestamp: new Date().toISOString(),
                processedBy: context.metadata.user?.email || 'system',
            };
        }, {
            name: 'process-data',
            timeout: 5000, // 5 second timeout
            retry: {
                attempts: 3,
                delay: 1000,
                exponentialBackoff: true,
            },
        }),
    });
    // Example tool: Fetch user profile
    server.registerTool({
        name: 'get-profile',
        description: 'Get user profile information',
        inputSchema: zod_1.z.object({
            userId: zod_1.z.string().uuid(),
        }),
        handler: async (input, context) => {
            context.logger.info('Fetching profile', {
                userId: input.userId,
                requestor: context.metadata.user?.id,
            });
            // Authorization check
            if (input.userId !== context.metadata.user?.id) {
                const hasAdminRole = context.metadata.user?.roles?.includes('admin');
                if (!hasAdminRole) {
                    throw new Error('Insufficient permissions to access other user profiles');
                }
            }
            // Simulate database fetch
            return {
                userId: input.userId,
                email: `user-${input.userId}@example.com`,
                name: `User ${input.userId.slice(0, 8)}`,
                roles: ['user'],
                createdAt: new Date().toISOString(),
            };
        },
    });
    // Example tool: Health check (public)
    server.registerTool({
        name: 'health-check',
        description: 'Check server health status',
        inputSchema: zod_1.z.object({}),
        handler: async (input, context) => {
            const status = server.getStatus();
            return {
                status: 'healthy',
                server: status,
                timestamp: new Date().toISOString(),
            };
        },
    });
    // ========================================
    // Transport Setup with TLS
    // ========================================
    const httpsOptions = (() => {
        try {
            return {
                key: fs.readFileSync(process.env.TLS_KEY_PATH || './certs/key.pem'),
                cert: fs.readFileSync(process.env.TLS_CERT_PATH || './certs/cert.pem'),
            };
        }
        catch (error) {
            console.warn('⚠️  TLS certificates not found, using HTTP (not recommended for production)');
            return undefined;
        }
    })();
    const transport = new transport_http_1.HttpTransport({
        host: process.env.HOST || '0.0.0.0',
        port: parseInt(process.env.PORT || (httpsOptions ? '8443' : '8080')),
        requestTimeout: 30000,
        connectionTimeout: 5000,
        keepAliveTimeout: 72000,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 60000,
        maxConcurrentRequests: 100,
        maxQueueSize: 200,
        enableBackpressure: true,
        fastifyOptions: httpsOptions ? { https: httpsOptions } : {},
    });
    await server.setTransport(transport);
    await server.start();
    // ========================================
    // Startup Logging
    // ========================================
    const protocol = httpsOptions ? 'https' : 'http';
    const host = process.env.HOST || '0.0.0.0';
    const port = process.env.PORT || (httpsOptions ? '8443' : '8080');
    server.logger.info('🚀 Production MCP Server Started', {
        url: `${protocol}://${host}:${port}`,
        tls: !!httpsOptions,
        auth: 'JWT',
        observability: 'OpenTelemetry',
        features: {
            circuitBreaker: true,
            rateLimiting: true,
            cors: true,
            gracefulShutdown: true,
        },
    });
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  🚀 Production MCP Server is running                         ║
║                                                              ║
║  🔒 Protocol:      ${protocol.toUpperCase().padEnd(46)}║
║  🌐 URL:           ${`${protocol}://${host}:${port}`.padEnd(46)}║
║  🔑 Auth:          JWT Bearer Token${' '.repeat(28)}║
║  📊 Observability: OpenTelemetry${' '.repeat(31)}║
║                                                              ║
║  Endpoints:                                                  ║
║    POST  /mcp              MCP message endpoint              ║
║    GET   /health           Health check                      ║
║    GET   /metrics          Metrics endpoint                  ║
║                                                              ║
║  Tools:                                                      ║
║    - process-data          Process user data                 ║
║    - get-profile           Get user profile                  ║
║    - health-check          Health check tool                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
    if (!httpsOptions) {
        console.warn(`
⚠️  WARNING: Running without TLS encryption!
   
   For production, generate certificates:
   
   mkdir -p certs
   openssl req -x509 -newkey rsa:4096 \\
     -keyout certs/key.pem -out certs/cert.pem \\
     -days 365 -nodes -subj "/CN=localhost"
   
   Then set environment variables:
   export TLS_KEY_PATH=./certs/key.pem
   export TLS_CERT_PATH=./certs/cert.pem
    `);
    }
    // ========================================
    // Graceful Shutdown
    // ========================================
    const shutdown = async (signal) => {
        server.logger.info(`Received ${signal}, starting graceful shutdown...`);
        try {
            // Stop accepting new requests
            await server.stop();
            // Allow time for in-flight requests to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            server.logger.info('✅ Server stopped successfully');
            process.exit(0);
        }
        catch (error) {
            server.logger.error('❌ Error during shutdown', error);
            process.exit(1);
        }
    };
    // Handle signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        server.logger.error('Uncaught exception', error);
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
        server.logger.error('Unhandled rejection', new Error(String(reason)), {
            promise: String(promise),
        });
        shutdown('unhandledRejection');
    });
}
// Start server
main().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map