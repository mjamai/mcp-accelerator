import 'dotenv/config';
import { MCPServer, z } from '@mcp-accelerator/core';
import { HttpTransport } from '@mcp-accelerator/transport-http';
import { 
  createJWTAuthMiddleware, 
  createAPIKeyAuthMiddleware 
} from '@mcp-accelerator/middleware-auth';
import { createRateLimitMiddleware } from '@mcp-accelerator/middleware-ratelimit';

/**
 * Secure MCP API Example
 * 
 * This example demonstrates production-grade security:
 * - API Key authentication for service-to-service
 * - JWT authentication for user requests
 * - Rate limiting (global and per-user)
 * - Custom authorization
 */

// Configuration
const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const API_KEYS = (process.env.API_KEYS || '').split(',').filter(Boolean);

// Create server
const server = new MCPServer({
  name: 'secure-api',
  version: '1.0.0',
});

// Set HTTP transport
server.setTransport(new HttpTransport({ 
  port: PORT,
  host: '0.0.0.0'
}));

// ==========================================
// Layer 1: Global Rate Limiting (Anonymous)
// ==========================================
// Protects against DDoS before any expensive operations
server.registerMiddleware(createRateLimitMiddleware({
  max: 100,
  windowMs: 60 * 1000, // 100 requests per minute
  keyGenerator: (context) => {
    // Use IP address if available, otherwise client ID
    return context.metadata?.ip || context.clientId;
  }
}));

// ==========================================
// Layer 2: Authentication
// ==========================================
// Support both API Key (for services) and JWT (for users)
server.registerMiddleware({
  name: 'flexible-auth',
  priority: 100,
  async handler(message, context, next) {
    const apiKey = context.metadata?.['x-api-key'] as string;
    const authHeader = context.metadata?.['authorization'] as string;

    try {
      // Try API Key first
      if (apiKey) {
        const apiKeyMiddleware = createAPIKeyAuthMiddleware({
          keys: API_KEYS,
          getUserInfo: (key) => ({
            type: 'service',
            apiKey: key,
            plan: 'enterprise' // Services get unlimited
          })
        });
        await apiKeyMiddleware.handler(message, context, async () => {});
      }
      // Try JWT second
      else if (authHeader) {
        const jwtMiddleware = createJWTAuthMiddleware({
          secret: JWT_SECRET,
          algorithms: ['HS256'],
          verify: async (decoded) => {
            // In production, validate against database
            return decoded.userId && decoded.exp > Date.now() / 1000;
          }
        });
        await jwtMiddleware.handler(message, context, async () => {});
      }
      // No auth provided
      else {
        throw new Error('Authentication required');
      }

      await next();
    } catch (error) {
      // Log failed auth attempts
      server.logger.warn('Authentication failed', {
        clientId: context.clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
});

// ==========================================
// Layer 3: User-based Rate Limiting
// ==========================================
// Different limits based on user plan
server.registerMiddleware(createRateLimitMiddleware({
  max: 1000,
  windowMs: 60 * 60 * 1000, // 1000 requests per hour
  keyGenerator: (context) => {
    const user = context.metadata?.user as any;
    return user?.userId || user?.apiKey || context.clientId;
  },
  skip: (context) => {
    // Skip for enterprise/service accounts
    const user = context.metadata?.user as any;
    return user?.plan === 'enterprise' || user?.type === 'service';
  }
}));

// ==========================================
// Layer 4: Custom Authorization
// ==========================================
server.registerMiddleware({
  name: 'authorization',
  priority: 50,
  async handler(message, context, next) {
    const user = context.metadata?.user as any;
    
    // Check if user has necessary permissions
    // In production, load permissions from database
    if (!user?.type && !user?.userId) {
      throw new Error('Invalid user data');
    }

    await next();
  }
});

// ==========================================
// Tools
// ==========================================

// Public information (but still rate-limited)
server.registerTool({
  name: 'get-status',
  description: 'Get API status and rate limit info',
  inputSchema: z.object({}),
  handler: async (input, context) => {
    const rateLimit = context.metadata?.rateLimit as any;
    const user = context.metadata?.user as any;
    
    return {
      status: 'operational',
      authenticated: context.metadata?.authenticated || false,
      user: {
        type: user?.type || 'user',
        plan: user?.plan || 'free'
      },
      rateLimit: rateLimit ? {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetAt: new Date(rateLimit.reset).toISOString()
      } : null,
      timestamp: new Date().toISOString()
    };
  }
});

// Protected resource
server.registerTool({
  name: 'get-user-data',
  description: 'Get authenticated user data',
  inputSchema: z.object({
    fields: z.array(z.string()).optional()
  }),
  handler: async (input, context) => {
    const user = context.metadata?.user as any;
    
    // Simulate fetching from database
    const userData = {
      userId: user.userId || 'service-account',
      type: user.type || 'user',
      plan: user.plan || 'free',
      email: 'user@example.com', // In production, from DB
      createdAt: '2024-01-01T00:00:00Z',
      permissions: ['read', 'write']
    };

    // Filter fields if requested
    if (input.fields && input.fields.length > 0) {
      const filtered: any = {};
      input.fields.forEach(field => {
        if (field in userData) {
          filtered[field] = userData[field as keyof typeof userData];
        }
      });
      return filtered;
    }

    return userData;
  }
});

// Admin-only tool
server.registerTool({
  name: 'admin-action',
  description: 'Perform admin action (requires admin role)',
  inputSchema: z.object({
    action: z.string(),
    target: z.string().optional()
  }),
  handler: async (input, context) => {
    const user = context.metadata?.user as any;
    
    // Check admin permission
    if (!user?.permissions?.includes('admin')) {
      throw new Error('Admin permission required');
    }

    // Perform admin action (simulation)
    return {
      success: true,
      action: input.action,
      target: input.target,
      performedBy: user.userId,
      timestamp: new Date().toISOString()
    };
  }
});

// ==========================================
// Start Server
// ==========================================
await server.start();

console.log(`
🔒 Secure MCP API started on port ${PORT}

Security layers enabled:
  ✓ Global rate limiting (100 req/min)
  ✓ Authentication (JWT + API Key)
  ✓ User-based rate limiting (1000 req/hour)
  ✓ Custom authorization

Test the API:

1. Using API Key (service account):
   curl http://localhost:${PORT}/mcp \\
     -H "X-API-Key: ${API_KEYS[0] || 'key-123'}" \\
     -H "Content-Type: application/json" \\
     -d '{"type":"request","method":"tools/execute","params":{"name":"get-status"}}'

2. Using JWT (user account):
   # First, generate a JWT token with your secret
   # Then:
   curl http://localhost:${PORT}/mcp \\
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{"type":"request","method":"tools/execute","params":{"name":"get-user-data"}}'

3. Check rate limits:
   curl http://localhost:${PORT}/mcp \\
     -H "X-API-Key: ${API_KEYS[0] || 'key-123'}" \\
     -H "Content-Type: application/json" \\
     -d '{"type":"request","method":"tools/execute","params":{"name":"get-status"}}'

Environment variables:
  - JWT_SECRET: ${JWT_SECRET === 'change-this-in-production' ? '⚠️  Using default (CHANGE IN PRODUCTION!)' : '✓ Custom secret set'}
  - API_KEYS: ${API_KEYS.length} keys configured

⚠️  Remember to:
  - Set strong JWT_SECRET in production
  - Use HTTPS/TLS in production
  - Store secrets in a secure vault
  - Monitor authentication failures
`);
