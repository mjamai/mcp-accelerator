import { promises as fs } from 'fs';
import * as path from 'path';
import chalk from 'chalk';

import { generateToolFile, generateToolTest } from './templates/tool-template';
import {
  generateResourceFile,
  generateResourceTest,
  ResourceTemplateOptions,
} from './templates/resource-template';
import {
  generatePromptFile,
  generatePromptTest,
  PromptTemplateOptions,
} from './templates/prompt-template';
import {
  generateTransportFile,
  generateTransportTest,
  TransportTemplateOptions,
} from './templates/transport-template';
import {
  generatePackageJson,
  generateTsConfig,
  generateMainFile,
  generateReadme,
  generateGitignore,
  generateJestConfig,
  ProjectTemplateOptions,
} from './templates/project-template';

export type GeneratorEntity = 'tool' | 'resource' | 'prompt';

export interface GeneratorResult {
  created: string[];
  skipped: string[];
}

export interface BaseGeneratorOptions {
  projectRoot: string;
  targetDir?: string;
  description?: string;
  force?: boolean;
  skipTest?: boolean;
}

export interface TestGeneratorOptions {
  projectRoot: string;
  targetDir?: string;
  force?: boolean;
  description?: string;
}

export interface ProjectGeneratorOptions {
  projectRoot: string;
  transport: 'stdio' | 'http' | 'websocket' | 'sse';
  force?: boolean;
}

export interface ProjectGeneratorResult extends GeneratorResult {
  projectPath: string;
}

const TRANSPORT_TARGET = path.join('src', 'transports');

const DEFAULT_TARGETS: Record<GeneratorEntity, string> = {
  tool: path.join('src', 'tools'),
  resource: path.join('src', 'resources', 'providers'),
  prompt: path.join('src', 'prompts', 'providers'),
};

const DEFAULT_DESCRIPTIONS: Record<GeneratorEntity, string> = {
  tool: 'Describe the tool purpose',
  resource: 'Describe the resource provider purpose',
  prompt: 'Describe the prompt pack purpose',
};

const TEST_SUFFIX: Record<GeneratorEntity, string> = {
  tool: '.test.ts',
  resource: '.resource.test.ts',
  prompt: '.prompt.test.ts',
};

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeFileSafely(
  absolutePath: string,
  content: string,
  force?: boolean,
): Promise<'created' | 'skipped'> {
  if (!force && (await pathExists(absolutePath))) {
    return 'skipped';
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, 'utf8');
  return 'created';
}

function relativePath(projectRoot: string, absolutePath: string): string {
  return path.relative(projectRoot, absolutePath) || '.';
}

export async function generateTool(
  name: string,
  options: BaseGeneratorOptions,
): Promise<GeneratorResult> {
  const slug = toSlug(name);
  if (!slug) {
    throw new Error('Tool name must contain alphanumeric characters.');
  }

  const targetDir = options.targetDir ?? DEFAULT_TARGETS.tool;
  const description = options.description ?? DEFAULT_DESCRIPTIONS.tool;
  const projectRoot = options.projectRoot;

  const implementationPath = path.resolve(projectRoot, targetDir, `${slug}.ts`);
  const testPath = path.resolve(
    projectRoot,
    targetDir,
    '__tests__',
    `${slug}${TEST_SUFFIX.tool}`,
  );

  const result: GeneratorResult = { created: [], skipped: [] };

  const implementationStatus = await writeFileSafely(
    implementationPath,
    generateToolFile({ name: slug, description }),
    options.force,
  );

  if (implementationStatus === 'created') {
    result.created.push(relativePath(projectRoot, implementationPath));
  } else {
    result.skipped.push(relativePath(projectRoot, implementationPath));
  }

  if (!options.skipTest) {
    const testStatus = await writeFileSafely(
      testPath,
      generateToolTest({ name: slug, description }),
      options.force,
    );
    if (testStatus === 'created') {
      result.created.push(relativePath(projectRoot, testPath));
    } else {
      result.skipped.push(relativePath(projectRoot, testPath));
    }
  }

  return result;
}

export async function generateResourceProvider(
  name: string,
  options: BaseGeneratorOptions,
): Promise<GeneratorResult> {
  const slug = toSlug(name);
  if (!slug) {
    throw new Error('Resource provider name must contain alphanumeric characters.');
  }

  const targetDir = options.targetDir ?? DEFAULT_TARGETS.resource;
  const description = options.description ?? DEFAULT_DESCRIPTIONS.resource;
  const projectRoot = options.projectRoot;

  const implementationPath = path.resolve(
    projectRoot,
    targetDir,
    `${slug}.resource.ts`,
  );
  const testPath = path.resolve(
    projectRoot,
    targetDir,
    '__tests__',
    `${slug}${TEST_SUFFIX.resource}`,
  );

  const templateOptions: ResourceTemplateOptions = {
    name: slug,
    description,
  };

  const result: GeneratorResult = { created: [], skipped: [] };

  const implementationStatus = await writeFileSafely(
    implementationPath,
    generateResourceFile(templateOptions),
    options.force,
  );

  if (implementationStatus === 'created') {
    result.created.push(relativePath(projectRoot, implementationPath));
  } else {
    result.skipped.push(relativePath(projectRoot, implementationPath));
  }

  if (!options.skipTest) {
    const testStatus = await writeFileSafely(
      testPath,
      generateResourceTest(templateOptions),
      options.force,
    );
    if (testStatus === 'created') {
      result.created.push(relativePath(projectRoot, testPath));
    } else {
      result.skipped.push(relativePath(projectRoot, testPath));
    }
  }

  return result;
}

export async function generatePromptProvider(
  name: string,
  options: BaseGeneratorOptions,
): Promise<GeneratorResult> {
  const slug = toSlug(name);
  if (!slug) {
    throw new Error('Prompt provider name must contain alphanumeric characters.');
  }

  const targetDir = options.targetDir ?? DEFAULT_TARGETS.prompt;
  const description = options.description ?? DEFAULT_DESCRIPTIONS.prompt;
  const projectRoot = options.projectRoot;

  const implementationPath = path.resolve(
    projectRoot,
    targetDir,
    `${slug}.prompt.ts`,
  );
  const testPath = path.resolve(
    projectRoot,
    targetDir,
    '__tests__',
    `${slug}${TEST_SUFFIX.prompt}`,
  );

  const templateOptions: PromptTemplateOptions = {
    name: slug,
    description,
  };

  const result: GeneratorResult = { created: [], skipped: [] };

  const implementationStatus = await writeFileSafely(
    implementationPath,
    generatePromptFile(templateOptions),
    options.force,
  );

  if (implementationStatus === 'created') {
    result.created.push(relativePath(projectRoot, implementationPath));
  } else {
    result.skipped.push(relativePath(projectRoot, implementationPath));
  }

  if (!options.skipTest) {
    const testStatus = await writeFileSafely(
      testPath,
      generatePromptTest(templateOptions),
      options.force,
    );
    if (testStatus === 'created') {
      result.created.push(relativePath(projectRoot, testPath));
    } else {
      result.skipped.push(relativePath(projectRoot, testPath));
    }
  }

  return result;
}

export async function generateTest(
  entity: GeneratorEntity,
  name: string,
  options: TestGeneratorOptions,
): Promise<GeneratorResult> {
  const slug = toSlug(name);
  if (!slug) {
    throw new Error('Test name must contain alphanumeric characters.');
  }

  const projectRoot = options.projectRoot;
  const targetDir =
    options.targetDir ?? `${DEFAULT_TARGETS[entity]}${path.sep}__tests__`;

  const fileName =
    entity === 'tool'
      ? `${slug}${TEST_SUFFIX.tool}`
      : entity === 'resource'
        ? `${slug}${TEST_SUFFIX.resource}`
        : `${slug}${TEST_SUFFIX.prompt}`;

  const testPath = path.resolve(projectRoot, targetDir, fileName);
  const description =
    options.description ??
    (entity === 'tool'
      ? DEFAULT_DESCRIPTIONS.tool
      : entity === 'resource'
        ? DEFAULT_DESCRIPTIONS.resource
        : DEFAULT_DESCRIPTIONS.prompt);
  const templateOptions = { name: slug, description };

  let testContent: string;
  switch (entity) {
    case 'tool':
      testContent = generateToolTest(templateOptions);
      break;
    case 'resource':
      testContent = generateResourceTest(templateOptions);
      break;
    case 'prompt':
      testContent = generatePromptTest(templateOptions);
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

export async function generateTransport(
  name: string,
  options: BaseGeneratorOptions,
): Promise<GeneratorResult> {
  const slug = toSlug(name);
  if (!slug) {
    throw new Error('Transport name must contain alphanumeric characters.');
  }

  const targetDir = options.targetDir ?? TRANSPORT_TARGET;
  const projectRoot = options.projectRoot;

  const implementationPath = path.resolve(
    projectRoot,
    targetDir,
    `${slug}-transport.ts`,
  );
  const testPath = path.resolve(
    projectRoot,
    targetDir,
    '__tests__',
    `${slug}-transport.test.ts`,
  );

  const templateOptions: TransportTemplateOptions = { name: slug };
  const result: GeneratorResult = { created: [], skipped: [] };

  const implementationStatus = await writeFileSafely(
    implementationPath,
    generateTransportFile(templateOptions),
    options.force,
  );

  if (implementationStatus === 'created') {
    result.created.push(relativePath(projectRoot, implementationPath));
  } else {
    result.skipped.push(relativePath(projectRoot, implementationPath));
  }

  if (!options.skipTest) {
    const testStatus = await writeFileSafely(
      testPath,
      generateTransportTest(templateOptions),
      options.force,
    );
    if (testStatus === 'created') {
      result.created.push(relativePath(projectRoot, testPath));
    } else {
      result.skipped.push(relativePath(projectRoot, testPath));
    }
  }

  return result;
}

export async function generateProject(
  name: string,
  options: ProjectGeneratorOptions,
): Promise<ProjectGeneratorResult> {
  const slug = toSlug(name) || name.trim();
  if (!slug) {
    throw new Error('Project name must contain alphanumeric characters.');
  }

  const projectPath = path.resolve(options.projectRoot, slug);
  const exists = await pathExists(projectPath);

  if (exists) {
    const entries = await fs.readdir(projectPath);
    if (entries.length > 0 && !options.force) {
      throw new Error(
        `Directory "${slug}" already exists and is not empty. Use --force to overwrite.`,
      );
    }
  }

  await fs.mkdir(projectPath, { recursive: true });

  const srcDir = path.join(projectPath, 'src');
  const toolsDir = path.join(srcDir, 'tools');
  await fs.mkdir(toolsDir, { recursive: true });

  const templateOptions: ProjectTemplateOptions = {
    name: slug,
    transport: options.transport,
  };

  const files: Array<{ filePath: string; content: string }> = [
    {
      filePath: path.join(projectPath, 'package.json'),
      content: generatePackageJson(templateOptions),
    },
    {
      filePath: path.join(projectPath, 'tsconfig.json'),
      content: generateTsConfig(),
    },
    {
      filePath: path.join(projectPath, 'README.md'),
      content: generateReadme(templateOptions),
    },
    {
      filePath: path.join(projectPath, '.gitignore'),
      content: generateGitignore(),
    },
    {
      filePath: path.join(projectPath, 'jest.config.js'),
      content: generateJestConfig(),
    },
    {
      filePath: path.join(srcDir, 'index.ts'),
      content: generateMainFile(templateOptions),
    },
  ];

  const result: GeneratorResult = { created: [], skipped: [] };

  for (const file of files) {
    const status = await writeFileSafely(file.filePath, file.content, options.force);
    const relative = relativePath(projectPath, file.filePath);
    if (status === 'created') {
      result.created.push(relative);
    } else {
      result.skipped.push(relative);
    }
  }

  return { ...result, projectPath };
}

export function logGenerationResult(result: GeneratorResult): void {
  if (result.created.length > 0) {
    console.log(
      chalk.green('✔ Created:'),
      result.created.map((entry) => chalk.green(entry)).join(', '),
    );
  }

  if (result.skipped.length > 0) {
    console.log(
      chalk.yellow('⚠ Skipped (already exists):'),
      result.skipped.map((entry) => chalk.yellow(entry)).join(', '),
    );
  }
}
