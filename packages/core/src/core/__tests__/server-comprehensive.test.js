"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../server");
const types_1 = require("../../types");
const zod_1 = require("zod");
describe('MCPServer - Comprehensive Tests', () => {
    let server;
    let mockTransport;
    let mockLogger;
    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        };
        mockTransport = {
            name: 'mock-transport',
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue(undefined),
            send: jest.fn().mockResolvedValue(undefined),
            broadcast: jest.fn().mockResolvedValue(undefined),
            onConnect: jest.fn(),
            onDisconnect: jest.fn(),
            onMessage: jest.fn(),
        };
        const config = {
            name: 'test-server',
            version: '1.0.0',
            logger: mockLogger,
        };
        server = new server_1.MCPServer(config);
    });
    describe('Transport Management', () => {
        it('should set transport when server is not running', async () => {
            await server.setTransport(mockTransport);
            expect(server.getTransport()).toBe(mockTransport);
            expect(mockTransport.onConnect).toHaveBeenCalled();
            expect(mockTransport.onDisconnect).toHaveBeenCalled();
            expect(mockTransport.onMessage).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Transport set to: mock-transport');
        });
        it('should stop old transport when setting new one while running', async () => {
            const oldTransport = {
                name: 'old-transport',
                start: jest.fn().mockResolvedValue(undefined),
                stop: jest.fn().mockResolvedValue(undefined),
                send: jest.fn().mockResolvedValue(undefined),
                broadcast: jest.fn().mockResolvedValue(undefined),
                onConnect: jest.fn(),
                onDisconnect: jest.fn(),
                onMessage: jest.fn(),
            };
            await server.setTransport(oldTransport);
            await server.start();
            await server.setTransport(mockTransport);
            expect(oldTransport.stop).toHaveBeenCalled();
            expect(mockTransport.start).toHaveBeenCalled();
        });
        it('should return null when no transport is set', () => {
            expect(server.getTransport()).toBeNull();
        });
    });
    describe('Server Lifecycle', () => {
        it('should start server with transport', async () => {
            await server.setTransport(mockTransport);
            await server.start();
            expect(mockTransport.start).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Starting MCP Server...');
            expect(mockLogger.info).toHaveBeenCalledWith('MCP Server started successfully');
        });
        it('should start server without transport', async () => {
            await server.start();
            expect(mockLogger.info).toHaveBeenCalledWith('Starting MCP Server...');
            expect(mockLogger.info).toHaveBeenCalledWith('MCP Server started successfully');
        });
        it('should warn when starting already running server', async () => {
            await server.start();
            await server.start();
            expect(mockLogger.warn).toHaveBeenCalledWith('Server is already running');
        });
        it('should stop server with transport', async () => {
            await server.setTransport(mockTransport);
            await server.start();
            await server.stop();
            expect(mockTransport.stop).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Stopping MCP Server...');
            expect(mockLogger.info).toHaveBeenCalledWith('MCP Server stopped');
        });
        it('should warn when stopping non-running server', async () => {
            await server.stop();
            expect(mockLogger.warn).toHaveBeenCalledWith('Server is not running');
        });
        it('should execute onStart hooks', async () => {
            const hookHandler = jest.fn();
            server.registerHook({
                name: 'onStart-hook',
                phase: types_1.HookPhase.OnStart,
                handler: hookHandler,
            });
            await server.start();
            expect(hookHandler).toHaveBeenCalledWith({
                event: types_1.HookPhase.OnStart,
                data: {},
            });
        });
        it('should execute onStop hooks', async () => {
            const hookHandler = jest.fn();
            server.registerHook({
                name: 'onStop-hook',
                phase: types_1.HookPhase.OnStop,
                handler: hookHandler,
            });
            await server.start();
            await server.stop();
            expect(hookHandler).toHaveBeenCalledWith({
                event: types_1.HookPhase.OnStop,
                data: {},
            });
        });
    });
    describe('Plugin Loading', () => {
        it('should load plugins on start', async () => {
            const mockPlugin = {
                name: 'test-plugin',
                version: '1.0.0',
                initialize: jest.fn().mockResolvedValue(undefined),
            };
            const config = {
                name: 'test-server',
                version: '1.0.0',
                logger: mockLogger,
                plugins: [mockPlugin],
            };
            server = new server_1.MCPServer(config);
            await server.start();
            expect(mockPlugin.initialize).toHaveBeenCalledWith(server);
            expect(mockLogger.info).toHaveBeenCalledWith('Loading plugin: test-plugin v1.0.0');
            expect(mockLogger.info).toHaveBeenCalledWith('Plugin loaded: test-plugin');
        });
        it('should handle plugin loading failure', async () => {
            const mockPlugin = {
                name: 'failing-plugin',
                version: '1.0.0',
                initialize: jest.fn().mockRejectedValue(new Error('Init failed')),
            };
            const config = {
                name: 'test-server',
                version: '1.0.0',
                logger: mockLogger,
                plugins: [mockPlugin],
            };
            server = new server_1.MCPServer(config);
            await expect(server.start()).rejects.toThrow('Init failed');
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to load plugin: failing-plugin', expect.any(Error));
        });
        it('should load multiple plugins in order', async () => {
            const plugin1 = {
                name: 'plugin-1',
                version: '1.0.0',
                initialize: jest.fn().mockResolvedValue(undefined),
            };
            const plugin2 = {
                name: 'plugin-2',
                version: '2.0.0',
                initialize: jest.fn().mockResolvedValue(undefined),
            };
            const config = {
                name: 'test-server',
                version: '1.0.0',
                logger: mockLogger,
                plugins: [plugin1, plugin2],
            };
            server = new server_1.MCPServer(config);
            await server.start();
            expect(plugin1.initialize).toHaveBeenCalled();
            expect(plugin2.initialize).toHaveBeenCalled();
        });
    });
    describe('Client Connection Handling', () => {
        it('should handle client connect', async () => {
            const hookHandler = jest.fn();
            server.registerHook({
                name: 'connect-hook',
                phase: types_1.HookPhase.OnClientConnect,
                handler: hookHandler,
            });
            await server.setTransport(mockTransport);
            // Simulate client connect
            const onConnectCallback = mockTransport.onConnect.mock.calls[0][0];
            await onConnectCallback('client-123');
            expect(mockLogger.info).toHaveBeenCalledWith('Client connected: client-123');
            expect(hookHandler).toHaveBeenCalledWith({
                event: types_1.HookPhase.OnClientConnect,
                data: { clientId: 'client-123' },
            });
        });
        it('should handle client disconnect', async () => {
            const hookHandler = jest.fn();
            server.registerHook({
                name: 'disconnect-hook',
                phase: types_1.HookPhase.OnClientDisconnect,
                handler: hookHandler,
            });
            await server.setTransport(mockTransport);
            // Simulate client disconnect
            const onDisconnectCallback = mockTransport.onDisconnect.mock.calls[0][0];
            await onDisconnectCallback('client-123');
            expect(mockLogger.info).toHaveBeenCalledWith('Client disconnected: client-123');
            expect(hookHandler).toHaveBeenCalledWith({
                event: types_1.HookPhase.OnClientDisconnect,
                data: { clientId: 'client-123' },
            });
        });
    });
    describe('Message Handling', () => {
        let onMessageCallback;
        let dispatchMessage;
        beforeEach(async () => {
            await server.setTransport(mockTransport);
            await server.start();
            onMessageCallback = mockTransport.onMessage.mock.calls[0][0];
            dispatchMessage = async (message) => {
                await Promise.resolve(onMessageCallback('client-1', message));
            };
            await dispatchMessage({
                type: 'request',
                id: 'init-1',
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    clientInfo: { name: 'test-client', version: '1.0.0' },
                },
            });
            mockTransport.send.mockClear();
        });
        it('should handle tools/list request', async () => {
            const tool = {
                name: 'test-tool',
                description: 'A test tool',
                inputSchema: zod_1.z.any(),
                handler: jest.fn(),
            };
            server.registerTool(tool);
            const message = {
                type: 'request',
                id: 'msg-1',
                method: 'tools/list',
            };
            await dispatchMessage(message);
            expect(mockTransport.send).toHaveBeenCalledWith('client-1', {
                type: 'response',
                id: 'msg-1',
                result: {
                    tools: expect.arrayContaining([
                        expect.objectContaining({ name: 'test-tool' }),
                    ]),
                },
            });
        });
        it('should handle tools/call request successfully', async () => {
            const toolHandler = jest.fn().mockResolvedValue({ result: 'success' });
            const tool = {
                name: 'echo-tool',
                description: 'Echo tool',
                inputSchema: zod_1.z.any(),
                handler: toolHandler,
            };
            server.registerTool(tool);
            const message = {
                type: 'request',
                id: 'msg-2',
                method: 'tools/call',
                params: {
                    name: 'echo-tool',
                    arguments: { text: 'hello' },
                },
            };
            await dispatchMessage(message);
            expect(toolHandler).toHaveBeenCalledWith({ text: 'hello' }, expect.objectContaining({
                clientId: 'client-1',
                logger: mockLogger,
            }));
            expect(mockTransport.send).toHaveBeenCalledWith('client-1', {
                type: 'response',
                id: 'msg-2',
                result: expect.objectContaining({
                    content: expect.arrayContaining([
                        expect.objectContaining({
                            type: 'text',
                            text: expect.stringContaining('success'),
                        }),
                    ]),
                }),
            });
        });
        it('should handle tools/call with missing tool name', async () => {
            const message = {
                type: 'request',
                id: 'msg-3',
                method: 'tools/call',
                params: {},
            };
            await dispatchMessage(message);
            expect(mockTransport.send).toHaveBeenCalledWith('client-1', expect.objectContaining({
                type: 'error',
                id: 'msg-3',
                error: expect.objectContaining({
                    message: expect.stringContaining('Missing tool name'),
                }),
            }));
        });
        it('should handle unknown method', async () => {
            const message = {
                type: 'request',
                id: 'msg-4',
                method: 'unknown/method',
            };
            await dispatchMessage(message);
            expect(mockTransport.send).toHaveBeenCalledWith('client-1', expect.objectContaining({
                type: 'error',
                id: 'msg-4',
                error: expect.objectContaining({
                    message: expect.stringContaining('Method not found'),
                }),
            }));
        });
        it('should handle request with missing method', async () => {
            const message = {
                type: 'request',
                id: 'msg-5',
            };
            await dispatchMessage(message);
            expect(mockTransport.send).toHaveBeenCalledWith('client-1', expect.objectContaining({
                type: 'error',
                id: 'msg-5',
                error: expect.objectContaining({
                    message: expect.stringContaining('Missing method'),
                }),
            }));
        });
        it('should execute beforeToolExecution hooks', async () => {
            const hookHandler = jest.fn();
            server.registerHook({
                name: 'before-hook',
                phase: types_1.HookPhase.BeforeToolExecution,
                handler: hookHandler,
            });
            const tool = {
                name: 'hooked-tool',
                description: 'Tool with hooks',
                inputSchema: zod_1.z.any(),
                handler: jest.fn().mockResolvedValue({ result: 'ok' }),
            };
            server.registerTool(tool);
            const message = {
                type: 'request',
                id: 'msg-6',
                method: 'tools/call',
                params: {
                    name: 'hooked-tool',
                    arguments: {},
                },
            };
            await dispatchMessage(message);
            expect(hookHandler).toHaveBeenCalledWith({
                event: types_1.HookPhase.BeforeToolExecution,
                data: { clientId: 'client-1', toolName: 'hooked-tool' },
            });
        });
        it('should execute afterToolExecution hooks', async () => {
            const hookHandler = jest.fn();
            server.registerHook({
                name: 'after-hook',
                phase: types_1.HookPhase.AfterToolExecution,
                handler: hookHandler,
            });
            const tool = {
                name: 'hooked-tool',
                description: 'Tool with hooks',
                inputSchema: zod_1.z.any(),
                handler: jest.fn().mockResolvedValue({ result: 'ok' }),
            };
            server.registerTool(tool);
            const message = {
                type: 'request',
                id: 'msg-7',
                method: 'tools/call',
                params: {
                    name: 'hooked-tool',
                    arguments: {},
                },
            };
            await dispatchMessage(message);
            expect(hookHandler).toHaveBeenCalledWith({
                event: types_1.HookPhase.AfterToolExecution,
                data: expect.objectContaining({
                    clientId: 'client-1',
                    toolName: 'hooked-tool',
                    result: expect.any(Object),
                }),
            });
        });
        it('should handle tool execution failure', async () => {
            const tool = {
                name: 'failing-tool',
                description: 'Tool that fails',
                inputSchema: zod_1.z.any(),
                handler: jest.fn().mockRejectedValue(new Error('Tool failed')),
            };
            server.registerTool(tool);
            const message = {
                type: 'request',
                id: 'msg-8',
                method: 'tools/call',
                params: {
                    name: 'failing-tool',
                    arguments: {},
                },
            };
            await dispatchMessage(message);
            expect(mockTransport.send).toHaveBeenCalledWith('client-1', {
                type: 'error',
                id: 'msg-8',
                error: expect.objectContaining({
                    message: 'Tool failed',
                }),
            });
        });
    });
    describe('Middleware Execution', () => {
        let dispatchMessage;
        beforeEach(async () => {
            await server.setTransport(mockTransport);
            await server.start();
            const handler = mockTransport.onMessage.mock.calls[0][0];
            dispatchMessage = async (message) => {
                await Promise.resolve(handler('client-1', message));
            };
            await dispatchMessage({
                type: 'request',
                id: 'init-1',
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    clientInfo: { name: 'test-client', version: '1.0.0' },
                },
            });
            mockTransport.send.mockClear();
        });
        it('should execute middleware in priority order', async () => {
            const executionOrder = [];
            const middleware1 = {
                name: 'middleware-1',
                priority: 50,
                handler: async (msg, ctx, next) => {
                    executionOrder.push('mid1-before');
                    await next();
                    executionOrder.push('mid1-after');
                },
            };
            const middleware2 = {
                name: 'middleware-2',
                priority: 100, // Higher priority, runs first
                handler: async (msg, ctx, next) => {
                    executionOrder.push('mid2-before');
                    await next();
                    executionOrder.push('mid2-after');
                },
            };
            server.registerMiddleware(middleware1);
            server.registerMiddleware(middleware2);
            const message = {
                type: 'request',
                id: 'msg-9',
                method: 'tools/list',
            };
            await dispatchMessage(message);
            expect(executionOrder).toEqual([
                'mid2-before',
                'mid1-before',
                'mid1-after',
                'mid2-after',
            ]);
        });
        it('should stop middleware chain if next is not called', async () => {
            const middleware1 = {
                name: 'blocking-middleware',
                priority: 100,
                handler: async (msg, ctx, next) => {
                    // Don't call next()
                    throw new Error('Blocked by middleware');
                },
            };
            server.registerMiddleware(middleware1);
            const message = {
                type: 'request',
                id: 'msg-10',
                method: 'tools/list',
            };
            await dispatchMessage(message);
            expect(mockTransport.send).toHaveBeenCalledWith('client-1', {
                type: 'error',
                id: 'msg-10',
                error: expect.objectContaining({
                    message: 'Blocked by middleware',
                }),
            });
        });
        it('should pass context through middlewares', async () => {
            let capturedContext;
            const middleware = {
                name: 'context-middleware',
                priority: 100,
                handler: async (msg, ctx, next) => {
                    capturedContext = ctx;
                    await next();
                },
            };
            server.registerMiddleware(middleware);
            const message = {
                type: 'request',
                id: 'msg-11',
                method: 'tools/list',
            };
            await dispatchMessage(message);
            expect(capturedContext).toEqual({
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            });
        });
    });
    describe('Hook Execution', () => {
        it('should handle hook execution errors gracefully', async () => {
            const failingHook = {
                name: 'failing-hook',
                phase: types_1.HookPhase.OnStart,
                handler: jest.fn().mockRejectedValue(new Error('Hook failed')),
            };
            server.registerHook(failingHook);
            await server.start();
            expect(mockLogger.error).toHaveBeenCalledWith('Hook execution failed: failing-hook', expect.any(Error));
            // Server should still start despite hook failure
            expect(mockLogger.info).toHaveBeenCalledWith('MCP Server started successfully');
        });
        it('should execute multiple hooks for same phase', async () => {
            const hook1Handler = jest.fn();
            const hook2Handler = jest.fn();
            server.registerHook({
                name: 'hook-1',
                phase: types_1.HookPhase.OnStart,
                handler: hook1Handler,
            });
            server.registerHook({
                name: 'hook-2',
                phase: types_1.HookPhase.OnStart,
                handler: hook2Handler,
            });
            await server.start();
            expect(hook1Handler).toHaveBeenCalled();
            expect(hook2Handler).toHaveBeenCalled();
        });
    });
    describe('Server Status', () => {
        it('should return correct status when server is not running', () => {
            const status = server.getStatus();
            expect(status).toEqual(expect.objectContaining({
                name: 'test-server',
                version: '1.0.0',
                isRunning: false,
                transport: null,
                toolsCount: 0,
                clientsCount: 0,
            }));
            expect(status.capabilities).toBeDefined();
        });
        it('should return correct status when server is running', async () => {
            await server.setTransport(mockTransport);
            const tool = {
                name: 'status-tool',
                description: 'Test tool',
                inputSchema: zod_1.z.any(),
                handler: jest.fn(),
            };
            server.registerTool(tool);
            await server.start();
            const status = server.getStatus();
            expect(status).toEqual(expect.objectContaining({
                name: 'test-server',
                version: '1.0.0',
                isRunning: true,
                transport: 'mock-transport',
                toolsCount: 1,
                clientsCount: 0,
            }));
            expect(status.capabilities).toBeDefined();
            expect(status.initialized).toBe(false);
        });
        it('should track connected clients count', async () => {
            await server.setTransport(mockTransport);
            await server.start();
            // Simulate client connections
            const onConnectCallback = mockTransport.onConnect.mock.calls[0][0];
            await onConnectCallback('client-1');
            await onConnectCallback('client-2');
            const status = server.getStatus();
            expect(status.clientsCount).toBe(2);
            // Simulate disconnect
            const onDisconnectCallback = mockTransport.onDisconnect.mock.calls[0][0];
            await onDisconnectCallback('client-1');
            const updatedStatus = server.getStatus();
            expect(updatedStatus.clientsCount).toBe(1);
        });
        it('should clear clients on stop', async () => {
            await server.setTransport(mockTransport);
            await server.start();
            const onConnectCallback = mockTransport.onConnect.mock.calls[0][0];
            await onConnectCallback('client-1');
            await onConnectCallback('client-2');
            await server.stop();
            const status = server.getStatus();
            expect(status.clientsCount).toBe(0);
        });
    });
});
//# sourceMappingURL=server-comprehensive.test.js.map