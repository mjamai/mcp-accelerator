"use strict";
/**
 * CORS Configuration for HTTP/SSE Transports
 *
 * Note: CORS is handled at the Fastify level, not as a middleware.
 * This module provides easy configuration helpers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicOriginCORS = exports.productionCORS = exports.developmentCORS = exports.createCORSOptions = void 0;
/**
 * Create CORS options for HTTP/SSE transports
 *
 * @example
 * ```typescript
 * import { createCORSOptions } from '@mcp-accelerator/middleware-cors';
 * import { HttpTransport } from '@mcp-accelerator/transport-http';
 *
 * const cors = createCORSOptions({
 *   origin: ['https://example.com', 'https://app.example.com'],
 *   credentials: true
 * });
 *
 * // Use with custom HTTP transport configuration
 * ```
 */
function createCORSOptions(options = {}) {
    const { origin = '*', methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders = ['Content-Type', 'Authorization', 'X-API-Key', 'X-Client-ID'], exposedHeaders = ['X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'], credentials = false, maxAge = 86400, // 24 hours
    preflightContinue = false, optionsSuccessStatus = 204, } = options;
    return {
        origin,
        methods,
        allowedHeaders,
        exposedHeaders,
        credentials,
        maxAge,
        preflightContinue,
        optionsSuccessStatus,
    };
}
exports.createCORSOptions = createCORSOptions;
/**
 * Preset: Development (allow all)
 */
exports.developmentCORS = createCORSOptions({
    origin: '*',
    credentials: false,
});
/**
 * Preset: Production (strict)
 */
function productionCORS(allowedOrigins) {
    return createCORSOptions({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
    });
}
exports.productionCORS = productionCORS;
/**
 * Preset: Dynamic origin validation
 */
function dynamicOriginCORS(validator) {
    return createCORSOptions({
        origin: validator,
        credentials: true,
    });
}
exports.dynamicOriginCORS = dynamicOriginCORS;
//# sourceMappingURL=cors.js.map