import { Plugin, MCPServerInterface } from '../types';
/**
 * Plugin de logging des événements serveur
 */
export declare class LoggingPlugin implements Plugin {
    name: string;
    version: string;
    initialize(server: MCPServerInterface): Promise<void>;
}
/**
 * Plugin de métriques basiques
 */
export declare class MetricsPlugin implements Plugin {
    name: string;
    version: string;
    private metrics;
    initialize(server: MCPServerInterface): Promise<void>;
    /**
     * Get current metrics
     */
    getMetrics(): {
        totalRequests: number;
        totalErrors: number;
        averageDuration: number;
        toolCalls: {
            [k: string]: number;
        };
    };
    cleanup(): Promise<void>;
}
//# sourceMappingURL=example-plugins.d.ts.map