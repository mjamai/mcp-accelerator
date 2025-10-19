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
const fs_1 = require("fs");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto_1 = require("crypto");
const plugin_manager_1 = require("../plugin-manager");
const logger_1 = require("../../core/logger");
const server_1 = require("../../core/server");
const createTempDir = async () => {
    const dir = await fs_1.promises.mkdtemp(path.join(os.tmpdir(), 'mcp-plugin-'));
    return dir;
};
const writePluginModule = async (dir, name, extra) => {
    const filePath = path.join(dir, `${name}.cjs`);
    const token = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const content = `
    let initCount = 0;
    let cleanupCount = 0;
    module.exports = {
      name: '${name}',
      version: '1.0.0',
      initialize: async () => { initCount++; globalThis.__${token}_INIT__ = initCount; ${extra ?? ''} },
      cleanup: async () => { cleanupCount++; globalThis.__${token}_CLEAN__ = cleanupCount; }
    };
  `;
    await fs_1.promises.writeFile(filePath, content, 'utf-8');
    return filePath;
};
const createManifest = async (dir, manifestName, entryFile, overrides = {}) => {
    const relativeEntry = path.relative(dir, entryFile);
    const hash = (0, crypto_1.createHash)('sha256').update(await fs_1.promises.readFile(entryFile)).digest('hex');
    const manifest = {
        name: manifestName,
        version: '1.0.0',
        entry: relativeEntry,
        integrity: {
            algorithm: 'sha256',
            hash,
        },
        ...overrides,
    };
    const manifestPath = path.join(dir, `${manifestName}.json`);
    await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    return manifestPath;
};
describe('PluginManager lifecycle', () => {
    let tempDir;
    beforeEach(async () => {
        tempDir = await createTempDir();
    });
    afterEach(async () => {
        await fs_1.promises.rm(tempDir, { recursive: true, force: true });
        delete globalThis.__TEST_PLUGIN_INIT__;
        delete globalThis.__TEST_PLUGIN_CLEAN__;
    });
    it('installs, verifies integrity, activates and deactivates a plugin', async () => {
        const entry = await writePluginModule(tempDir, 'test-plugin');
        const manifestPath = await createManifest(tempDir, 'test-plugin', entry);
        const manager = new plugin_manager_1.PluginManager(new logger_1.ConsoleLogger('error'));
        await manager.installFromManifest(manifestPath);
        const server = new server_1.MCPServer({
            name: 'cli-test',
            version: '0.0.0',
            logger: new logger_1.SilentLogger(),
        });
        await manager.activatePlugin('test-plugin', server);
        expect(globalThis.__TEST_PLUGIN_INIT__).toBe(1);
        let listed = manager.listPlugins();
        expect(listed[0].status).toBe('activated');
        expect(listed[0].checksumVerified).toBe(true);
        await manager.deactivatePlugin('test-plugin');
        expect(globalThis.__TEST_PLUGIN_CLEAN__).toBe(1);
        listed = manager.listPlugins();
        expect(listed[0].status).toBe('deactivated');
        await server.stop();
    });
    it('respects dependency ordering', async () => {
        const depDir = await createTempDir();
        const baseEntry = await writePluginModule(depDir, 'base-plugin');
        const baseManifest = await createManifest(depDir, 'base-plugin', baseEntry);
        const dependentEntry = await writePluginModule(depDir, 'dependent-plugin');
        const dependentManifest = await createManifest(depDir, 'dependent-plugin', dependentEntry, {
            dependencies: ['base-plugin'],
        });
        const manager = new plugin_manager_1.PluginManager(new logger_1.ConsoleLogger('error'));
        await manager.installFromManifest(baseManifest);
        await manager.installFromManifest(dependentManifest);
        const server = new server_1.MCPServer({
            name: 'cli-test',
            version: '0.0.0',
            logger: new logger_1.SilentLogger(),
        });
        await manager.activatePlugin('dependent-plugin', server);
        const statuses = manager.listPlugins().reduce((acc, item) => {
            acc[item.name] = item.status;
            return acc;
        }, {});
        expect(statuses['base-plugin']).toBe('activated');
        expect(statuses['dependent-plugin']).toBe('activated');
        await manager.deactivatePlugin('dependent-plugin');
        await manager.deactivatePlugin('base-plugin');
        await server.stop();
        await fs_1.promises.rm(depDir, { recursive: true, force: true });
    });
    it('fails integrity check with wrong checksum', async () => {
        const entry = await writePluginModule(tempDir, 'broken-plugin');
        const manifestPath = path.join(tempDir, 'broken-plugin.json');
        await fs_1.promises.writeFile(manifestPath, JSON.stringify({
            name: 'broken-plugin',
            version: '1.0.0',
            entry: path.basename(entry),
            integrity: { algorithm: 'sha256', hash: 'deadbeef' },
        }, null, 2), 'utf-8');
        const manager = new plugin_manager_1.PluginManager(new logger_1.ConsoleLogger('error'));
        await expect(manager.installFromManifest(manifestPath)).rejects.toThrow(/Integrity check failed/);
    });
});
//# sourceMappingURL=plugin-manager.test.js.map