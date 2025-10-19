"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rate_limiter_1 = require("../rate-limiter");
describe('Rate Limiter Middleware', () => {
    const mockNext = jest.fn();
    const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    describe('createRateLimitMiddleware', () => {
        it('should create middleware with required options', () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 10,
                windowMs: 60000,
            });
            expect(middleware).toBeDefined();
            expect(middleware.name).toBe('rate-limit');
            expect(middleware.priority).toBe(90);
            expect(middleware.handler).toBeInstanceOf(Function);
        });
        it('should create middleware with custom key generator', () => {
            const keyGenerator = jest.fn();
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 10,
                windowMs: 60000,
                keyGenerator,
            });
            expect(middleware).toBeDefined();
        });
        it('should create middleware with custom store', () => {
            const store = {
                increment: jest.fn(),
                resetKey: jest.fn(),
                get: jest.fn(),
            };
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 10,
                windowMs: 60000,
                store,
            });
            expect(middleware).toBeDefined();
        });
    });
    describe('Middleware Handler - Basic Functionality', () => {
        it('should allow requests within limit', async () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 3,
                windowMs: 60000,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            // First request
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit).toEqual({
                limit: 3,
                current: 1,
                remaining: 2,
                reset: expect.any(Number),
            });
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Second request
            mockNext.mockClear();
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit?.current).toBe(2);
            expect(context.metadata.rateLimit?.remaining).toBe(1);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Third request
            mockNext.mockClear();
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit?.current).toBe(3);
            expect(context.metadata.rateLimit?.remaining).toBe(0);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });
        it('should reject requests exceeding limit', async () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 2,
                windowMs: 60000,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            // First and second requests should pass
            await middleware.handler(message, context, mockNext);
            await middleware.handler(message, context, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(2);
            // Third request should fail
            mockNext.mockClear();
            await expect(middleware.handler(message, context, mockNext)).rejects.toThrow('Rate limit exceeded. Maximum 2 requests per 60 seconds.');
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should use custom error message', async () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 1,
                windowMs: 60000,
                message: 'Too many requests, please slow down!',
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            // First request passes
            await middleware.handler(message, context, mockNext);
            // Second request fails with custom message
            await expect(middleware.handler(message, context, mockNext)).rejects.toThrow('Too many requests, please slow down!');
        });
        it('should isolate limits by client ID', async () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 1,
                windowMs: 60000,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context1 = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            const context2 = {
                clientId: 'client-2',
                logger: mockLogger,
                metadata: {},
            };
            // Client 1: First request
            await middleware.handler(message, context1, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Client 2: First request (different client, should pass)
            mockNext.mockClear();
            await middleware.handler(message, context2, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Client 1: Second request (should fail)
            mockNext.mockClear();
            await expect(middleware.handler(message, context1, mockNext)).rejects.toThrow();
            // Client 2: Second request (should also fail)
            await expect(middleware.handler(message, context2, mockNext)).rejects.toThrow();
        });
    });
    describe('Key Generator', () => {
        it('should use custom key generator', async () => {
            const keyGenerator = jest.fn((context) => context.metadata.userId);
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 2,
                windowMs: 60000,
                keyGenerator,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {
                    userId: 'user-123',
                },
            };
            await middleware.handler(message, context, mockNext);
            expect(keyGenerator).toHaveBeenCalledWith(context);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should rate limit by user ID from metadata', async () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 1,
                windowMs: 60000,
                keyGenerator: (context) => context.metadata.user?.id || context.clientId,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const contextUser1 = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {
                    user: { id: 'user-1' },
                },
            };
            const contextUser2 = {
                clientId: 'client-2',
                logger: mockLogger,
                metadata: {
                    user: { id: 'user-2' },
                },
            };
            // User 1: First request
            await middleware.handler(message, contextUser1, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // User 2: First request (different user)
            mockNext.mockClear();
            await middleware.handler(message, contextUser2, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // User 1: Second request (should fail)
            mockNext.mockClear();
            await expect(middleware.handler(message, contextUser1, mockNext)).rejects.toThrow();
        });
    });
    describe('Skip Function', () => {
        it('should skip rate limiting when skip returns true', async () => {
            const skip = jest.fn().mockReturnValue(true);
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 1,
                windowMs: 60000,
                skip,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            // Multiple requests should all pass
            await middleware.handler(message, context, mockNext);
            await middleware.handler(message, context, mockNext);
            await middleware.handler(message, context, mockNext);
            expect(skip).toHaveBeenCalledTimes(3);
            expect(mockNext).toHaveBeenCalledTimes(3);
        });
        it('should apply rate limiting when skip returns false', async () => {
            const skip = jest.fn().mockReturnValue(false);
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 1,
                windowMs: 60000,
                skip,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            // First request passes
            await middleware.handler(message, context, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Second request fails
            await expect(middleware.handler(message, context, mockNext)).rejects.toThrow();
        });
        it('should handle async skip function', async () => {
            const skip = jest.fn().mockResolvedValue(true);
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 1,
                windowMs: 60000,
                skip,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            await middleware.handler(message, context, mockNext);
            expect(skip).toHaveBeenCalledWith(context);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should skip based on user role', async () => {
            const skip = (context) => {
                return context.metadata.user?.role === 'admin';
            };
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 1,
                windowMs: 60000,
                skip,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const adminContext = {
                clientId: 'admin-client',
                logger: mockLogger,
                metadata: {
                    user: { id: 'admin-1', role: 'admin' },
                },
            };
            const userContext = {
                clientId: 'user-client',
                logger: mockLogger,
                metadata: {
                    user: { id: 'user-1', role: 'user' },
                },
            };
            // Admin: Multiple requests should pass
            await middleware.handler(message, adminContext, mockNext);
            await middleware.handler(message, adminContext, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(2);
            // Regular user: Second request should fail
            mockNext.mockClear();
            await middleware.handler(message, userContext, mockNext);
            await expect(middleware.handler(message, userContext, mockNext)).rejects.toThrow();
        });
    });
    describe('Custom Store', () => {
        it('should use custom store', async () => {
            const store = {
                increment: jest.fn().mockResolvedValue(1),
                resetKey: jest.fn().mockResolvedValue(undefined),
                get: jest.fn().mockResolvedValue(0),
            };
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 5,
                windowMs: 60000,
                store,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            await middleware.handler(message, context, mockNext);
            expect(store.increment).toHaveBeenCalledWith('client-1');
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('Rate Limit Metadata', () => {
        it('should add rate limit info to context', async () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 10,
                windowMs: 60000,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit).toBeDefined();
            expect(context.metadata.rateLimit).toHaveProperty('limit', 10);
            expect(context.metadata.rateLimit).toHaveProperty('current', 1);
            expect(context.metadata.rateLimit).toHaveProperty('remaining', 9);
            expect(context.metadata.rateLimit).toHaveProperty('reset');
            expect(typeof context.metadata.rateLimit?.reset).toBe('number');
        });
        it('should update remaining count correctly', async () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 5,
                windowMs: 60000,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            // Request 1
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit?.remaining).toBe(4);
            // Request 2
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit?.remaining).toBe(3);
            // Request 3
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit?.remaining).toBe(2);
        });
        it('should never have negative remaining count', async () => {
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 1,
                windowMs: 60000,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-1',
                logger: mockLogger,
                metadata: {},
            };
            // First request
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit?.remaining).toBe(0);
            // Second request (over limit)
            try {
                await middleware.handler(message, context, mockNext);
            }
            catch (error) {
                // Expected to throw
            }
            expect(context.metadata.rateLimit?.remaining).toBe(0); // Should be 0, not negative
        });
    });
    describe('Memory Store with Custom Store', () => {
        it('should use memory store by default', async () => {
            // Just verify the middleware works with the default memory store
            const middleware = (0, rate_limiter_1.createRateLimitMiddleware)({
                max: 3,
                windowMs: 60000,
            });
            const message = {
                type: 'request',
                id: '1',
                method: 'test',
            };
            const context = {
                clientId: 'client-unique',
                logger: mockLogger,
                metadata: {},
            };
            // Make requests
            await middleware.handler(message, context, mockNext);
            await middleware.handler(message, context, mockNext);
            await middleware.handler(message, context, mockNext);
            expect(context.metadata.rateLimit?.current).toBe(3);
            expect(mockNext).toHaveBeenCalledTimes(3);
        });
    });
    describe('Redis Store', () => {
        it('should create Redis store', () => {
            const mockRedis = {
                incr: jest.fn().mockResolvedValue(1),
                pexpire: jest.fn().mockResolvedValue(1),
                del: jest.fn().mockResolvedValue(1),
                get: jest.fn().mockResolvedValue('0'),
            };
            const store = (0, rate_limiter_1.createRedisStore)(mockRedis, { windowMs: 60000 });
            expect(store).toBeDefined();
            expect(store.increment).toBeInstanceOf(Function);
            expect(store.resetKey).toBeInstanceOf(Function);
            expect(store.get).toBeInstanceOf(Function);
        });
        it('should increment counter in Redis', async () => {
            const mockRedis = {
                incr: jest.fn().mockResolvedValue(1),
                pexpire: jest.fn().mockResolvedValue(1),
                del: jest.fn(),
                get: jest.fn(),
            };
            const store = (0, rate_limiter_1.createRedisStore)(mockRedis, { windowMs: 60000 });
            const count = await store.increment('test-key');
            expect(mockRedis.incr).toHaveBeenCalledWith('ratelimit:test-key');
            expect(mockRedis.pexpire).toHaveBeenCalledWith('ratelimit:test-key', 60000);
            expect(count).toBe(1);
        });
        it('should not set expiry on subsequent increments', async () => {
            const mockRedis = {
                incr: jest.fn()
                    .mockResolvedValueOnce(1)
                    .mockResolvedValueOnce(2),
                pexpire: jest.fn().mockResolvedValue(1),
                del: jest.fn(),
                get: jest.fn(),
            };
            const store = (0, rate_limiter_1.createRedisStore)(mockRedis, { windowMs: 60000 });
            await store.increment('test-key');
            expect(mockRedis.pexpire).toHaveBeenCalledTimes(1);
            await store.increment('test-key');
            expect(mockRedis.pexpire).toHaveBeenCalledTimes(1); // Still 1, not called again
        });
        it('should reset key in Redis', async () => {
            const mockRedis = {
                incr: jest.fn(),
                pexpire: jest.fn(),
                del: jest.fn().mockResolvedValue(1),
                get: jest.fn(),
            };
            const store = (0, rate_limiter_1.createRedisStore)(mockRedis, { windowMs: 60000 });
            await store.resetKey('test-key');
            expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:test-key');
        });
        it('should get count from Redis', async () => {
            const mockRedis = {
                incr: jest.fn(),
                pexpire: jest.fn(),
                del: jest.fn(),
                get: jest.fn().mockResolvedValue('5'),
            };
            const store = (0, rate_limiter_1.createRedisStore)(mockRedis, { windowMs: 60000 });
            const count = await store.get('test-key');
            expect(mockRedis.get).toHaveBeenCalledWith('ratelimit:test-key');
            expect(count).toBe(5);
        });
        it('should handle null value from Redis', async () => {
            const mockRedis = {
                incr: jest.fn(),
                pexpire: jest.fn(),
                del: jest.fn(),
                get: jest.fn().mockResolvedValue(null),
            };
            const store = (0, rate_limiter_1.createRedisStore)(mockRedis, { windowMs: 60000 });
            const count = await store.get('test-key');
            expect(count).toBe(0);
        });
    });
});
//# sourceMappingURL=rate-limiter.test.js.map