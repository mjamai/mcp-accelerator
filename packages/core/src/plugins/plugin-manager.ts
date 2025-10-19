import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { pathToFileURL } from 'url';
import {
  Plugin,
  MCPServerInterface,
  Logger,
  PluginManifest,
  InstalledPluginRecord,
  PluginAuditRecord,
} from '../types';

/**
 * Plugin manager handles loading, prioritization, and lifecycle of plugins
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private loadedPlugins: Set<string> = new Set();
  private installedPlugins: Map<string, InstalledPluginRecord> = new Map();
  private auditLog: PluginAuditRecord[] = [];

  constructor(private logger: Logger) {}

  /**
   * Install a plugin from a manifest file (JSON)
   */
  async installFromManifest(manifestPath: string): Promise<InstalledPluginRecord> {
    const resolvedPath = path.resolve(manifestPath);
    const manifestDir = path.dirname(resolvedPath);

    const manifestRaw = await fs.readFile(resolvedPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw) as PluginManifest;

    this.validateManifest(manifest, resolvedPath);

    const entryPath = path.resolve(manifestDir, manifest.entry);
    await this.ensureFileExists(entryPath);

    const checksumVerified = await this.verifyIntegrityIfPresent(manifest, entryPath);

    const record: InstalledPluginRecord = {
      manifest,
      entryPath,
      installedAt: new Date().toISOString(),
      status: 'installed',
      checksumVerified,
    };

    this.installedPlugins.set(manifest.name, record);
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      plugin: manifest.name,
      action: 'install',
      details: {
        version: manifest.version,
        entry: manifest.entry,
        checksumVerified,
      },
    });

    this.logger.info(`Plugin manifest installed: ${manifest.name} v${manifest.version}`);
    return record;
  }

  restoreInstalled(record: InstalledPluginRecord): void {
    this.installedPlugins.set(record.manifest.name, record);
  }

  getInstalledPlugins(): InstalledPluginRecord[] {
    return Array.from(this.installedPlugins.values()).map((entry) => ({ ...entry }));
  }

  getAuditLog(): PluginAuditRecord[] {
    return [...this.auditLog];
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn(`Plugin "${plugin.name}" is already registered. Overwriting.`);
    }

    this.plugins.set(plugin.name, plugin);
    this.logger.info(`Plugin registered: ${plugin.name} v${plugin.version}`);

    if (!this.installedPlugins.has(plugin.name)) {
      const record: InstalledPluginRecord = {
        manifest: {
          name: plugin.name,
          version: plugin.version,
          entry: '[runtime]'
        },
        entryPath: '[runtime]',
        installedAt: new Date().toISOString(),
        status: this.loadedPlugins.has(plugin.name) ? 'activated' : 'installed',
        checksumVerified: false,
      };

      this.installedPlugins.set(plugin.name, record);
    }
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

      const record = this.installedPlugins.get(pluginName);
      if (record) {
        record.status = 'activated';
        record.activatedAt = new Date().toISOString();
        this.auditLog.push({
          timestamp: record.activatedAt,
          plugin: pluginName,
          action: 'activate',
        });
      }
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

      const record = this.installedPlugins.get(pluginName);
      if (record) {
        record.status = 'deactivated';
        record.deactivatedAt = new Date().toISOString();
        this.auditLog.push({
          timestamp: record.deactivatedAt,
          plugin: pluginName,
          action: 'deactivate',
        });
      }
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
  listPlugins(): Array<{
    name: string;
    version: string;
    loaded: boolean;
    status: InstalledPluginRecord['status'];
    priority: number;
    checksumVerified: boolean;
    dependencies: string[];
  }> {
    const installed = this.getInstalledPlugins().map((record) => ({
      name: record.manifest.name,
      version: record.manifest.version,
      loaded: this.loadedPlugins.has(record.manifest.name),
      priority: record.manifest.priority || 0,
      status: record.status,
      checksumVerified: record.checksumVerified,
      dependencies: record.manifest.dependencies ?? [],
    }));

    // Include dynamically registered plugins without manifests
    for (const plugin of this.plugins.values()) {
      if (!this.installedPlugins.has(plugin.name)) {
        installed.push({
          name: plugin.name,
          version: plugin.version,
          loaded: this.loadedPlugins.has(plugin.name),
          priority: plugin.priority || 0,
          status: this.loadedPlugins.has(plugin.name) ? 'activated' : 'installed',
          checksumVerified: false,
          dependencies: plugin.dependencies ?? [],
        });
      }
    }

    return installed;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.loadedPlugins.clear();
    this.installedPlugins.clear();
    this.auditLog = [];
  }

  async activatePlugin(
    pluginName: string,
    server: MCPServerInterface,
    visited: Set<string> = new Set(),
  ): Promise<void> {
    if (this.loadedPlugins.has(pluginName)) {
      return;
    }

    const record = this.installedPlugins.get(pluginName);
    if (!record) {
      throw new Error(`Plugin not installed: ${pluginName}`);
    }

    if (visited.has(pluginName)) {
      throw new Error(`Circular dependency detected for plugin: ${pluginName}`);
    }
    visited.add(pluginName);

    for (const dep of record.manifest.dependencies ?? []) {
      await this.activatePlugin(dep, server, visited);
    }

    if (!this.plugins.has(pluginName)) {
      const plugin = await this.loadPluginFromEntry(record.entryPath);
      if (plugin.name !== pluginName) {
        this.logger.warn(
          `Plugin name mismatch. Manifest expects "${pluginName}" but module exports "${plugin.name}"`,
        );
      }
      this.registerPlugin(plugin);
    }

    await this.loadPlugin(pluginName, server);
  }

  async deactivatePlugin(pluginName: string): Promise<void> {
    if (!this.loadedPlugins.has(pluginName)) {
      this.logger.warn(`Plugin "${pluginName}" is not active`);
      return;
    }

    await this.unloadPlugin(pluginName);
  }

  private async loadPluginFromEntry(entryPath: string): Promise<Plugin> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const module = require(entryPath);
      return this.normalizePluginExport(module, entryPath);
    } catch (requireError: unknown) {
      const err = requireError as { code?: string };
      if (err && err.code !== 'ERR_REQUIRE_ESM') {
        throw requireError;
      }

      const module = await import(pathToFileURL(entryPath).href);
      return this.normalizePluginExport(module, entryPath);
    }
  }

  private normalizePluginExport(module: unknown, entryPath: string): Plugin {
    const plugin: Plugin = (module as { default?: Plugin; plugin?: Plugin }).default ??
      (module as { plugin?: Plugin }).plugin ??
      (module as Plugin);

    if (!plugin || typeof plugin.initialize !== 'function' || !plugin.name || !plugin.version) {
      throw new Error(`Invalid plugin module at ${entryPath}`);
    }

    return plugin;
  }

  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Plugin entry file not found: ${filePath}`);
    }
  }

  private validateManifest(manifest: PluginManifest, manifestPath: string): void {
    if (!manifest.name || !manifest.version || !manifest.entry) {
      throw new Error(`Invalid plugin manifest: ${manifestPath}`);
    }
  }

  private async verifyIntegrityIfPresent(
    manifest: PluginManifest,
    entryPath: string,
  ): Promise<boolean> {
    if (!manifest.integrity) {
      return false;
    }

    if (manifest.integrity.algorithm !== 'sha256') {
      throw new Error(
        `Unsupported integrity algorithm for plugin ${manifest.name}: ${manifest.integrity.algorithm}`,
      );
    }

    const hash = await this.computeSha256(entryPath);
    if (hash !== manifest.integrity.hash) {
      throw new Error(
        `Integrity check failed for plugin ${manifest.name}. Expected ${manifest.integrity.hash} but got ${hash}`,
      );
    }
    return true;
  }

  private async computeSha256(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    return createHash('sha256').update(data).digest('hex');
  }
}
