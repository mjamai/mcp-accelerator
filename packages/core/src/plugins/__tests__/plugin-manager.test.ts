import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';
import { PluginManager } from '../plugin-manager';
import { ConsoleLogger, SilentLogger } from '../../core/logger';
import { MCPServer } from '../../core/server';

const createTempDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-plugin-'));
  return dir;
};

const writePluginModule = async (dir: string, name: string, extra?: string): Promise<string> => {
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
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
};

const createManifest = async (
  dir: string,
  manifestName: string,
  entryFile: string,
  overrides: Partial<Record<string, unknown>> = {},
) => {
  const relativeEntry = path.relative(dir, entryFile);
  const hash = createHash('sha256').update(await fs.readFile(entryFile)).digest('hex');
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
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  return manifestPath;
};

describe('PluginManager lifecycle', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete (globalThis as any).__TEST_PLUGIN_INIT__;
    delete (globalThis as any).__TEST_PLUGIN_CLEAN__;
  });

  it('installs, verifies integrity, activates and deactivates a plugin', async () => {
    const entry = await writePluginModule(tempDir, 'test-plugin');
    const manifestPath = await createManifest(tempDir, 'test-plugin', entry);

    const manager = new PluginManager(new ConsoleLogger('error'));
    await manager.installFromManifest(manifestPath);

    const server = new MCPServer({
      name: 'cli-test',
      version: '0.0.0',
      logger: new SilentLogger(),
    });

    await manager.activatePlugin('test-plugin', server);
    expect((globalThis as any).__TEST_PLUGIN_INIT__).toBe(1);

    let listed = manager.listPlugins();
    expect(listed[0].status).toBe('activated');
    expect(listed[0].checksumVerified).toBe(true);

    await manager.deactivatePlugin('test-plugin');
    expect((globalThis as any).__TEST_PLUGIN_CLEAN__).toBe(1);

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

    const manager = new PluginManager(new ConsoleLogger('error'));
    await manager.installFromManifest(baseManifest);
    await manager.installFromManifest(dependentManifest);

    const server = new MCPServer({
      name: 'cli-test',
      version: '0.0.0',
      logger: new SilentLogger(),
    });

    await manager.activatePlugin('dependent-plugin', server);

    const statuses = manager.listPlugins().reduce<Record<string, string>>((acc, item) => {
      acc[item.name] = item.status;
      return acc;
    }, {});

    expect(statuses['base-plugin']).toBe('activated');
    expect(statuses['dependent-plugin']).toBe('activated');

    await manager.deactivatePlugin('dependent-plugin');
    await manager.deactivatePlugin('base-plugin');
    await server.stop();

    await fs.rm(depDir, { recursive: true, force: true });
  });

  it('fails integrity check with wrong checksum', async () => {
    const entry = await writePluginModule(tempDir, 'broken-plugin');
    const manifestPath = path.join(tempDir, 'broken-plugin.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        {
          name: 'broken-plugin',
          version: '1.0.0',
          entry: path.basename(entry),
          integrity: { algorithm: 'sha256', hash: 'deadbeef' },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const manager = new PluginManager(new ConsoleLogger('error'));
    await expect(manager.installFromManifest(manifestPath)).rejects.toThrow(/Integrity check failed/);
  });
});
