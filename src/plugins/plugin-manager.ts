import { Plugin, MCPServerInterface, Logger } from '../types';

/**
 * Plugin manager handles loading, prioritization, and lifecycle of plugins
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private loadedPlugins: Set<string> = new Set();

  constructor(private logger: Logger) {}

  /**
   * Register a plugin
   */
  registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn(`Plugin "${plugin.name}" is already registered. Overwriting.`);
    }

    this.plugins.set(plugin.name, plugin);
    this.logger.info(`Plugin registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Load and initialize a plugin
   */
  async loadPlugin(pluginName: string, server: MCPServerInterface): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    if (this.loadedPlugins.has(pluginName)) {
      this.logger.warn(`Plugin "${pluginName}" is already loaded`);
      return;
    }

    try {
      this.logger.info(`Loading plugin: ${pluginName}`);
      await plugin.initialize(server);
      this.loadedPlugins.add(pluginName);
      this.logger.info(`Plugin loaded successfully: ${pluginName}`);
    } catch (error) {
      this.logger.error(`Failed to load plugin: ${pluginName}`, error as Error);
      throw error;
    }
  }

  /**
   * Load all registered plugins
   */
  async loadAllPlugins(server: MCPServerInterface): Promise<void> {
    // Sort plugins by priority (higher priority first)
    const sortedPlugins = Array.from(this.plugins.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const plugin of sortedPlugins) {
      await this.loadPlugin(plugin.name, server);
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    if (!this.loadedPlugins.has(pluginName)) {
      this.logger.warn(`Plugin "${pluginName}" is not loaded`);
      return;
    }

    try {
      this.logger.info(`Unloading plugin: ${pluginName}`);
      
      if (plugin.cleanup) {
        await plugin.cleanup();
      }
      
      this.loadedPlugins.delete(pluginName);
      this.logger.info(`Plugin unloaded: ${pluginName}`);
    } catch (error) {
      this.logger.error(`Failed to unload plugin: ${pluginName}`, error as Error);
      throw error;
    }
  }

  /**
   * Unload all loaded plugins
   */
  async unloadAllPlugins(): Promise<void> {
    const pluginNames = Array.from(this.loadedPlugins);
    
    for (const pluginName of pluginNames) {
      await this.unloadPlugin(pluginName);
    }
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if a plugin is loaded
   */
  isPluginLoaded(name: string): boolean {
    return this.loadedPlugins.has(name);
  }

  /**
   * List all registered plugins
   */
  listPlugins(): Array<{ name: string; version: string; loaded: boolean; priority: number }> {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      loaded: this.loadedPlugins.has(plugin.name),
      priority: plugin.priority || 0,
    }));
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.loadedPlugins.clear();
  }
}

