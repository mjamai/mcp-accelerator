#!/usr/bin/env node
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
exports.createCLI = void 0;
const commander_1 = require("commander");
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const generator_1 = require("./generator");
const doctor_1 = require("./doctor");
const package_json_1 = require("../../package.json");
function resolveProjectRoot(project) {
    const base = project ?? '.';
    return path.resolve(process.cwd(), base);
}
function createCLI(options) {
    const program = new commander_1.Command();
    const shouldExitOverride = Boolean(options?.exitOverride);
    if (shouldExitOverride) {
        program.exitOverride();
    }
    const wrapAction = (action) => async (...args) => {
        try {
            await action(...args);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(chalk_1.default.red(message));
            if (shouldExitOverride) {
                throw error;
            }
            process.exitCode = 1;
        }
    };
    program
        .name('mcp-accelerator')
        .description('Developer tooling for the Model Context Protocol Accelerator.')
        .version(package_json_1.version);
    program
        .command('create-project <name>')
        .description('Create a new MCP Accelerator project with recommended defaults.')
        .option('-t, --transport <type>', 'Transport type (stdio | http | websocket | sse).', 'stdio')
        .option('-f, --force', 'Overwrite files if the directory already exists.', false)
        .action(wrapAction(async (name, cmdOptions) => {
        const transport = cmdOptions.transport?.toLowerCase() ?? 'stdio';
        if (!['stdio', 'http', 'websocket', 'sse'].includes(transport)) {
            throw new Error('Invalid transport type. Use stdio, http, websocket, or sse.');
        }
        const result = await (0, generator_1.generateProject)(name, {
            projectRoot: process.cwd(),
            transport: transport,
            force: Boolean(cmdOptions.force),
        });
        console.log(chalk_1.default.green(`✔ Project created at ${result.projectPath}`));
        if (result.created.length > 0) {
            console.log(chalk_1.default.green('  Files:'));
            for (const file of result.created) {
                console.log(chalk_1.default.green(`    • ${file}`));
            }
        }
        if (result.skipped.length > 0) {
            console.log(chalk_1.default.yellow('  Skipped (already existed):'));
            for (const file of result.skipped) {
                console.log(chalk_1.default.yellow(`    • ${file}`));
            }
        }
        console.log('\nNext steps:');
        console.log(`  cd ${path.relative(process.cwd(), result.projectPath) || '.'}`);
        console.log('  npm install');
        console.log('  npm run dev');
    }));
    const generate = program
        .command('generate')
        .alias('g')
        .description('Scaffold MCP tools, resources, prompts, providers, transports, and tests.');
    generate
        .command('tool <name>')
        .description('Create a new MCP tool definition and matching test.')
        .option('-d, --description <description>', 'Tool description.')
        .option('-t, --target <dir>', 'Target directory for the tool implementation.')
        .option('--skip-test', 'Skip test generation.', false)
        .option('-f, --force', 'Overwrite existing files.', false)
        .option('-p, --project <path>', 'Project root.', '.')
        .action(wrapAction(async (name, cmdOptions) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project);
        const result = await (0, generator_1.generateTool)(name, {
            projectRoot,
            targetDir: cmdOptions.target,
            description: cmdOptions.description,
            skipTest: Boolean(cmdOptions.skipTest),
            force: Boolean(cmdOptions.force),
        });
        (0, generator_1.logGenerationResult)(result);
    }));
    generate
        .command('resource <name>')
        .description('Create a resource provider and optional tests.')
        .option('-d, --description <description>', 'Resource provider description.')
        .option('-t, --target <dir>', 'Target directory for the provider implementation.')
        .option('--skip-test', 'Skip test generation.', false)
        .option('-f, --force', 'Overwrite existing files.', false)
        .option('-p, --project <path>', 'Project root.', '.')
        .action(wrapAction(async (name, cmdOptions) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project);
        const result = await (0, generator_1.generateResourceProvider)(name, {
            projectRoot,
            targetDir: cmdOptions.target,
            description: cmdOptions.description,
            skipTest: Boolean(cmdOptions.skipTest),
            force: Boolean(cmdOptions.force),
        });
        (0, generator_1.logGenerationResult)(result);
    }));
    generate
        .command('prompt <name>')
        .description('Create a prompt provider and optional tests.')
        .option('-d, --description <description>', 'Prompt provider description.')
        .option('-t, --target <dir>', 'Target directory for the provider implementation.')
        .option('--skip-test', 'Skip test generation.', false)
        .option('-f, --force', 'Overwrite existing files.', false)
        .option('-p, --project <path>', 'Project root.', '.')
        .action(wrapAction(async (name, cmdOptions) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project);
        const result = await (0, generator_1.generatePromptProvider)(name, {
            projectRoot,
            targetDir: cmdOptions.target,
            description: cmdOptions.description,
            skipTest: Boolean(cmdOptions.skipTest),
            force: Boolean(cmdOptions.force),
        });
        (0, generator_1.logGenerationResult)(result);
    }));
    generate
        .command('provider <name>')
        .description('Create a resource or prompt provider scaffold.')
        .option('-k, --kind <kind>', 'Provider kind: resource | prompt.', 'resource')
        .option('-d, --description <description>', 'Provider description.')
        .option('-t, --target <dir>', 'Target directory for the provider implementation.')
        .option('--skip-test', 'Skip test generation.', false)
        .option('-f, --force', 'Overwrite existing files.', false)
        .option('-p, --project <path>', 'Project root.', '.')
        .action(wrapAction(async (name, cmdOptions) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project);
        const kind = cmdOptions.kind?.toLowerCase() ?? 'resource';
        if (kind !== 'resource' && kind !== 'prompt') {
            throw new Error(`Unknown provider kind "${kind}". Use "resource" or "prompt".`);
        }
        const commonOptions = {
            projectRoot,
            targetDir: cmdOptions.target,
            description: cmdOptions.description,
            skipTest: Boolean(cmdOptions.skipTest),
            force: Boolean(cmdOptions.force),
        };
        const result = kind === 'resource'
            ? await (0, generator_1.generateResourceProvider)(name, commonOptions)
            : await (0, generator_1.generatePromptProvider)(name, commonOptions);
        (0, generator_1.logGenerationResult)(result);
    }));
    generate
        .command('transport <name>')
        .description('Create a custom transport implementation and tests.')
        .option('-t, --target <dir>', 'Target directory for the transport implementation.')
        .option('--skip-test', 'Skip test generation.', false)
        .option('-f, --force', 'Overwrite existing files.', false)
        .option('-p, --project <path>', 'Project root.', '.')
        .action(wrapAction(async (name, cmdOptions) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project);
        const result = await (0, generator_1.generateTransport)(name, {
            projectRoot,
            targetDir: cmdOptions.target,
            skipTest: Boolean(cmdOptions.skipTest),
            force: Boolean(cmdOptions.force),
        });
        (0, generator_1.logGenerationResult)(result);
    }));
    generate
        .command('test <entity> <name>')
        .description('Generate a standalone test for tools, resources, or prompts.')
        .option('-d, --description <description>', 'Description used in assertions.')
        .option('-t, --target <dir>', 'Target directory for the test file.')
        .option('-f, --force', 'Overwrite existing files.', false)
        .option('-p, --project <path>', 'Project root.', '.')
        .action(wrapAction(async (entity, name, cmdOptions) => {
        const normalized = entity.toLowerCase();
        if (!['tool', 'resource', 'prompt'].includes(normalized)) {
            throw new Error('Entity must be one of: tool, resource, prompt.');
        }
        const projectRoot = resolveProjectRoot(cmdOptions.project);
        const result = await (0, generator_1.generateTest)(normalized, name, {
            projectRoot,
            targetDir: cmdOptions.target,
            description: cmdOptions.description,
            force: Boolean(cmdOptions.force),
        });
        (0, generator_1.logGenerationResult)(result);
    }));
    program
        .command('generate-tool <name>')
        .description('Alias for "generate tool".')
        .option('-d, --description <description>', 'Tool description.', 'A new MCP tool')
        .option('-o, --output <path>', 'Output directory.', './src/tools')
        .action(wrapAction(async (name, cmdOptions) => {
        const projectRoot = process.cwd();
        const result = await (0, generator_1.generateTool)(name, {
            projectRoot,
            targetDir: cmdOptions.output,
            description: cmdOptions.description,
            skipTest: false,
            force: false,
        });
        (0, generator_1.logGenerationResult)(result);
    }));
    program
        .command('generate-transport <name>')
        .description('Alias for "generate transport".')
        .option('-o, --output <path>', 'Output directory.', './src/transports')
        .action(wrapAction(async (name, cmdOptions) => {
        const projectRoot = process.cwd();
        const result = await (0, generator_1.generateTransport)(name, {
            projectRoot,
            targetDir: cmdOptions.output,
            skipTest: false,
            force: false,
        });
        (0, generator_1.logGenerationResult)(result);
    }));
    program
        .command('list-tools')
        .description('List tools from a running MCP server (placeholder).')
        .action(wrapAction(async () => {
        console.log('This command will list tools from a running MCP server in a future update.');
    }));
    program
        .command('doctor')
        .description('Verify project compliance with MCP Accelerator best practices.')
        .option('-p, --project <path>', 'Project root.', '.')
        .action(wrapAction(async (cmdOptions) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project);
        const doctorResult = await (0, doctor_1.runDoctor)(projectRoot);
        (0, doctor_1.printDoctorReport)(doctorResult);
        if (doctorResult.hasFailures) {
            const error = new Error('Doctor checks failed.');
            if (shouldExitOverride) {
                throw error;
            }
            process.exitCode = 1;
        }
    }));
    return program;
}
exports.createCLI = createCLI;
async function main() {
    const program = createCLI();
    await program.parseAsync(process.argv);
}
if (require.main === module) {
    main().catch((error) => {
        console.error(chalk_1.default.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map