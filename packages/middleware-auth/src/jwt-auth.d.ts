import { Middleware, MiddlewareContext } from '@mcp-accelerator/core';
import jwt from 'jsonwebtoken';
export interface JWTAuthOptions {
    /** Secret key for JWT verification */
    secret: string;
    /** Algorithms allowed for JWT verification */
    algorithms?: jwt.Algorithm[];
    /** Custom header name for token (default: 'authorization') */
    headerName?: string;
    /** Token prefix (default: 'Bearer ') */
    tokenPrefix?: string;
    /** Optional custom verification function */
    verify?: (decoded: any, context: MiddlewareContext) => Promise<boolean> | boolean;
}
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
export declare function createJWTAuthMiddleware(options: JWTAuthOptions): Middleware;
//# sourceMappingURL=jwt-auth.d.ts.map