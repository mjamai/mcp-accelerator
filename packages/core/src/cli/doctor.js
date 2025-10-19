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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printDoctorReport = exports.runDoctor = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
async function pathExists(target) {
    try {
        await fs_1.promises.access(target);
        return true;
    }
    catch {
        return false;
    }
}
function mergeDependencies(pkg) {
    if (!pkg || typeof pkg !== 'object') {
        return {};
    }
    return Object.fromEntries(Object.entries(pkg).filter((entry) => typeof entry[0] === 'string' && typeof entry[1] === 'string'));
}
const packageJsonCheck = {
    id: 'package-json',
    description: 'Validate package.json presence and MCP dependencies',
    async run(projectRoot) {
        const pkgPath = path.resolve(projectRoot, 'package.json');
        if (!(await pathExists(pkgPath))) {
            return {
                id: this.id,
                description: this.description,
                status: 'fail',
                message: 'package.json is missing.',
                details: ['Create a package.json with MCP Accelerator dependencies.'],
            };
        }
        const raw = await fs_1.promises.readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(raw);
        const dependencies = {
            ...mergeDependencies(pkg.dependencies),
            ...mergeDependencies(pkg.devDependencies),
            ...mergeDependencies(pkg.peerDependencies),
        };
        const hasCore = Boolean(dependencies['@mcp-accelerator/core'] || dependencies['mcp-accelerator']);
        const details = [];
        let status = hasCore ? 'pass' : 'fail';
        const scripts = pkg.scripts;
        if (!hasCore) {
            details.push('Add "@mcp-accelerator/core" to dependencies.');
        }
        if (!scripts?.build) {
            details.push('Missing "build" script. Recommended value: "tsc".');
        }
        if (!scripts?.start) {
            details.push('Missing "start" script. Recommended value: "node dist/index.js".');
        }
        if (!scripts?.test) {
            details.push('Missing "test" script to run your MCP server tests.');
        }
        if (status === 'pass' && details.length > 0) {
            status = 'warn';
        }
        return {
            id: this.id,
            description: this.description,
            status,
            message: hasCore
                ? 'package.json found with MCP Accelerator dependency.'
                : 'package.json found but MCP Accelerator dependency is missing.',
            details,
        };
    },
};
const tsconfigCheck = {
    id: 'tsconfig',
    description: 'Ensure strict TypeScript configuration',
    async run(projectRoot) {
        const tsconfigPath = path.resolve(projectRoot, 'tsconfig.json');
        if (!(await pathExists(tsconfigPath))) {
            return {
                id: this.id,
                description: this.description,
                status: 'warn',
                message: 'tsconfig.json not found.',
                details: ['Create a tsconfig.json with "strict": true for better type safety.'],
            };
        }
        const raw = await fs_1.promises.readFile(tsconfigPath, 'utf8');
        const tsconfig = JSON.parse(raw);
        const strict = tsconfig.compilerOptions?.strict;
        const details = [];
        let status = 'pass';
        if (strict !== true) {
            status = 'warn';
            details.push('Enable "compilerOptions.strict": true to follow MCP guidance.');
        }
        return {
            id: this.id,
            description: this.description,
            status,
            message: 'tsconfig.json found.',
            details,
        };
    },
};
async function directoryHasFiles(dirPath) {
    try {
        const entries = await fs_1.promises.readdir(dirPath);
        return entries.some((entry) => !entry.startsWith('.'));
    }
    catch {
        return false;
    }
}
const sourceLayoutCheck = {
    id: 'source-structure',
    description: 'Inspect source layout for MCP capabilities',
    async run(projectRoot) {
        const srcDir = path.resolve(projectRoot, 'src');
        const indexFile = path.join(srcDir, 'index.ts');
        const toolsDir = path.join(srcDir, 'tools');
        const resourcesDir = path.join(srcDir, 'resources', 'providers');
        const promptsDir = path.join(srcDir, 'prompts', 'providers');
        const details = [];
        let status = 'pass';
        if (!(await pathExists(srcDir))) {
            return {
                id: this.id,
                description: this.description,
                status: 'fail',
                message: 'src directory is missing.',
                details: ['Create a src/ directory containing index.ts and MCP components.'],
            };
        }
        if (!(await pathExists(indexFile))) {
            status = 'fail';
            details.push('Missing src/index.ts entry point.');
        }
        if (!(await pathExists(toolsDir))) {
            if (status !== 'fail')
                status = 'warn';
            details.push('Tools directory not found (expected at src/tools).');
        }
        else if (!(await directoryHasFiles(toolsDir))) {
            if (status !== 'fail')
                status = 'warn';
            details.push('Tools directory is empty. Register at least one tool.');
        }
        if (!(await pathExists(resourcesDir))) {
            if (status !== 'fail')
                status = 'warn';
            details.push('Resource providers directory not found (expected at src/resources/providers).');
        }
        if (!(await pathExists(promptsDir))) {
            if (status !== 'fail')
                status = 'warn';
            details.push('Prompt providers directory not found (expected at src/prompts/providers).');
        }
        const message = status === 'fail'
            ? 'Source structure has blocking issues.'
            : 'Source structure checked.';
        return {
            id: this.id,
            description: this.description,
            status,
            message,
            details,
        };
    },
};
async function hasTestFiles(startDir) {
    const queue = [startDir];
    while (queue.length > 0) {
        const current = queue.pop();
        if (!current) {
            continue;
        }
        let entries;
        try {
            entries = await fs_1.promises.readdir(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                queue.push(fullPath);
                continue;
            }
            if (entry.isFile() && /\.test\.ts$/.test(entry.name)) {
                return true;
            }
        }
    }
    return false;
}
const testsCheck = {
    id: 'tests',
    description: 'Confirm test coverage for CLI and tools',
    async run(projectRoot) {
        const hasTests = await hasTestFiles(path.resolve(projectRoot, 'src'));
        if (hasTests) {
            return {
                id: this.id,
                description: this.description,
                status: 'pass',
                message: 'Test files detected.',
                details: [],
            };
        }
        return {
            id: this.id,
            description: this.description,
            status: 'warn',
            message: 'No *.test.ts files found under src/.',
            details: ['Add tests under src/**/__tests__ to ensure MCP compliance.'],
        };
    },
};
const CHECKS = [
    packageJsonCheck,
    tsconfigCheck,
    sourceLayoutCheck,
    testsCheck,
];
async function runDoctor(projectRoot) {
    const results = [];
    let hasFailures = false;
    for (const check of CHECKS) {
        try {
            const result = await check.run(projectRoot);
            if (result.status === 'fail') {
                hasFailures = true;
            }
            results.push(result);
        }
        catch (error) {
            hasFailures = true;
            results.push({
                id: check.id,
                description: check.description,
                status: 'fail',
                message: `Unexpected error: ${error.message}`,
                details: [],
            });
        }
    }
    return { results, hasFailures };
}
exports.runDoctor = runDoctor;
function printDoctorReport(result) {
    console.log(chalk_1.default.bold('MCP Accelerator Doctor Report'));
    for (const checkResult of result.results) {
        const statusLabel = checkResult.status === 'pass'
            ? chalk_1.default.green('PASS')
            : checkResult.status === 'warn'
                ? chalk_1.default.yellow('WARN')
                : chalk_1.default.red('FAIL');
        console.log(`• ${statusLabel} ${chalk_1.default.bold(checkResult.description)} — ${checkResult.message}`);
        if (checkResult.details.length > 0) {
            for (const detail of checkResult.details) {
                const bullet = checkResult.status === 'pass'
                    ? chalk_1.default.green('  ↳')
                    : checkResult.status === 'warn'
                        ? chalk_1.default.yellow('  ↳')
                        : chalk_1.default.red('  ↳');
                console.log(`${bullet} ${detail}`);
            }
        }
    }
    if (result.hasFailures) {
        console.log(chalk_1.default.red('\nDoctor detected blocking issues. Please fix the failures above.'));
    }
    else if (result.results.some((entry) => entry.status === 'warn')) {
        console.log(chalk_1.default.yellow('\nDoctor completed with warnings. Address them for full compliance.'));
    }
    else {
        console.log(chalk_1.default.green('\nAll checks passed. Your project follows MCP best practices.'));
    }
}
exports.printDoctorReport = printDoctorReport;
//# sourceMappingURL=doctor.js.map