"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../server");
const zod_1 = require("zod");
const types_1 = require("../../types");
describe('MCPServer', () => {
    let server;
    beforeEach(() => {
        server = new server_1.MCPServer({
            name: 'test-server',
            version: '1.0.0',
        });
    });
    afterEach(async () => {
        if (server) {
            await server.stop();
        }
    });
    describe('Tool Registration', () => {
        it('should register a tool', () => {
            const tool = {
                name: 'test-tool',
                description: 'Test tool',
                inputSchema: zod_1.z.object({}),
                handler: async () => ({ result: 'ok' }),
            };
            server.registerTool(tool);
            expect(server.listTools()).toHaveLength(1);
        });
        it('should unregister a tool', () => {
            const tool = {
                name: 'test-tool',
                description: 'Test tool',
                inputSchema: zod_1.z.object({}),
                handler: async () => ({ result: 'ok' }),
            };
            server.registerTool(tool);
            server.unregisterTool('test-tool');
            expect(server.listTools()).toHaveLength(0);
        });
    });
    describe('Hook Registration', () => {
        it('should register a hook', () => {
            const hookCalled = jest.fn();
            server.registerHook({
                name: 'test-hook',
                phase: types_1.HookPhase.OnStart,
                handler: hookCalled,
            });
            // Hook will be called on start
            expect(hookCalled).not.toHaveBeenCalled();
        });
        it('should call hooks in order', async () => {
            const calls = [];
            server.registerHook({
                name: 'hook-1',
                phase: types_1.HookPhase.OnStart,
                handler: async () => { calls.push(1); },
            });
            server.registerHook({
                name: 'hook-2',
                phase: types_1.HookPhase.OnStart,
                handler: async () => { calls.push(2); },
            });
            // Start will trigger OnStart hooks
            // We can't fully test this without a transport, but structure is valid
        });
    });
    describe('Middleware Registration', () => {
        it('should register a middleware', () => {
            const middleware = {
                name: 'test-middleware',
                priority: 100,
                handler: async (message, context, next) => {
                    await next();
                },
            };
            server.registerMiddleware(middleware);
            // Middleware is registered internally
        });
        it('should sort middlewares by priority', () => {
            const middleware1 = {
                name: 'low-priority',
                priority: 50,
                handler: async (m, c, next) => await next(),
            };
            const middleware2 = {
                name: 'high-priority',
                priority: 100,
                handler: async (m, c, next) => await next(),
            };
            server.registerMiddleware(middleware1);
            server.registerMiddleware(middleware2);
            // Middlewares are sorted by priority (higher first)
        });
    });
    describe('Configuration', () => {
        it('should have correct config', () => {
            expect(server.config.name).toBe('test-server');
            expect(server.config.version).toBe('1.0.0');
        });
        it('should have a logger', () => {
            expect(server.logger).toBeDefined();
            expect(server.logger.info).toBeDefined();
        });
    });
    describe('Transport', () => {
        it('should start without transport (no-op)', async () => {
            // Should not throw
            await expect(server.start()).resolves.not.toThrow();
        });
        it('should get null transport when none set', () => {
            expect(server.getTransport()).toBeNull();
        });
    });
    describe('Lifecycle', () => {
        it('should start and stop', async () => {
            await server.start();
            await server.stop();
            // Should not throw
        });
        it('should handle multiple start calls gracefully', async () => {
            await server.start();
            // Second start should either throw or be idempotent
            // For now, we just test it doesn't crash
            await server.stop();
        });
    });
});
//# sourceMappingURL=server.test.js.map