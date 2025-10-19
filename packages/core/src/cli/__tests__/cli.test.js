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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const index_1 = require("../index");
const doctor_1 = require("../doctor");
const readFile = (filePath) => fs_1.promises.readFile(filePath, 'utf8');
const initialCwd = process.cwd();
async function pathExists(filePath) {
    try {
        await fs_1.promises.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function createTempDir() {
    return fs_1.promises.mkdtemp(path.join(os.tmpdir(), 'mcp-cli-'));
}
async function removeDir(target) {
    await fs_1.promises.rm(target, { recursive: true, force: true });
}
async function ensureFile(filePath, content) {
    await fs_1.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs_1.promises.writeFile(filePath, content, 'utf8');
}
async function run(cli, args) {
    await cli.parseAsync(args, { from: 'user' });
}
describe('mcp-accelerator CLI', () => {
    let tempDir;
    let logSpy;
    let errorSpy;
    beforeEach(async () => {
        tempDir = await createTempDir();
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        process.exitCode = undefined;
    });
    afterEach(async () => {
        logSpy.mockRestore();
        errorSpy.mockRestore();
        await removeDir(tempDir);
        process.exitCode = undefined;
        process.chdir(initialCwd);
    });
    it('generates tools with sanitized names and tests', async () => {
        const cli = (0, index_1.createCLI)({ exitOverride: true });
        await run(cli, [
            'generate',
            'tool',
            'Echo Tool',
            '--description',
            'Echo tool for testing',
            '--project',
            tempDir,
        ]);
        const toolPath = path.join(tempDir, 'src', 'tools', 'echo-tool.ts');
        const testPath = path.join(tempDir, 'src', 'tools', '__tests__', 'echo-tool.test.ts');
        expect(await pathExists(toolPath)).toBe(true);
        expect(await readFile(toolPath)).toContain("export const echoTool");
        expect(await readFile(toolPath)).toContain("name: 'echo-tool'");
        expect(await pathExists(testPath)).toBe(true);
        expect(await readFile(testPath)).toContain("describe('echoTool'");
    });
    it('supports provider and prompt scaffolding with skip-test', async () => {
        const cli = (0, index_1.createCLI)({ exitOverride: true });
        await run(cli, [
            'generate',
            'provider',
            'Welcome Pack',
            '--kind',
            'prompt',
            '--skip-test',
            '--project',
            tempDir,
        ]);
        const promptPath = path.join(tempDir, 'src', 'prompts', 'providers', 'welcome-pack.prompt.ts');
        const promptTestPath = path.join(tempDir, 'src', 'prompts', 'providers', '__tests__', 'welcome-pack.prompt.test.ts');
        expect(await pathExists(promptPath)).toBe(true);
        expect(await readFile(promptPath)).toContain('WelcomePackPromptProvider');
        expect(await pathExists(promptTestPath)).toBe(false);
    });
    it('generates standalone tests with custom descriptions', async () => {
        const cli = (0, index_1.createCLI)({ exitOverride: true });
        await run(cli, [
            'generate',
            'test',
            'resource',
            'catalog',
            '--description',
            'Catalog resource provider',
            '--project',
            tempDir,
        ]);
        const testPath = path.join(tempDir, 'src', 'resources', 'providers', '__tests__', 'catalog.resource.test.ts');
        expect(await pathExists(testPath)).toBe(true);
        const testContent = await readFile(testPath);
        expect(testContent).toContain("describe('CatalogResourceProvider'");
        expect(testContent).toContain('CatalogResourceProvider');
    });
    it('scaffolds a project via create-project command', async () => {
        const cli = (0, index_1.createCLI)({ exitOverride: true });
        const previousCwd = process.cwd();
        process.chdir(tempDir);
        try {
            await run(cli, ['create-project', 'SampleProject', '--transport', 'http']);
        }
        finally {
            process.chdir(previousCwd);
        }
        const projectPath = path.join(tempDir, 'sampleproject');
        expect(await pathExists(projectPath)).toBe(true);
        expect(await pathExists(path.join(projectPath, 'package.json'))).toBe(true);
        expect(await readFile(path.join(projectPath, 'tsconfig.json'))).toContain('"strict": true');
        const indexContent = await readFile(path.join(projectPath, 'src', 'index.ts'));
        expect(indexContent).toContain("type: 'http'");
        expect(indexContent).toContain('await server.start();');
    });
    it('runs doctor successfully on a compliant project', async () => {
        const cli = (0, index_1.createCLI)({ exitOverride: true });
        await ensureFile(path.join(tempDir, 'package.json'), JSON.stringify({
            name: 'compliant-server',
            version: '1.0.0',
            scripts: {
                build: 'tsc',
                start: 'node dist/index.js',
                test: 'jest',
            },
            dependencies: {
                '@mcp-accelerator/core': '^1.0.0',
            },
        }, null, 2));
        await ensureFile(path.join(tempDir, 'tsconfig.json'), JSON.stringify({
            compilerOptions: {
                strict: true,
            },
        }, null, 2));
        await ensureFile(path.join(tempDir, 'src', 'index.ts'), 'export const noop = () => undefined;\n');
        // Scaffold minimum capabilities
        await run(cli, ['generate', 'tool', 'doctor-check', '--project', tempDir]);
        await run(cli, [
            'generate',
            'resource',
            'catalog',
            '--skip-test',
            '--project',
            tempDir,
        ]);
        await run(cli, [
            'generate',
            'prompt',
            'welcome',
            '--skip-test',
            '--project',
            tempDir,
        ]);
        await run(cli, ['doctor', '--project', tempDir]);
        const doctorResult = await (0, doctor_1.runDoctor)(tempDir);
        expect(doctorResult.hasFailures).toBe(false);
        expect(doctorResult.results.every((entry) => entry.status !== 'fail')).toBe(true);
    });
    it('flags missing dependencies when running doctor', async () => {
        const cli = (0, index_1.createCLI)({ exitOverride: true });
        await ensureFile(path.join(tempDir, 'package.json'), JSON.stringify({
            name: 'non-compliant-server',
            version: '1.0.0',
            scripts: {
                build: 'tsc',
                start: 'node dist/index.js',
            },
            dependencies: {},
        }, null, 2));
        await ensureFile(path.join(tempDir, 'src', 'index.ts'), 'export const noop = () => undefined;\n');
        await expect(run(cli, ['doctor', '--project', tempDir])).rejects.toThrow('Doctor checks failed.');
    });
});
//# sourceMappingURL=cli.test.js.map