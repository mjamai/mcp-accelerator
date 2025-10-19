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
exports.logGenerationResult = exports.generateProject = exports.generateTransport = exports.generateTest = exports.generatePromptProvider = exports.generateResourceProvider = exports.generateTool = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const tool_template_1 = require("./templates/tool-template");
const resource_template_1 = require("./templates/resource-template");
const prompt_template_1 = require("./templates/prompt-template");
const transport_template_1 = require("./templates/transport-template");
const project_template_1 = require("./templates/project-template");
const TRANSPORT_TARGET = path.join('src', 'transports');
const DEFAULT_TARGETS = {
    tool: path.join('src', 'tools'),
    resource: path.join('src', 'resources', 'providers'),
    prompt: path.join('src', 'prompts', 'providers'),
};
const DEFAULT_DESCRIPTIONS = {
    tool: 'Describe the tool purpose',
    resource: 'Describe the resource provider purpose',
    prompt: 'Describe the prompt pack purpose',
};
const TEST_SUFFIX = {
    tool: '.test.ts',
    resource: '.resource.test.ts',
    prompt: '.prompt.test.ts',
};
function toSlug(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
async function pathExists(filePath) {
    try {
        await fs_1.promises.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function writeFileSafely(absolutePath, content, force) {
    if (!force && (await pathExists(absolutePath))) {
        return 'skipped';
    }
    await fs_1.promises.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs_1.promises.writeFile(absolutePath, content, 'utf8');
    return 'created';
}
function relativePath(projectRoot, absolutePath) {
    return path.relative(projectRoot, absolutePath) || '.';
}
async function generateTool(name, options) {
    const slug = toSlug(name);
    if (!slug) {
        throw new Error('Tool name must contain alphanumeric characters.');
    }
    const targetDir = options.targetDir ?? DEFAULT_TARGETS.tool;
    const description = options.description ?? DEFAULT_DESCRIPTIONS.tool;
    const projectRoot = options.projectRoot;
    const implementationPath = path.resolve(projectRoot, targetDir, `${slug}.ts`);
    const testPath = path.resolve(projectRoot, targetDir, '__tests__', `${slug}${TEST_SUFFIX.tool}`);
    const result = { created: [], skipped: [] };
    const implementationStatus = await writeFileSafely(implementationPath, (0, tool_template_1.generateToolFile)({ name: slug, description }), options.force);
    if (implementationStatus === 'created') {
        result.created.push(relativePath(projectRoot, implementationPath));
    }
    else {
        result.skipped.push(relativePath(projectRoot, implementationPath));
    }
    if (!options.skipTest) {
        const testStatus = await writeFileSafely(testPath, (0, tool_template_1.generateToolTest)({ name: slug, description }), options.force);
        if (testStatus === 'created') {
            result.created.push(relativePath(projectRoot, testPath));
        }
        else {
            result.skipped.push(relativePath(projectRoot, testPath));
        }
    }
    return result;
}
exports.generateTool = generateTool;
async function generateResourceProvider(name, options) {
    const slug = toSlug(name);
    if (!slug) {
        throw new Error('Resource provider name must contain alphanumeric characters.');
    }
    const targetDir = options.targetDir ?? DEFAULT_TARGETS.resource;
    const description = options.description ?? DEFAULT_DESCRIPTIONS.resource;
    const projectRoot = options.projectRoot;
    const implementationPath = path.resolve(projectRoot, targetDir, `${slug}.resource.ts`);
    const testPath = path.resolve(projectRoot, targetDir, '__tests__', `${slug}${TEST_SUFFIX.resource}`);
    const templateOptions = {
        name: slug,
        description,
    };
    const result = { created: [], skipped: [] };
    const implementationStatus = await writeFileSafely(implementationPath, (0, resource_template_1.generateResourceFile)(templateOptions), options.force);
    if (implementationStatus === 'created') {
        result.created.push(relativePath(projectRoot, implementationPath));
    }
    else {
        result.skipped.push(relativePath(projectRoot, implementationPath));
    }
    if (!options.skipTest) {
        const testStatus = await writeFileSafely(testPath, (0, resource_template_1.generateResourceTest)(templateOptions), options.force);
        if (testStatus === 'created') {
            result.created.push(relativePath(projectRoot, testPath));
        }
        else {
            result.skipped.push(relativePath(projectRoot, testPath));
        }
    }
    return result;
}
exports.generateResourceProvider = generateResourceProvider;
async function generatePromptProvider(name, options) {
    const slug = toSlug(name);
    if (!slug) {
        throw new Error('Prompt provider name must contain alphanumeric characters.');
    }
    const targetDir = options.targetDir ?? DEFAULT_TARGETS.prompt;
    const description = options.description ?? DEFAULT_DESCRIPTIONS.prompt;
    const projectRoot = options.projectRoot;
    const implementationPath = path.resolve(projectRoot, targetDir, `${slug}.prompt.ts`);
    const testPath = path.resolve(projectRoot, targetDir, '__tests__', `${slug}${TEST_SUFFIX.prompt}`);
    const templateOptions = {
        name: slug,
        description,
    };
    const result = { created: [], skipped: [] };
    const implementationStatus = await writeFileSafely(implementationPath, (0, prompt_template_1.generatePromptFile)(templateOptions), options.force);
    if (implementationStatus === 'created') {
        result.created.push(relativePath(projectRoot, implementationPath));
    }
    else {
        result.skipped.push(relativePath(projectRoot, implementationPath));
    }
    if (!options.skipTest) {
        const testStatus = await writeFileSafely(testPath, (0, prompt_template_1.generatePromptTest)(templateOptions), options.force);
        if (testStatus === 'created') {
            result.created.push(relativePath(projectRoot, testPath));
        }
        else {
            result.skipped.push(relativePath(projectRoot, testPath));
        }
    }
    return result;
}
exports.generatePromptProvider = generatePromptProvider;
async function generateTest(entity, name, options) {
    const slug = toSlug(name);
    if (!slug) {
        throw new Error('Test name must contain alphanumeric characters.');
    }
    const projectRoot = options.projectRoot;
    const targetDir = options.targetDir ?? `${DEFAULT_TARGETS[entity]}${path.sep}__tests__`;
    const fileName = entity === 'tool'
        ? `${slug}${TEST_SUFFIX.tool}`
        : entity === 'resource'
            ? `${slug}${TEST_SUFFIX.resource}`
            : `${slug}${TEST_SUFFIX.prompt}`;
    const testPath = path.resolve(projectRoot, targetDir, fileName);
    const description = options.description ??
        (entity === 'tool'
            ? DEFAULT_DESCRIPTIONS.tool
            : entity === 'resource'
                ? DEFAULT_DESCRIPTIONS.resource
                : DEFAULT_DESCRIPTIONS.prompt);
    const templateOptions = { name: slug, description };
    let testContent;
    switch (entity) {
        case 'tool':
            testContent = (0, tool_template_1.generateToolTest)(templateOptions);
            break;
        case 'resource':
            testContent = (0, resource_template_1.generateResourceTest)(templateOptions);
            break;
        case 'prompt':
            testContent = (0, prompt_template_1.generatePromptTest)(templateOptions);
            break;
        default:
            throw new Error(`Unsupported test entity: ${entity}`);
    }
    const status = await writeFileSafely(testPath, testContent, options.force);
    if (status === 'created') {
        return { created: [relativePath(projectRoot, testPath)], skipped: [] };
    }
    return { created: [], skipped: [relativePath(projectRoot, testPath)] };
}
exports.generateTest = generateTest;
async function generateTransport(name, options) {
    const slug = toSlug(name);
    if (!slug) {
        throw new Error('Transport name must contain alphanumeric characters.');
    }
    const targetDir = options.targetDir ?? TRANSPORT_TARGET;
    const projectRoot = options.projectRoot;
    const implementationPath = path.resolve(projectRoot, targetDir, `${slug}-transport.ts`);
    const testPath = path.resolve(projectRoot, targetDir, '__tests__', `${slug}-transport.test.ts`);
    const templateOptions = { name: slug };
    const result = { created: [], skipped: [] };
    const implementationStatus = await writeFileSafely(implementationPath, (0, transport_template_1.generateTransportFile)(templateOptions), options.force);
    if (implementationStatus === 'created') {
        result.created.push(relativePath(projectRoot, implementationPath));
    }
    else {
        result.skipped.push(relativePath(projectRoot, implementationPath));
    }
    if (!options.skipTest) {
        const testStatus = await writeFileSafely(testPath, (0, transport_template_1.generateTransportTest)(templateOptions), options.force);
        if (testStatus === 'created') {
            result.created.push(relativePath(projectRoot, testPath));
        }
        else {
            result.skipped.push(relativePath(projectRoot, testPath));
        }
    }
    return result;
}
exports.generateTransport = generateTransport;
async function generateProject(name, options) {
    const slug = toSlug(name) || name.trim();
    if (!slug) {
        throw new Error('Project name must contain alphanumeric characters.');
    }
    const projectPath = path.resolve(options.projectRoot, slug);
    const exists = await pathExists(projectPath);
    if (exists) {
        const entries = await fs_1.promises.readdir(projectPath);
        if (entries.length > 0 && !options.force) {
            throw new Error(`Directory "${slug}" already exists and is not empty. Use --force to overwrite.`);
        }
    }
    await fs_1.promises.mkdir(projectPath, { recursive: true });
    const srcDir = path.join(projectPath, 'src');
    const toolsDir = path.join(srcDir, 'tools');
    await fs_1.promises.mkdir(toolsDir, { recursive: true });
    const templateOptions = {
        name: slug,
        transport: options.transport,
    };
    const files = [
        {
            filePath: path.join(projectPath, 'package.json'),
            content: (0, project_template_1.generatePackageJson)(templateOptions),
        },
        {
            filePath: path.join(projectPath, 'tsconfig.json'),
            content: (0, project_template_1.generateTsConfig)(),
        },
        {
            filePath: path.join(projectPath, 'README.md'),
            content: (0, project_template_1.generateReadme)(templateOptions),
        },
        {
            filePath: path.join(projectPath, '.gitignore'),
            content: (0, project_template_1.generateGitignore)(),
        },
        {
            filePath: path.join(projectPath, 'jest.config.js'),
            content: (0, project_template_1.generateJestConfig)(),
        },
        {
            filePath: path.join(srcDir, 'index.ts'),
            content: (0, project_template_1.generateMainFile)(templateOptions),
        },
    ];
    const result = { created: [], skipped: [] };
    for (const file of files) {
        const status = await writeFileSafely(file.filePath, file.content, options.force);
        const relative = relativePath(projectPath, file.filePath);
        if (status === 'created') {
            result.created.push(relative);
        }
        else {
            result.skipped.push(relative);
        }
    }
    return { ...result, projectPath };
}
exports.generateProject = generateProject;
function logGenerationResult(result) {
    if (result.created.length > 0) {
        console.log(chalk_1.default.green('✔ Created:'), result.created.map((entry) => chalk_1.default.green(entry)).join(', '));
    }
    if (result.skipped.length > 0) {
        console.log(chalk_1.default.yellow('⚠ Skipped (already exists):'), result.skipped.map((entry) => chalk_1.default.yellow(entry)).join(', '));
    }
}
exports.logGenerationResult = logGenerationResult;
//# sourceMappingURL=generator.js.map