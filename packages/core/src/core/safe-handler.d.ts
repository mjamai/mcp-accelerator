/// <reference types="node" />
import { ToolHandler } from '../types';
export interface SafeHandlerOptions {
    /** Handler name for logging */
    name?: string;
    /** Default timeout in ms (0 = no timeout) */
    timeout?: number;
    /** Retry configuration */
    retry?: {
        /** Number of retry attempts (default: 1, no retries) */
        attempts: number;
        /** Delay between retries in ms */
        delay: number;
        /** Use exponential backoff for retries (default: false) */
        exponentialBackoff?: boolean;
    };
}
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
export declare function safeHandler<TInput, TOutput>(handler: ToolHandler<TInput, TOutput>, options?: SafeHandlerOptions): ToolHandler<TInput, TOutput>;
/**
 * Execute a promise with a timeout
 *
 * @param promise - Promise to execute
 * @param timeout - Timeout in milliseconds
 * @returns Promise result or throws TimeoutError
 */
export declare function executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T>;
/**
 * Execute a promise with timeout and abort signal support
 *
 * @param promise - Promise to execute
 * @param timeout - Timeout in milliseconds
 * @param signal - AbortSignal for cancellation
 * @returns Promise result or throws TimeoutError/AbortError
 */
export declare function executeWithTimeoutAndSignal<T>(promise: Promise<T>, timeout: number, signal?: AbortSignal): Promise<T>;
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
export declare function withRetry<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>, options: {
    attempts: number;
    delay: number;
    exponentialBackoff?: boolean;
    shouldRetry?: (error: Error) => boolean;
}): (...args: TArgs) => Promise<TResult>;
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
export declare function withCircuitBreaker<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>, options: {
    /** Number of failures before opening circuit */
    threshold: number;
    /** Time in ms before attempting to close circuit */
    timeout: number;
    /** Optional error filter - return true to count as failure */
    isFailure?: (error: Error) => boolean;
}): (...args: TArgs) => Promise<TResult>;
//# sourceMappingURL=safe-handler.d.ts.map