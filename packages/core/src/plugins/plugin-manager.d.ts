import { Plugin, MCPServerInterface, Logger, InstalledPluginRecord, PluginAuditRecord } from '../types';
/**
 * Plugin manager handles loading, prioritization, and lifecycle of plugins
 */
export declare class PluginManager {
    private logger;
    private plugins;
    private loadedPlugins;
    private installedPlugins;
    private auditLog;
    constructor(logger: Logger);
    /**
     * Install a plugin from a manifest file (JSON)
     */
    installFromManifest(manifestPath: string): Promise<InstalledPluginRecord>;
    restoreInstalled(record: InstalledPluginRecord): void;
    getInstalledPlugins(): InstalledPluginRecord[];
    getAuditLog(): PluginAuditRecord[];
    /**
     * Register a plugin
     */
    registerPlugin(plugin: Plugin): void;
    /**
     * Load and initialize a plugin
     */
    loadPlugin(pluginName: string, server: MCPServerInterface): Promise<void>;
    /**
     * Load all registered plugins
     */
    loadAllPlugins(server: MCPServerInterface): Promise<void>;
    /**
     * Unload a plugin
     */
    unloadPlugin(pluginName: string): Promise<void>;
    /**
     * Unload all loaded plugins
     */
    unloadAllPlugins(): Promise<void>;
    /**
     * Get a plugin by name
     */
    getPlugin(name: string): Plugin | undefined;
    /**
     * Check if a plugin is loaded
     */
    isPluginLoaded(name: string): boolean;
    /**
     * List all registered plugins
     */
    listPlugins(): Array<{
        name: string;
        version: string;
        loaded: boolean;
        status: InstalledPluginRecord['status'];
        priority: number;
        checksumVerified: boolean;
        dependencies: string[];
    }>;
    /**
     * Clear all plugins
     */
    clear(): void;
    activatePlugin(pluginName: string, server: MCPServerInterface, visited?: Set<string>): Promise<void>;
    deactivatePlugin(pluginName: string): Promise<void>;
    private loadPluginFromEntry;
    private normalizePluginExport;
    private ensureFileExists;
    private validateManifest;
    private verifyIntegrityIfPresent;
    private computeSha256;
}
//# sourceMappingURL=plugin-manager.d.ts.map