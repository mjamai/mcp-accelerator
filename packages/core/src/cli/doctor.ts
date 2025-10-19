import { promises as fs, Dirent } from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export type DoctorStatus = 'pass' | 'warn' | 'fail';

export interface DoctorCheckResult {
  id: string;
  description: string;
  status: DoctorStatus;
  message: string;
  details: string[];
}

export interface DoctorRunResult {
  results: DoctorCheckResult[];
  hasFailures: boolean;
}

interface DoctorCheck {
  id: string;
  description: string;
  run(projectRoot: string): Promise<DoctorCheckResult>;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function mergeDependencies(pkg: Record<string, unknown> | undefined): Record<string, string> {
  if (!pkg || typeof pkg !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(pkg).filter(
      (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string',
    ),
  );
}

const packageJsonCheck: DoctorCheck = {
  id: 'package-json',
  description: 'Validate package.json presence and MCP dependencies',
  async run(projectRoot: string): Promise<DoctorCheckResult> {
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

    const raw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;

    const dependencies = {
      ...mergeDependencies(pkg.dependencies as Record<string, unknown> | undefined),
      ...mergeDependencies(pkg.devDependencies as Record<string, unknown> | undefined),
      ...mergeDependencies(pkg.peerDependencies as Record<string, unknown> | undefined),
    };

    const hasCore = Boolean(dependencies['@mcp-accelerator/core'] || dependencies['mcp-accelerator']);

    const details: string[] = [];
    let status: DoctorStatus = hasCore ? 'pass' : 'fail';
    const scripts = pkg.scripts as Record<string, string> | undefined;

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

const tsconfigCheck: DoctorCheck = {
  id: 'tsconfig',
  description: 'Ensure strict TypeScript configuration',
  async run(projectRoot: string): Promise<DoctorCheckResult> {
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

    const raw = await fs.readFile(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(raw) as {
      compilerOptions?: Record<string, unknown>;
    };

    const strict = tsconfig.compilerOptions?.strict;
    const details: string[] = [];
    let status: DoctorStatus = 'pass';

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

async function directoryHasFiles(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath);
    return entries.some((entry) => !entry.startsWith('.'));
  } catch {
    return false;
  }
}

const sourceLayoutCheck: DoctorCheck = {
  id: 'source-structure',
  description: 'Inspect source layout for MCP capabilities',
  async run(projectRoot: string): Promise<DoctorCheckResult> {
    const srcDir = path.resolve(projectRoot, 'src');
    const indexFile = path.join(srcDir, 'index.ts');

    const toolsDir = path.join(srcDir, 'tools');
    const resourcesDir = path.join(srcDir, 'resources', 'providers');
    const promptsDir = path.join(srcDir, 'prompts', 'providers');

    const details: string[] = [];
    let status: DoctorStatus = 'pass';

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
      if (status !== 'fail') status = 'warn';
      details.push('Tools directory not found (expected at src/tools).');
    } else if (!(await directoryHasFiles(toolsDir))) {
      if (status !== 'fail') status = 'warn';
      details.push('Tools directory is empty. Register at least one tool.');
    }

    if (!(await pathExists(resourcesDir))) {
      if (status !== 'fail') status = 'warn';
      details.push('Resource providers directory not found (expected at src/resources/providers).');
    }

    if (!(await pathExists(promptsDir))) {
      if (status !== 'fail') status = 'warn';
      details.push('Prompt providers directory not found (expected at src/prompts/providers).');
    }

    const message =
      status === 'fail'
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

async function hasTestFiles(startDir: string): Promise<boolean> {
  const queue: string[] = [startDir];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
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

const testsCheck: DoctorCheck = {
  id: 'tests',
  description: 'Confirm test coverage for CLI and tools',
  async run(projectRoot: string): Promise<DoctorCheckResult> {
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

const CHECKS: DoctorCheck[] = [
  packageJsonCheck,
  tsconfigCheck,
  sourceLayoutCheck,
  testsCheck,
];

export async function runDoctor(projectRoot: string): Promise<DoctorRunResult> {
  const results: DoctorCheckResult[] = [];
  let hasFailures = false;

  for (const check of CHECKS) {
    try {
      const result = await check.run(projectRoot);
      if (result.status === 'fail') {
        hasFailures = true;
      }
      results.push(result);
    } catch (error) {
      hasFailures = true;
      results.push({
        id: check.id,
        description: check.description,
        status: 'fail',
        message: `Unexpected error: ${(error as Error).message}`,
        details: [],
      });
    }
  }

  return { results, hasFailures };
}

export function printDoctorReport(result: DoctorRunResult): void {
  console.log(chalk.bold('MCP Accelerator Doctor Report'));

  for (const checkResult of result.results) {
    const statusLabel =
      checkResult.status === 'pass'
        ? chalk.green('PASS')
        : checkResult.status === 'warn'
          ? chalk.yellow('WARN')
          : chalk.red('FAIL');

    console.log(
      `• ${statusLabel} ${chalk.bold(checkResult.description)} — ${checkResult.message}`,
    );

    if (checkResult.details.length > 0) {
      for (const detail of checkResult.details) {
        const bullet =
          checkResult.status === 'pass'
            ? chalk.green('  ↳')
            : checkResult.status === 'warn'
              ? chalk.yellow('  ↳')
              : chalk.red('  ↳');
        console.log(`${bullet} ${detail}`);
      }
    }
  }

  if (result.hasFailures) {
    console.log(chalk.red('\nDoctor detected blocking issues. Please fix the failures above.'));
  } else if (result.results.some((entry) => entry.status === 'warn')) {
    console.log(
      chalk.yellow('\nDoctor completed with warnings. Address them for full compliance.'),
    );
  } else {
    console.log(chalk.green('\nAll checks passed. Your project follows MCP best practices.'));
  }
}
