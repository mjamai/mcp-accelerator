/**
 * CORS Configuration for HTTP/SSE Transports
 *
 * Note: CORS is handled at the Fastify level, not as a middleware.
 * This module provides easy configuration helpers.
 */
export interface CORSOptions {
    /** Allowed origins (string, array, or function) */
    origin?: string | string[] | ((origin: string) => boolean | Promise<boolean>);
    /** Allowed HTTP methods */
    methods?: string | string[];
    /** Allowed headers */
    allowedHeaders?: string | string[];
    /** Exposed headers */
    exposedHeaders?: string | string[];
    /** Allow credentials */
    credentials?: boolean;
    /** Max age for preflight cache (seconds) */
    maxAge?: number;
    /** Allow preflight to pass through */
    preflightContinue?: boolean;
    /** Status code for successful OPTIONS request */
    optionsSuccessStatus?: number;
}
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
export declare function createCORSOptions(options?: CORSOptions): any;
/**
 * Preset: Development (allow all)
 */
export declare const developmentCORS: any;
/**
 * Preset: Production (strict)
 */
export declare function productionCORS(allowedOrigins: string[]): any;
/**
 * Preset: Dynamic origin validation
 */
export declare function dynamicOriginCORS(validator: (origin: string) => boolean | Promise<boolean>): any;
//# sourceMappingURL=cors.d.ts.map