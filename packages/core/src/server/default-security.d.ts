import { MCPServer } from '../core/server';
import { Logger } from '../types';
export interface DefaultAuthConfig {
    jwt?: {
        secret?: string;
        algorithms?: string[];
        headerName?: string;
        tokenPrefix?: string;
    };
    apiKey?: {
        headerName?: string;
        keys?: string[] | ((key: string) => Promise<boolean> | boolean);
    };
}
export interface DefaultRateLimitConfig {
    max?: number;
    windowMs?: number;
}
export interface DefaultObservabilityConfig {
    serviceName?: string;
    serviceVersion?: string;
    environment?: string;
    traceExporter?: 'otlp' | 'jaeger' | 'console' | 'none';
    metricsExporter?: 'otlp' | 'prometheus' | 'console' | 'none';
    includePayloads?: boolean;
}
export interface DefaultSecurityOptions {
    auth?: DefaultAuthConfig;
    rateLimit?: DefaultRateLimitConfig;
    observability?: DefaultObservabilityConfig;
    logger?: Logger;
}
/**
 * Apply recommended middleware defaults for authentication, rate limiting, and observability.
 * Each block is optional and enabled only when the corresponding configuration or environment variables are provided.
 */
export declare function applyDefaultSecurity(server: MCPServer, options?: DefaultSecurityOptions): Promise<void>;
//# sourceMappingURL=default-security.d.ts.map