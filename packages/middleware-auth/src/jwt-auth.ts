import { Middleware, MCPMessage, MiddlewareContext } from '@mcp-accelerator/core';
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
export function createJWTAuthMiddleware(options: JWTAuthOptions): Middleware {
  const {
    secret,
    algorithms = ['HS256'],
    headerName = 'authorization',
    tokenPrefix = 'Bearer ',
    verify: customVerify,
  } = options;

  return {
    name: 'jwt-auth',
    priority: 100, // High priority - run early
    
    async handler(message: MCPMessage, context: MiddlewareContext, next: () => Promise<void>) {
      // Get token from metadata (transport-specific)
      const authHeader = context.metadata?.[headerName] as string;
      
      if (!authHeader) {
        throw new Error('Authentication required: No token provided');
      }

      // Extract token
      const token = authHeader.startsWith(tokenPrefix)
        ? authHeader.slice(tokenPrefix.length)
        : authHeader;

      try {
        // Verify JWT
        const decoded = jwt.verify(token, secret, { algorithms });

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
          user: typeof decoded === 'object' ? decoded as any : { id: String(decoded) },
          authenticated: true,
        };

        // Continue to next middleware
        await next();
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          throw new Error(`Invalid token: ${error.message}`);
        }
        if (error instanceof jwt.TokenExpiredError) {
          throw new Error('Token has expired');
        }
        throw error;
      }
    },
  };
}
