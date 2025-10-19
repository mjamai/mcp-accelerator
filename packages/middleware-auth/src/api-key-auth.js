"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAPIKeyAuthMiddleware = void 0;
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
function createAPIKeyAuthMiddleware(options) {
    const { keys, headerName = 'x-api-key', getUserInfo, } = options;
    return {
        name: 'api-key-auth',
        priority: 100, // High priority - run early
        async handler(message, context, next) {
            // Get API key from metadata
            const apiKey = context.metadata?.[headerName];
            if (!apiKey) {
                throw new Error('Authentication required: No API key provided');
            }
            // Validate API key
            let isValid = false;
            if (Array.isArray(keys)) {
                isValid = keys.includes(apiKey);
            }
            else {
                isValid = await keys(apiKey);
            }
            if (!isValid) {
                throw new Error('Invalid API key');
            }
            // Get user info if function provided
            let userInfo = { id: apiKey, apiKey };
            if (getUserInfo) {
                const customInfo = await getUserInfo(apiKey);
                userInfo = { id: apiKey, ...customInfo };
            }
            // Add to context
            context.metadata = {
                ...context.metadata,
                user: userInfo,
                authenticated: true,
            };
            await next();
        },
    };
}
exports.createAPIKeyAuthMiddleware = createAPIKeyAuthMiddleware;
//# sourceMappingURL=api-key-auth.js.map