"use strict";
/**
 * Custom plugin example - Authentication and authorization
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@mcp-accelerator/core");
const transport_http_1 = require("@mcp-accelerator/transport-http");
/**
 * Simple authentication plugin
 */
class AuthPlugin {
    name = 'auth-plugin';
    version = '1.0.0';
    priority = 100; // High priority to run early
    validTokens = new Set(['secret-token-123', 'admin-token-456']);
    async initialize(server) {
        server.logger.info('Initializing authentication plugin');
        // Add authentication middleware
        server.registerMiddleware({
            name: 'auth-middleware',
            priority: 100,
            handler: async (message, context, next) => {
                // Allow handshake and discovery without token
                if (message.method === 'initialize' || message.method === 'tools/list') {
                    return next();
                }
                const token = context.metadata?.['x-auth-token'] ??
                    context.metadata?.authorization;
                if (!token || !this.validTokens.has(token)) {
                    throw new Error('Unauthorized: Invalid or missing token');
                }
                context.metadata = {
                    ...context.metadata,
                    authenticated: true,
                };
                context.logger.info('Request authenticated', { clientId: context.clientId });
                await next();
            },
        });
        // Add hook to log authentication attempts
        server.registerHook({
            name: 'auth-log-hook',
            phase: core_1.HookPhase.BeforeToolExecution,
            handler: async (ctx) => {
                server.logger.info('Authenticated tool execution', {
                    tool: ctx.toolName,
                    clientId: ctx.clientId,
                });
            },
        });
    }
    async cleanup() {
        // Cleanup if needed
    }
}
async function main() {
    const server = new core_1.MCPServer({
        name: 'authenticated-server',
        version: '1.0.0',
        plugins: [new AuthPlugin()],
    });
    await server.setTransport(new transport_http_1.HttpTransport({
        host: '127.0.0.1',
        port: 3000,
    }));
    // Register protected tools
    server.registerTool({
        name: 'secret-operation',
        description: 'A protected operation that requires authentication',
        inputSchema: core_1.z.object({
            data: core_1.z.string().describe('Secret data to process'),
        }),
        handler: async (input, context) => {
            context.logger.info('Processing secret operation');
            return {
                processed: `Securely processed: ${input.data}`,
                timestamp: new Date().toISOString(),
            };
        },
    });
    await server.start();
    console.log('Authenticated server is running on http://127.0.0.1:3000');
    console.log('\nTo make requests, include a valid token:');
    console.log('Valid tokens: secret-token-123, admin-token-456');
    console.log('\nExample request:');
    console.log('POST http://127.0.0.1:3000/mcp');
    console.log('Headers: { "x-auth-token": "secret-token-123" }');
    process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await server.stop();
        process.exit(0);
    });
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map