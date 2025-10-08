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
export function createCORSOptions(options: CORSOptions = {}): any {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-API-Key', 'X-Client-ID'],
    exposedHeaders = ['X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
    credentials = false,
    maxAge = 86400, // 24 hours
    preflightContinue = false,
    optionsSuccessStatus = 204,
  } = options;

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

/**
 * Preset: Development (allow all)
 */
export const developmentCORS = createCORSOptions({
  origin: '*',
  credentials: false,
});

/**
 * Preset: Production (strict)
 */
export function productionCORS(allowedOrigins: string[]): any {
  return createCORSOptions({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  });
}

/**
 * Preset: Dynamic origin validation
 */
export function dynamicOriginCORS(validator: (origin: string) => boolean | Promise<boolean>): any {
  return createCORSOptions({
    origin: validator,
    credentials: true,
  });
}
