"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = require("../cors");
describe('CORS Configuration', () => {
    describe('createCORSOptions', () => {
        it('should create default CORS options', () => {
            const options = (0, cors_1.createCORSOptions)();
            expect(options).toEqual({
                origin: '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Client-ID'],
                exposedHeaders: ['X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
                credentials: false,
                maxAge: 86400,
                preflightContinue: false,
                optionsSuccessStatus: 204,
            });
        });
        it('should create CORS options with custom origin string', () => {
            const options = (0, cors_1.createCORSOptions)({
                origin: 'https://example.com',
            });
            expect(options.origin).toBe('https://example.com');
            expect(options.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']); // defaults
        });
        it('should create CORS options with array of origins', () => {
            const origins = ['https://example.com', 'https://app.example.com'];
            const options = (0, cors_1.createCORSOptions)({
                origin: origins,
            });
            expect(options.origin).toEqual(origins);
        });
        it('should create CORS options with origin function', () => {
            const originFn = jest.fn((origin) => origin.includes('example.com'));
            const options = (0, cors_1.createCORSOptions)({
                origin: originFn,
            });
            expect(options.origin).toBe(originFn);
        });
        it('should create CORS options with custom methods', () => {
            const options = (0, cors_1.createCORSOptions)({
                methods: ['GET', 'POST'],
            });
            expect(options.methods).toEqual(['GET', 'POST']);
        });
        it('should create CORS options with methods as string', () => {
            const options = (0, cors_1.createCORSOptions)({
                methods: 'GET, POST, PUT',
            });
            expect(options.methods).toBe('GET, POST, PUT');
        });
        it('should create CORS options with custom allowed headers', () => {
            const headers = ['Content-Type', 'X-Custom-Header'];
            const options = (0, cors_1.createCORSOptions)({
                allowedHeaders: headers,
            });
            expect(options.allowedHeaders).toEqual(headers);
        });
        it('should create CORS options with allowed headers as string', () => {
            const options = (0, cors_1.createCORSOptions)({
                allowedHeaders: 'Content-Type, Authorization',
            });
            expect(options.allowedHeaders).toBe('Content-Type, Authorization');
        });
        it('should create CORS options with custom exposed headers', () => {
            const headers = ['X-Total-Count', 'X-Page-Number'];
            const options = (0, cors_1.createCORSOptions)({
                exposedHeaders: headers,
            });
            expect(options.exposedHeaders).toEqual(headers);
        });
        it('should create CORS options with exposed headers as string', () => {
            const options = (0, cors_1.createCORSOptions)({
                exposedHeaders: 'X-Total-Count, X-Page-Number',
            });
            expect(options.exposedHeaders).toBe('X-Total-Count, X-Page-Number');
        });
        it('should create CORS options with credentials enabled', () => {
            const options = (0, cors_1.createCORSOptions)({
                credentials: true,
            });
            expect(options.credentials).toBe(true);
        });
        it('should create CORS options with custom maxAge', () => {
            const options = (0, cors_1.createCORSOptions)({
                maxAge: 3600, // 1 hour
            });
            expect(options.maxAge).toBe(3600);
        });
        it('should create CORS options with preflightContinue enabled', () => {
            const options = (0, cors_1.createCORSOptions)({
                preflightContinue: true,
            });
            expect(options.preflightContinue).toBe(true);
        });
        it('should create CORS options with custom optionsSuccessStatus', () => {
            const options = (0, cors_1.createCORSOptions)({
                optionsSuccessStatus: 200,
            });
            expect(options.optionsSuccessStatus).toBe(200);
        });
        it('should create CORS options with all custom settings', () => {
            const customOrigin = (origin) => origin === 'https://trusted.com';
            const options = (0, cors_1.createCORSOptions)({
                origin: customOrigin,
                methods: ['GET', 'POST', 'PATCH'],
                allowedHeaders: ['Content-Type', 'X-Custom'],
                exposedHeaders: ['X-Response-Time'],
                credentials: true,
                maxAge: 7200,
                preflightContinue: true,
                optionsSuccessStatus: 200,
            });
            expect(options).toEqual({
                origin: customOrigin,
                methods: ['GET', 'POST', 'PATCH'],
                allowedHeaders: ['Content-Type', 'X-Custom'],
                exposedHeaders: ['X-Response-Time'],
                credentials: true,
                maxAge: 7200,
                preflightContinue: true,
                optionsSuccessStatus: 200,
            });
        });
        it('should create CORS options with empty object (all defaults)', () => {
            const options1 = (0, cors_1.createCORSOptions)({});
            const options2 = (0, cors_1.createCORSOptions)();
            expect(options1).toEqual(options2);
        });
    });
    describe('developmentCORS', () => {
        it('should provide development preset with permissive settings', () => {
            expect(cors_1.developmentCORS).toBeDefined();
            expect(cors_1.developmentCORS.origin).toBe('*');
            expect(cors_1.developmentCORS.credentials).toBe(false);
            expect(cors_1.developmentCORS.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        });
        it('should be a ready-to-use configuration object', () => {
            expect(typeof cors_1.developmentCORS).toBe('object');
            expect(cors_1.developmentCORS).toHaveProperty('origin');
            expect(cors_1.developmentCORS).toHaveProperty('methods');
            expect(cors_1.developmentCORS).toHaveProperty('allowedHeaders');
            expect(cors_1.developmentCORS).toHaveProperty('exposedHeaders');
            expect(cors_1.developmentCORS).toHaveProperty('credentials');
            expect(cors_1.developmentCORS).toHaveProperty('maxAge');
        });
    });
    describe('productionCORS', () => {
        it('should create production preset with strict settings', () => {
            const allowedOrigins = ['https://example.com', 'https://app.example.com'];
            const options = (0, cors_1.productionCORS)(allowedOrigins);
            expect(options.origin).toEqual(allowedOrigins);
            expect(options.credentials).toBe(true);
            expect(options.methods).toEqual(['GET', 'POST']);
        });
        it('should create production preset with single origin', () => {
            const options = (0, cors_1.productionCORS)(['https://production.com']);
            expect(options.origin).toEqual(['https://production.com']);
            expect(options.credentials).toBe(true);
        });
        it('should create production preset with empty origins array', () => {
            const options = (0, cors_1.productionCORS)([]);
            expect(options.origin).toEqual([]);
            expect(options.methods).toEqual(['GET', 'POST']);
        });
        it('should have default headers and settings', () => {
            const options = (0, cors_1.productionCORS)(['https://example.com']);
            expect(options.allowedHeaders).toEqual(['Content-Type', 'Authorization', 'X-API-Key', 'X-Client-ID']);
            expect(options.exposedHeaders).toEqual(['X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset']);
            expect(options.maxAge).toBe(86400);
        });
    });
    describe('dynamicOriginCORS', () => {
        it('should create CORS options with synchronous validator', () => {
            const validator = jest.fn((origin) => origin.endsWith('.example.com'));
            const options = (0, cors_1.dynamicOriginCORS)(validator);
            expect(options.origin).toBe(validator);
            expect(options.credentials).toBe(true);
            expect(options.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        });
        it('should create CORS options with async validator', () => {
            const validator = jest.fn(async (origin) => {
                // Simulate async check (e.g., database lookup)
                return origin.startsWith('https://');
            });
            const options = (0, cors_1.dynamicOriginCORS)(validator);
            expect(options.origin).toBe(validator);
            expect(options.credentials).toBe(true);
        });
        it('should preserve validator function reference', () => {
            const validator = (origin) => origin === 'https://trusted.com';
            const options = (0, cors_1.dynamicOriginCORS)(validator);
            expect(options.origin).toBe(validator);
            // Verify the validator function works
            expect(validator('https://trusted.com')).toBe(true);
            expect(validator('https://untrusted.com')).toBe(false);
        });
        it('should have default settings except origin', () => {
            const validator = () => true;
            const options = (0, cors_1.dynamicOriginCORS)(validator);
            expect(options.allowedHeaders).toEqual(['Content-Type', 'Authorization', 'X-API-Key', 'X-Client-ID']);
            expect(options.exposedHeaders).toEqual(['X-Rate-Limit-Limit', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset']);
            expect(options.maxAge).toBe(86400);
            expect(options.preflightContinue).toBe(false);
            expect(options.optionsSuccessStatus).toBe(204);
        });
        it('should create options with validator returning promise', () => {
            const validator = (origin) => Promise.resolve(origin.includes('allowed'));
            const options = (0, cors_1.dynamicOriginCORS)(validator);
            expect(options.origin).toBe(validator);
            expect(typeof options.origin).toBe('function');
        });
    });
    describe('Integration Scenarios', () => {
        it('should work for local development', () => {
            const devOptions = (0, cors_1.createCORSOptions)({
                origin: ['http://localhost:3000', 'http://localhost:5173'],
                credentials: true,
            });
            expect(devOptions.origin).toContain('http://localhost:3000');
            expect(devOptions.origin).toContain('http://localhost:5173');
            expect(devOptions.credentials).toBe(true);
        });
        it('should work for production with multiple domains', () => {
            const prodOrigins = [
                'https://app.example.com',
                'https://admin.example.com',
                'https://api.example.com',
            ];
            const prodOptions = (0, cors_1.productionCORS)(prodOrigins);
            expect(prodOptions.origin).toEqual(prodOrigins);
            expect(prodOptions.credentials).toBe(true);
            expect(prodOptions.methods).toEqual(['GET', 'POST']);
        });
        it('should work for API with specific requirements', () => {
            const apiOptions = (0, cors_1.createCORSOptions)({
                origin: 'https://client.example.com',
                methods: ['GET', 'POST', 'PATCH', 'DELETE'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Version'],
                exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
                credentials: true,
                maxAge: 3600,
            });
            expect(apiOptions.origin).toBe('https://client.example.com');
            expect(apiOptions.methods).toContain('PATCH');
            expect(apiOptions.allowedHeaders).toContain('X-API-Version');
            expect(apiOptions.exposedHeaders).toContain('X-Total-Count');
        });
        it('should work for public API (no credentials)', () => {
            const publicOptions = (0, cors_1.createCORSOptions)({
                origin: '*',
                credentials: false,
                methods: 'GET',
            });
            expect(publicOptions.origin).toBe('*');
            expect(publicOptions.credentials).toBe(false);
            expect(publicOptions.methods).toBe('GET');
        });
        it('should work with subdomain wildcard validator', () => {
            const validator = (origin) => {
                const allowedPattern = /^https:\/\/[\w-]+\.example\.com$/;
                return allowedPattern.test(origin);
            };
            const options = (0, cors_1.dynamicOriginCORS)(validator);
            expect(options.origin).toBe(validator);
            // Test the validator logic
            expect(validator('https://app.example.com')).toBe(true);
            expect(validator('https://admin.example.com')).toBe(true);
            expect(validator('https://evil.com')).toBe(false);
            expect(validator('http://app.example.com')).toBe(false); // Not https
        });
    });
    describe('Edge Cases', () => {
        it('should handle undefined options parameter', () => {
            const options = (0, cors_1.createCORSOptions)(undefined);
            expect(options).toBeDefined();
            expect(options.origin).toBe('*');
        });
        it('should handle null-like values gracefully', () => {
            const options = (0, cors_1.createCORSOptions)({
                origin: undefined,
                methods: undefined,
                credentials: undefined,
            });
            // Should use defaults when undefined
            expect(options.origin).toBe('*');
            expect(options.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
            expect(options.credentials).toBe(false);
        });
        it('should handle maxAge of 0', () => {
            const options = (0, cors_1.createCORSOptions)({
                maxAge: 0,
            });
            expect(options.maxAge).toBe(0);
        });
        it('should handle very large maxAge', () => {
            const options = (0, cors_1.createCORSOptions)({
                maxAge: 31536000, // 1 year
            });
            expect(options.maxAge).toBe(31536000);
        });
        it('should handle empty arrays', () => {
            const options = (0, cors_1.createCORSOptions)({
                methods: [],
                allowedHeaders: [],
                exposedHeaders: [],
            });
            expect(options.methods).toEqual([]);
            expect(options.allowedHeaders).toEqual([]);
            expect(options.exposedHeaders).toEqual([]);
        });
    });
});
//# sourceMappingURL=cors.test.js.map