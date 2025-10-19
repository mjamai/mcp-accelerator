"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withCircuitBreaker = exports.withRetry = exports.executeWithTimeoutAndSignal = exports.executeWithTimeout = exports.safeHandler = void 0;
/**
 * Wrap a tool handler with automatic error handling, timeout, and retry logic
 *
 * @example
 * ```typescript
 * import { safeHandler } from '@mcp-accelerator/core';
 *
 * const safeTool: Tool = {
 *   name: 'fetch-data',
 *   description: 'Fetch data from API',
 *   inputSchema: z.object({ url: z.string().url() }),
 *   handler: safeHandler(
 *     async (input, ctx) => {
 *       const response = await fetch(input.url);
 *       return response.json();
 *     },
 *     { timeout: 5000, retry: { attempts: 3, delay: 1000 } }
 *   ),
 * };
 * ```
 */
function safeHandler(handler, options = {}) {
    const { name = 'handler', timeout = 0, retry } = options;
    return async (input, context) => {
        let lastError;
        const attempts = retry ? retry.attempts : 1;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                // Execute with optional timeout
                if (timeout > 0) {
                    return await executeWithTimeout(handler(input, context), timeout);
                }
                return await handler(input, context);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Don't retry on validation errors or final attempt
                if (attempt === attempts || lastError.name === 'ValidationError') {
                    break;
                }
                // Calculate delay with optional exponential backoff
                const delay = retry.exponentialBackoff
                    ? retry.delay * Math.pow(2, attempt - 1)
                    : retry.delay;
                context.logger.warn(`${name} attempt ${attempt}/${attempts} failed, retrying in ${delay}ms`, { error: lastError.message });
                await sleep(delay);
            }
        }
        // All attempts failed
        context.logger.error(`${name} failed after ${attempts} attempts`, lastError);
        throw lastError;
    };
}
exports.safeHandler = safeHandler;
/**
 * Execute a promise with a timeout
 *
 * @param promise - Promise to execute
 * @param timeout - Timeout in milliseconds
 * @returns Promise result or throws TimeoutError
 */
async function executeWithTimeout(promise, timeout) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                const error = new Error(`Operation timeout after ${timeout}ms`);
                error.name = 'TimeoutError';
                reject(error);
            }, timeout);
        }),
    ]);
}
exports.executeWithTimeout = executeWithTimeout;
/**
 * Execute a promise with timeout and abort signal support
 *
 * @param promise - Promise to execute
 * @param timeout - Timeout in milliseconds
 * @param signal - AbortSignal for cancellation
 * @returns Promise result or throws TimeoutError/AbortError
 */
async function executeWithTimeoutAndSignal(promise, timeout, signal) {
    if (signal?.aborted) {
        const error = new Error('Operation was cancelled');
        error.name = 'AbortError';
        throw error;
    }
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            const timeoutId = setTimeout(() => {
                const error = new Error(`Operation timeout after ${timeout}ms`);
                error.name = 'TimeoutError';
                reject(error);
            }, timeout);
            signal?.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                const error = new Error('Operation was cancelled');
                error.name = 'AbortError';
                reject(error);
            });
        }),
    ]);
}
exports.executeWithTimeoutAndSignal = executeWithTimeoutAndSignal;
/**
 * Sleep utility for delays
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Wrap a function with automatic retry logic
 *
 * @param fn - Function to wrap
 * @param options - Retry options
 * @returns Wrapped function with retry logic
 *
 * @example
 * ```typescript
 * const fetchWithRetry = withRetry(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error('HTTP error');
 *     return response.json();
 *   },
 *   { attempts: 3, delay: 1000, exponentialBackoff: true }
 * );
 *
 * const data = await fetchWithRetry('https://api.example.com/data');
 * ```
 */
function withRetry(fn, options) {
    const { attempts, delay, exponentialBackoff = false, shouldRetry = () => true } = options;
    return async (...args) => {
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                return await fn(...args);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Check if should retry
                if (attempt === attempts || !shouldRetry(lastError)) {
                    break;
                }
                // Calculate backoff delay
                const retryDelay = exponentialBackoff
                    ? delay * Math.pow(2, attempt - 1)
                    : delay;
                await sleep(retryDelay);
            }
        }
        throw lastError;
    };
}
exports.withRetry = withRetry;
/**
 * Create a circuit breaker wrapper for functions
 *
 * @param fn - Function to wrap
 * @param options - Circuit breaker options
 * @returns Wrapped function with circuit breaker
 *
 * @example
 * ```typescript
 * const protectedFetch = withCircuitBreaker(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     return response.json();
 *   },
 *   { threshold: 5, timeout: 60000 }
 * );
 * ```
 */
function withCircuitBreaker(fn, options) {
    const { threshold, timeout, isFailure = () => true } = options;
    let state = 'closed';
    let failureCount = 0;
    let lastFailureTime = 0;
    let successCount = 0;
    return async (...args) => {
        const now = Date.now();
        // Check if circuit should transition from open to half-open
        if (state === 'open' && now - lastFailureTime >= timeout) {
            state = 'half-open';
            successCount = 0;
        }
        // Reject immediately if circuit is open
        if (state === 'open') {
            const error = new Error('Circuit breaker is open');
            error.name = 'CircuitBreakerError';
            throw error;
        }
        try {
            const result = await fn(...args);
            // Handle success in half-open state
            if (state === 'half-open') {
                successCount++;
                if (successCount >= 3) {
                    state = 'closed';
                    failureCount = 0;
                    successCount = 0;
                }
            }
            else if (state === 'closed') {
                // Gradually reset failure count on success
                failureCount = Math.max(0, failureCount - 1);
            }
            return result;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            // Only count as failure if it matches the failure criteria
            if (!isFailure(err)) {
                throw error;
            }
            failureCount++;
            lastFailureTime = now;
            if (state === 'half-open') {
                // Immediately open on failure in half-open state
                state = 'open';
                successCount = 0;
            }
            else if (failureCount >= threshold) {
                state = 'open';
            }
            throw error;
        }
    };
}
exports.withCircuitBreaker = withCircuitBreaker;
//# sourceMappingURL=safe-handler.js.map