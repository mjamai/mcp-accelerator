"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJWTAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * JWT Authentication Middleware
 *
 * Verifies JWT tokens in the Authorization header
 *
 * @example
 * ```typescript
 * import { createJWTAuthMiddleware } from '@mcp-accelerator/middleware-auth';
 *
 * server.registerMiddleware(createJWTAuthMiddleware({
 *   secret: process.env.JWT_SECRET!,
 *   algorithms: ['HS256']
 * }));
 * ```
 */
function createJWTAuthMiddleware(options) {
    const { secret, algorithms = ['HS256'], headerName = 'authorization', tokenPrefix = 'Bearer ', verify: customVerify, } = options;
    return {
        name: 'jwt-auth',
        priority: 100, // High priority - run early
        async handler(message, context, next) {
            // Get token from metadata (transport-specific)
            const authHeader = context.metadata?.[headerName];
            if (!authHeader) {
                throw new Error('Authentication required: No token provided');
            }
            // Extract token
            const token = authHeader.startsWith(tokenPrefix)
                ? authHeader.slice(tokenPrefix.length)
                : authHeader;
            try {
                // Verify JWT
                const decoded = jsonwebtoken_1.default.verify(token, secret, { algorithms });
                // Custom verification if provided
                if (customVerify) {
                    const isValid = await customVerify(decoded, context);
                    if (!isValid) {
                        throw new Error('Token verification failed');
                    }
                }
                // Add decoded token to context for downstream use
                context.metadata = {
                    ...context.metadata,
                    user: typeof decoded === 'object' ? decoded : { id: String(decoded) },
                    authenticated: true,
                };
                // Continue to next middleware
                await next();
            }
            catch (error) {
                if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                    throw new Error(`Invalid token: ${error.message}`);
                }
                if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                    throw new Error('Token has expired');
                }
                throw error;
            }
        },
    };
}
exports.createJWTAuthMiddleware = createJWTAuthMiddleware;
//# sourceMappingURL=jwt-auth.js.map