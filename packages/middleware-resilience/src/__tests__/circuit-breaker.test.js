"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const circuit_breaker_1 = require("../circuit-breaker");
const core_1 = require("@mcp-accelerator/core");
describe('Circuit Breaker Middleware', () => {
    let mockMessage;
    let mockContext;
    beforeEach(() => {
        mockMessage = {
            type: 'request',
            method: 'test',
            id: '123',
        };
        mockContext = {
            clientId: 'test-client',
            logger: new core_1.SilentLogger(),
            metadata: {},
        };
    });
    it('should pass through requests when circuit is closed', async () => {
        const middleware = (0, circuit_breaker_1.createCircuitBreakerMiddleware)({
            failureThreshold: 3,
        });
        const next = jest.fn().mockResolvedValue(undefined);
        await middleware.handler(mockMessage, mockContext, next);
        expect(next).toHaveBeenCalled();
    });
    it('should open circuit after failure threshold', async () => {
        const middleware = (0, circuit_breaker_1.createCircuitBreakerMiddleware)({
            failureThreshold: 3,
            timeout: 1000,
        });
        const next = jest.fn().mockRejectedValue(new Error('Service error'));
        // Fail 3 times to open circuit
        for (let i = 0; i < 3; i++) {
            try {
                await middleware.handler(mockMessage, mockContext, next);
            }
            catch (error) {
                // Expected to fail
            }
        }
        // Circuit should now be open - next request should fail immediately
        await expect(middleware.handler(mockMessage, mockContext, next)).rejects.toThrow('Circuit breaker is open');
    });
    it('should transition to half-open after timeout', async () => {
        const middleware = (0, circuit_breaker_1.createCircuitBreakerMiddleware)({
            failureThreshold: 2,
            timeout: 100, // Short timeout for testing
        });
        const next = jest.fn().mockRejectedValue(new Error('Service error'));
        // Open the circuit
        for (let i = 0; i < 2; i++) {
            try {
                await middleware.handler(mockMessage, mockContext, next);
            }
            catch (error) {
                // Expected to fail
            }
        }
        // Wait for timeout
        await new Promise(resolve => setTimeout(resolve, 150));
        // Should allow one request (half-open state)
        next.mockResolvedValueOnce(undefined);
        await expect(middleware.handler(mockMessage, mockContext, next)).resolves.not.toThrow();
    });
    it('should call onOpen callback', async () => {
        const onOpen = jest.fn();
        const middleware = (0, circuit_breaker_1.createCircuitBreakerMiddleware)({
            failureThreshold: 2,
            onOpen,
        });
        const next = jest.fn().mockRejectedValue(new Error('Service error'));
        // Trigger circuit open
        for (let i = 0; i < 2; i++) {
            try {
                await middleware.handler(mockMessage, mockContext, next);
            }
            catch (error) {
                // Expected to fail
            }
        }
        expect(onOpen).toHaveBeenCalled();
    });
    it('should close circuit after successful requests in half-open state', async () => {
        const onClose = jest.fn();
        const middleware = (0, circuit_breaker_1.createCircuitBreakerMiddleware)({
            failureThreshold: 2,
            successThreshold: 2,
            timeout: 100,
            onClose,
        });
        const next = jest.fn();
        // Open circuit
        next.mockRejectedValue(new Error('Error'));
        for (let i = 0; i < 2; i++) {
            try {
                await middleware.handler(mockMessage, mockContext, next);
            }
            catch (error) {
                // Expected to fail
            }
        }
        // Wait for half-open
        await new Promise(resolve => setTimeout(resolve, 150));
        // Successful requests to close circuit
        next.mockResolvedValue(undefined);
        for (let i = 0; i < 2; i++) {
            await middleware.handler(mockMessage, mockContext, next);
        }
        expect(onClose).toHaveBeenCalled();
    });
});
//# sourceMappingURL=circuit-breaker.test.js.map