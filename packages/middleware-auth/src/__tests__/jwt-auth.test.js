"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt_auth_1 = require("../jwt-auth");
// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const jwt = __importStar(require("jsonwebtoken"));
describe('JWT Authentication Middleware', () => {
    const mockNext = jest.fn();
    const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('createJWTAuthMiddleware', () => {
        it('should create middleware with default options', () => {
            const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                secret: 'test-secret',
            });
            expect(middleware).toBeDefined();
            expect(middleware.name).toBe('jwt-auth');
            expect(middleware.priority).toBe(100);
            expect(middleware.handler).toBeInstanceOf(Function);
        });
        it('should create middleware with custom header name', () => {
            const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                secret: 'test-secret',
                headerName: 'x-custom-token',
            });
            expect(middleware).toBeDefined();
            expect(middleware.name).toBe('jwt-auth');
        });
        it('should accept custom algorithms', () => {
            const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                secret: 'test-secret',
                algorithms: ['RS256', 'HS512'],
            });
            expect(middleware).toBeDefined();
        });
        it('should accept custom verify function', () => {
            const customVerify = jest.fn();
            const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                secret: 'test-secret',
                verify: customVerify,
            });
            expect(middleware).toBeDefined();
        });
    });
    describe('Middleware Handler', () => {
        describe('Token Verification - Success Cases', () => {
            it('should verify valid JWT token with Bearer prefix', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Bearer valid-token-123',
                    },
                };
                const decodedToken = { userId: 'user-123', email: 'test@example.com' };
                jwt.verify.mockReturnValue(decodedToken);
                await middleware.handler(message, context, mockNext);
                expect(jwt.verify).toHaveBeenCalledWith('valid-token-123', 'test-secret', {
                    algorithms: ['HS256'],
                });
                expect(context.metadata.user).toEqual(decodedToken);
                expect(context.metadata.authenticated).toBe(true);
                expect(mockNext).toHaveBeenCalled();
            });
            it('should verify token without Bearer prefix', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'direct-token',
                    },
                };
                const decodedToken = { sub: 'user-456' };
                jwt.verify.mockReturnValue(decodedToken);
                await middleware.handler(message, context, mockNext);
                expect(jwt.verify).toHaveBeenCalledWith('direct-token', 'test-secret', {
                    algorithms: ['HS256'],
                });
                expect(context.metadata.user).toEqual(decodedToken);
                expect(mockNext).toHaveBeenCalled();
            });
            it('should use custom header name', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                    headerName: 'x-api-token',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        'x-api-token': 'custom-token',
                    },
                };
                jwt.verify.mockReturnValue({ userId: 'test' });
                await middleware.handler(message, context, mockNext);
                expect(jwt.verify).toHaveBeenCalledWith('custom-token', 'test-secret', {
                    algorithms: ['HS256'],
                });
                expect(mockNext).toHaveBeenCalled();
            });
            it('should handle string token payload', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Bearer token',
                    },
                };
                jwt.verify.mockReturnValue('simple-user-id');
                await middleware.handler(message, context, mockNext);
                expect(context.metadata.user).toEqual({ id: 'simple-user-id' });
                expect(mockNext).toHaveBeenCalled();
            });
            it('should use custom algorithms', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                    algorithms: ['RS256'],
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Bearer token',
                    },
                };
                jwt.verify.mockReturnValue({ userId: 'test' });
                await middleware.handler(message, context, mockNext);
                expect(jwt.verify).toHaveBeenCalledWith('token', 'test-secret', {
                    algorithms: ['RS256'],
                });
            });
        });
        describe('Custom Verification', () => {
            it('should call custom verify function', async () => {
                const customVerify = jest.fn().mockResolvedValue(true);
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                    verify: customVerify,
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Bearer token',
                    },
                };
                const decodedToken = { userId: 'user-123' };
                jwt.verify.mockReturnValue(decodedToken);
                await middleware.handler(message, context, mockNext);
                expect(customVerify).toHaveBeenCalledWith(decodedToken, context);
                expect(mockNext).toHaveBeenCalled();
            });
            it('should reject when custom verify returns false', async () => {
                const customVerify = jest.fn().mockResolvedValue(false);
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                    verify: customVerify,
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Bearer token',
                    },
                };
                jwt.verify.mockReturnValue({ userId: 'user-123' });
                await expect(middleware.handler(message, context, mockNext)).rejects.toThrow('Token verification failed');
                expect(mockNext).not.toHaveBeenCalled();
            });
        });
        describe('Error Handling', () => {
            it('should throw error when no auth header provided', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {},
                };
                await expect(middleware.handler(message, context, mockNext)).rejects.toThrow('Authentication required: No token provided');
                expect(mockNext).not.toHaveBeenCalled();
            });
            it('should throw error for invalid JWT', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Bearer invalid-token',
                    },
                };
                // Create a proper JWT error with message
                class JsonWebTokenError extends Error {
                    constructor(message) {
                        super(message);
                        this.name = 'JsonWebTokenError';
                    }
                }
                Object.setPrototypeOf(JsonWebTokenError.prototype, jwt.JsonWebTokenError.prototype);
                const jwtError = new JsonWebTokenError('jwt malformed');
                jwt.verify.mockImplementation(() => {
                    throw jwtError;
                });
                await expect(middleware.handler(message, context, mockNext)).rejects.toThrow('Invalid token:');
                expect(mockNext).not.toHaveBeenCalled();
            });
            it('should throw error for expired JWT', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Bearer expired-token',
                    },
                };
                const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());
                jwt.verify.mockImplementation(() => {
                    throw expiredError;
                });
                await expect(middleware.handler(message, context, mockNext)).rejects.toThrow('Token has expired');
                expect(mockNext).not.toHaveBeenCalled();
            });
            it('should rethrow non-JWT errors', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Bearer token',
                    },
                };
                const customError = new Error('Database connection failed');
                jwt.verify.mockImplementation(() => {
                    throw customError;
                });
                await expect(middleware.handler(message, context, mockNext)).rejects.toThrow('Database connection failed');
            });
        });
        describe('Token Prefix Handling', () => {
            it('should use custom token prefix', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                    tokenPrefix: 'Token ',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'Token my-custom-token',
                    },
                };
                jwt.verify.mockReturnValue({ userId: 'test' });
                await middleware.handler(message, context, mockNext);
                expect(jwt.verify).toHaveBeenCalledWith('my-custom-token', 'test-secret', {
                    algorithms: ['HS256'],
                });
            });
            it('should handle empty token prefix', async () => {
                const middleware = (0, jwt_auth_1.createJWTAuthMiddleware)({
                    secret: 'test-secret',
                    tokenPrefix: '',
                });
                const message = {
                    type: 'request',
                    id: '1',
                    method: 'test',
                };
                const context = {
                    clientId: 'test-client',
                    logger: mockLogger,
                    metadata: {
                        authorization: 'raw-token',
                    },
                };
                jwt.verify.mockReturnValue({ userId: 'test' });
                await middleware.handler(message, context, mockNext);
                expect(jwt.verify).toHaveBeenCalledWith('raw-token', 'test-secret', {
                    algorithms: ['HS256'],
                });
            });
        });
    });
});
//# sourceMappingURL=jwt-auth.test.js.map