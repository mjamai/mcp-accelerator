import { MCPServer } from '../../core/server';
import { applyDefaultSecurity } from '../default-security';
import { HookPhase } from '../../types';
import { SilentLogger } from '../../core/logger';

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
  createTracingHooks: jest.fn(() => [{ name: 'trace-hook', phase: HookPhase.OnRequest, handler: jest.fn() }]),
  createMetricsHooks: jest.fn(() => [{ name: 'metrics-hook', phase: HookPhase.OnResponse, handler: jest.fn() }]),
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
    const server = new MCPServer({
      name: 'security-test',
      version: '1.0.0',
      logger: new SilentLogger(),
    });

    await applyDefaultSecurity(server, {
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

    const middlewares = (server as any).middlewares as unknown[];
    expect(middlewares.some((mw) => (mw as any).name === 'jwt')).toBe(true);
    expect(middlewares.some((mw) => (mw as any).name === 'rate-limit')).toBe(true);
    expect(middlewares.some((mw) => (mw as any).name === 'tracing')).toBe(true);

    const hooks = (server as any).hooks as Map<HookPhase, unknown[]>;
    const hookNames = Array.from(hooks.values())
      .flat()
      .map((hook) => (hook as any).name);
    expect(hookNames).toEqual(expect.arrayContaining(['trace-hook', 'metrics-hook', 'observability-shutdown']));
  });

  it('reads configuration from environment variables', async () => {
    process.env.MCP_JWT_SECRET = 'env-secret';
    process.env.MCP_RATE_LIMIT_MAX = '50';
    process.env.MCP_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.OTEL_SERVICE_NAME = 'env-service';

    const server = new MCPServer({
      name: 'env-test',
      version: '1.0.0',
      logger: new SilentLogger(),
    });

    await applyDefaultSecurity(server);

    const middlewares = (server as any).middlewares as unknown[];
    expect(middlewares.some((mw) => (mw as any).name === 'jwt')).toBe(true);
    expect(middlewares.some((mw) => (mw as any).name === 'rate-limit')).toBe(true);
  });
});
