"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../../core/server");
const default_security_1 = require("../default-security");
const types_1 = require("../../types");
const logger_1 = require("../../core/logger");
jest.mock('@mcp-accelerator/middleware-auth', () => ({
    createJWTAuthMiddleware: jest.fn(() => ({ name: 'jwt', priority: 100, handler: jest.fn() })),
    createAPIKeyAuthMiddleware: jest.fn(() => ({ name: 'api-key', priority: 100, handler: jest.fn() })),
}), { virtual: true });
jest.mock('@mcp-accelerator/middleware-ratelimit', () => ({
    createRateLimitMiddleware: jest.fn(() => ({ name: 'rate-limit', priority: 90, handler: jest.fn() })),
}), { virtual: true });
const shutdownObservabilityMock = jest.fn(async () => undefined);
jest.mock('@mcp-accelerator/middleware-observability', () => ({
    createTracingMiddleware: jest.fn(() => ({ name: 'tracing', priority: 110, handler: jest.fn() })),
    createTracingHooks: jest.fn(() => [{ name: 'trace-hook', phase: types_1.HookPhase.OnRequest, handler: jest.fn() }]),
    createMetricsHooks: jest.fn(() => [{ name: 'metrics-hook', phase: types_1.HookPhase.OnResponse, handler: jest.fn() }]),
    initializeObservability: jest.fn(async () => undefined),
    shutdownObservability: shutdownObservabilityMock,
}), { virtual: true });
describe('applyDefaultSecurity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.MCP_JWT_SECRET;
        delete process.env.MCP_API_KEYS;
        delete process.env.MCP_RATE_LIMIT_MAX;
        delete process.env.MCP_RATE_LIMIT_WINDOW_MS;
        delete process.env.OTEL_SERVICE_NAME;
    });
    it('registers JWT, rate limit, and observability middleware when configured', async () => {
        const server = new server_1.MCPServer({
            name: 'security-test',
            version: '1.0.0',
            logger: new logger_1.SilentLogger(),
        });
        await (0, default_security_1.applyDefaultSecurity)(server, {
            auth: {
                jwt: { secret: 'secret' },
            },
            rateLimit: {
                max: 10,
                windowMs: 1000,
            },
            observability: {
                serviceName: 'security-test',
            },
        });
        const middlewares = server.middlewares;
        expect(middlewares.some((mw) => mw.name === 'jwt')).toBe(true);
        expect(middlewares.some((mw) => mw.name === 'rate-limit')).toBe(true);
        expect(middlewares.some((mw) => mw.name === 'tracing')).toBe(true);
        const hooks = server.hooks;
        const hookNames = Array.from(hooks.values())
            .flat()
            .map((hook) => hook.name);
        expect(hookNames).toEqual(expect.arrayContaining(['trace-hook', 'metrics-hook', 'observability-shutdown']));
    });
    it('reads configuration from environment variables', async () => {
        process.env.MCP_JWT_SECRET = 'env-secret';
        process.env.MCP_RATE_LIMIT_MAX = '50';
        process.env.MCP_RATE_LIMIT_WINDOW_MS = '60000';
        process.env.OTEL_SERVICE_NAME = 'env-service';
        const server = new server_1.MCPServer({
            name: 'env-test',
            version: '1.0.0',
            logger: new logger_1.SilentLogger(),
        });
        await (0, default_security_1.applyDefaultSecurity)(server);
        const middlewares = server.middlewares;
        expect(middlewares.some((mw) => mw.name === 'jwt')).toBe(true);
        expect(middlewares.some((mw) => mw.name === 'rate-limit')).toBe(true);
    });
});
//# sourceMappingURL=default-security.test.js.map