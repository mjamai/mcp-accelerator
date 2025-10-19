"use strict";
/**
 * Enhanced Basic STDIO Example - MCP Compliant Echo Server
 *
 * This example demonstrates the enhanced MCP Accelerator Framework with:
 * - Automatic MCP protocol handling (initialize, tools/list, tools/call)
 * - 100% MCP STDIO specification compliance
 * - Type-safe tool registration with Zod validation
 * - Proper error handling and logging
 *
 * Installation:
 *   npm install @mcp-accelerator/core @mcp-accelerator/transport-stdio zod
 *
 * Usage:
 *   node index.js
 *
 * Test with:
 *   echo '{"type":"request","method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"1.0.0"}},"id":"1"}' | node index.ts
 *   echo '{"type":"request","method":"tools/list","id":"2"}' | node index.ts
 *   echo '{"type":"request","method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello MCP!"}},"id":"3"}' | node index.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@mcp-accelerator/core");
const transport_stdio_1 = require("@mcp-accelerator/transport-stdio");
async function main() {
    const server = new core_1.MCPServer({
        name: 'enhanced-basic-stdio-server',
        version: '1.0.0',
    });
    const transport = new transport_stdio_1.StdioTransport();
    await server.setTransport(transport);
    server.registerTool({
        name: 'echo',
        description: 'Echo back the input message with metadata',
        inputSchema: core_1.z.object({
            message: core_1.z.string().describe('Message to echo back'),
            includeTimestamp: core_1.z.boolean().optional().describe('Include timestamp in response'),
            metadata: core_1.z.record(core_1.z.unknown()).optional().describe('Additional metadata to include'),
        }),
        handler: async (input, context) => {
            context.logger.info('Echo tool executed', {
                message: input.message,
                clientId: context.clientId,
            });
            return {
                original: input.message,
                echoed: input.message,
                clientId: context.clientId,
                ...(input.includeTimestamp && { timestamp: new Date().toISOString() }),
                ...(input.metadata && { metadata: input.metadata }),
            };
        },
    });
    server.registerTool({
        name: 'status',
        description: 'Get server status and capabilities',
        inputSchema: core_1.z.object({
            includeDetails: core_1.z.boolean().optional().describe('Include detailed server information'),
        }),
        handler: async (input, context) => {
            context.logger.info('Status tool executed', { clientId: context.clientId });
            const status = server.getStatus();
            if (input.includeDetails) {
                return {
                    ...status,
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    platform: process.platform,
                    nodeVersion: process.version,
                };
            }
            return status;
        },
    });
    server.registerTool({
        name: 'validate_input',
        description: 'Test input validation with various data types',
        inputSchema: core_1.z.object({
            text: core_1.z.string().min(1).describe('Text input (required)'),
            number: core_1.z.number().min(0).max(100).describe('Number between 0 and 100'),
            email: core_1.z.string().email().describe('Valid email address'),
            options: core_1.z.enum(['option1', 'option2', 'option3']).describe('Select from predefined options'),
            tags: core_1.z.array(core_1.z.string()).optional().describe('Array of string tags'),
            config: core_1.z
                .object({
                enabled: core_1.z.boolean(),
                level: core_1.z.number().int().min(1).max(10),
            })
                .optional()
                .describe('Configuration object'),
        }),
        handler: async (input, context) => {
            context.logger.info('Validation tool executed', {
                inputKeys: Object.keys(input),
                clientId: context.clientId,
            });
            return {
                message: 'Input validation successful!',
                validated: input,
                summary: {
                    textLength: input.text.length,
                    numberSquared: input.number * input.number,
                    emailDomain: input.email.split('@')[1],
                    selectedOption: input.options,
                    tagCount: input.tags?.length || 0,
                    configEnabled: input.config?.enabled || false,
                },
            };
        },
    });
    server.registerHook({
        name: 'connection-logger',
        phase: core_1.HookPhase.OnClientConnect,
        handler: async (context) => {
            process.stderr.write(`📡 MCP client connected: ${context.clientId}\n`);
        },
    });
    server.registerHook({
        name: 'disconnection-logger',
        phase: core_1.HookPhase.OnClientDisconnect,
        handler: async (context) => {
            process.stderr.write(`📡 MCP client disconnected: ${context.clientId}\n`);
        },
    });
    server.registerHook({
        name: 'tool-execution-logger',
        phase: core_1.HookPhase.BeforeToolExecution,
        handler: async (context) => {
            process.stderr.write(`🔧 Executing tool: ${context.toolName}\n`);
        },
    });
    try {
        await server.start();
        process.stderr.write('🚀 Enhanced MCP STDIO Server Started Successfully!\n');
        process.stderr.write('================================================\n');
        process.stderr.write('📋 Available tools: echo, status, validate_input\n');
        process.stderr.write('📡 Framework handles: initialize, tools/list, tools/call\n');
        process.stderr.write('💡 Send JSON-RPC messages via stdin\n');
        process.stderr.write('\n🧪 Quick test commands:\n');
        process.stderr.write('Initialize: {"type":"request","method":"initialize","params":{"protocolVersion":"2024-11-05"},"id":"1"}\n');
        process.stderr.write('List tools: {"type":"request","method":"tools/list","id":"2"}\n');
        process.stderr.write('Call echo: {"type":"request","method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello!"}},"id":"3"}\n');
        process.stderr.write('\n✅ Server ready for MCP client connections\n');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        process.stderr.write(`❌ Failed to start server: ${errorMessage}\n`);
        process.exit(1);
    }
    process.on('SIGINT', async () => {
        process.stderr.write('\n🛑 Shutting down server...\n');
        try {
            await server.stop();
            process.stderr.write('✅ Server stopped gracefully\n');
            process.exit(0);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            process.stderr.write(`❌ Error during shutdown: ${errorMessage}\n`);
            process.exit(1);
        }
    });
    process.on('SIGTERM', async () => {
        process.stderr.write('\n🛑 Received SIGTERM, shutting down...\n');
        try {
            await server.stop();
            process.exit(0);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            process.stderr.write(`❌ Error during SIGTERM shutdown: ${errorMessage}\n`);
            process.exit(1);
        }
    });
}
process.on('uncaughtException', (error) => {
    process.stderr.write(`💥 Uncaught exception: ${error.message}\n${error.stack ?? ''}\n`);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    process.stderr.write(`💥 Unhandled promise rejection: ${reason}\n`);
    process.exit(1);
});
main().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.stderr.write(`💥 Fatal error: ${errorMessage}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map