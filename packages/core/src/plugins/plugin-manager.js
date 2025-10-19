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
exports.PluginManager = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const url_1 = require("url");
/**
 * Plugin manager handles loading, prioritization, and lifecycle of plugins
 */
class PluginManager {
    logger;
    plugins = new Map();
    loadedPlugins = new Set();
    installedPlugins = new Map();
    auditLog = [];
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Install a plugin from a manifest file (JSON)
     */
    async installFromManifest(manifestPath) {
        const resolvedPath = path.resolve(manifestPath);
        const manifestDir = path.dirname(resolvedPath);
        const manifestRaw = await fs_1.promises.readFile(resolvedPath, 'utf-8');
        const manifest = JSON.parse(manifestRaw);
        this.validateManifest(manifest, resolvedPath);
        const entryPath = path.resolve(manifestDir, manifest.entry);
        await this.ensureFileExists(entryPath);
        const checksumVerified = await this.verifyIntegrityIfPresent(manifest, entryPath);
        const record = {
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
    restoreInstalled(record) {
        this.installedPlugins.set(record.manifest.name, record);
    }
    getInstalledPlugins() {
        return Array.from(this.installedPlugins.values()).map((entry) => ({ ...entry }));
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    /**
     * Register a plugin
     */
    registerPlugin(plugin) {
        if (this.plugins.has(plugin.name)) {
            this.logger.warn(`Plugin "${plugin.name}" is already registered. Overwriting.`);
        }
        this.plugins.set(plugin.name, plugin);
        this.logger.info(`Plugin registered: ${plugin.name} v${plugin.version}`);
        if (!this.installedPlugins.has(plugin.name)) {
            const record = {
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
    async loadPlugin(pluginName, server) {
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
        }
        catch (error) {
            this.logger.error(`Failed to load plugin: ${pluginName}`, error);
            throw error;
        }
    }
    /**
     * Load all registered plugins
     */
    async loadAllPlugins(server) {
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
    async unloadPlugin(pluginName) {
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
        }
        catch (error) {
            this.logger.error(`Failed to unload plugin: ${pluginName}`, error);
            throw error;
        }
    }
    /**
     * Unload all loaded plugins
     */
    async unloadAllPlugins() {
        const pluginNames = Array.from(this.loadedPlugins);
        for (const pluginName of pluginNames) {
            await this.unloadPlugin(pluginName);
        }
    }
    /**
     * Get a plugin by name
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }
    /**
     * Check if a plugin is loaded
     */
    isPluginLoaded(name) {
        return this.loadedPlugins.has(name);
    }
    /**
     * List all registered plugins
     */
    listPlugins() {
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
    clear() {
        this.plugins.clear();
        this.loadedPlugins.clear();
        this.installedPlugins.clear();
        this.auditLog = [];
    }
    async activatePlugin(pluginName, server, visited = new Set()) {
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
                this.logger.warn(`Plugin name mismatch. Manifest expects "${pluginName}" but module exports "${plugin.name}"`);
            }
            this.registerPlugin(plugin);
        }
        await this.loadPlugin(pluginName, server);
    }
    async deactivatePlugin(pluginName) {
        if (!this.loadedPlugins.has(pluginName)) {
            this.logger.warn(`Plugin "${pluginName}" is not active`);
            return;
        }
        await this.unloadPlugin(pluginName);
    }
    async loadPluginFromEntry(entryPath) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
            const module = require(entryPath);
            return this.normalizePluginExport(module, entryPath);
        }
        catch (requireError) {
            const err = requireError;
            if (err && err.code !== 'ERR_REQUIRE_ESM') {
                throw requireError;
            }
            const module = await Promise.resolve(`${(0, url_1.pathToFileURL)(entryPath).href}`).then(s => __importStar(require(s)));
            return this.normalizePluginExport(module, entryPath);
        }
    }
    normalizePluginExport(module, entryPath) {
        const plugin = module.default ??
            module.plugin ??
            module;
        if (!plugin || typeof plugin.initialize !== 'function' || !plugin.name || !plugin.version) {
            throw new Error(`Invalid plugin module at ${entryPath}`);
        }
        return plugin;
    }
    async ensureFileExists(filePath) {
        try {
            await fs_1.promises.access(filePath);
        }
        catch (error) {
            throw new Error(`Plugin entry file not found: ${filePath}`);
        }
    }
    validateManifest(manifest, manifestPath) {
        if (!manifest.name || !manifest.version || !manifest.entry) {
            throw new Error(`Invalid plugin manifest: ${manifestPath}`);
        }
    }
    async verifyIntegrityIfPresent(manifest, entryPath) {
        if (!manifest.integrity) {
            return false;
        }
        if (manifest.integrity.algorithm !== 'sha256') {
            throw new Error(`Unsupported integrity algorithm for plugin ${manifest.name}: ${manifest.integrity.algorithm}`);
        }
        const hash = await this.computeSha256(entryPath);
        if (hash !== manifest.integrity.hash) {
            throw new Error(`Integrity check failed for plugin ${manifest.name}. Expected ${manifest.integrity.hash} but got ${hash}`);
        }
        return true;
    }
    async computeSha256(filePath) {
        const data = await fs_1.promises.readFile(filePath);
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
}
exports.PluginManager = PluginManager;
//# sourceMappingURL=plugin-manager.js.map