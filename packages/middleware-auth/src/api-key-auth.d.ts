import { Middleware } from '@mcp-accelerator/core';
export interface APIKeyAuthOptions {
    /** Valid API keys (can be array or async function) */
    keys: string[] | ((key: string) => Promise<boolean> | boolean);
    /** Custom header name for API key (default: 'x-api-key') */
    headerName?: string;
    /** Optional function to get additional user info from API key */
    getUserInfo?: (key: string) => Promise<any> | any;
}
/**
 * API Key Authentication Middleware
 *
 * Verifies API keys from request headers
 *
 * @example
 * ```typescript
 * import { createAPIKeyAuthMiddleware } from '@mcp-accelerator/middleware-auth';
 *
 * // Simple array of keys
 * server.registerMiddleware(createAPIKeyAuthMiddleware({
 *   keys: ['key1', 'key2', 'key3']
 * }));
 *
 * // Or async validation (database lookup)
 * server.registerMiddleware(createAPIKeyAuthMiddleware({
 *   keys: async (key) => {
 *     const exists = await db.apiKeys.findOne({ key });
 *     return !!exists;
 *   },
 *   getUserInfo: async (key) => {
 *     return await db.users.findByApiKey(key);
 *   }
 * }));
 * ```
 */
export declare function createAPIKeyAuthMiddleware(options: APIKeyAuthOptions): Middleware;
//# sourceMappingURL=api-key-auth.d.ts.map