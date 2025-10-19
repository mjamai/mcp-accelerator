#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';

import {
  generatePromptProvider,
  generateResourceProvider,
  generateTool,
  generateTest,
  generateTransport,
  generateProject,
  logGenerationResult,
  GeneratorEntity,
} from './generator';
import { runDoctor, printDoctorReport } from './doctor';
import { version } from '../../package.json';

export interface CliOptions {
  exitOverride?: boolean;
}

function resolveProjectRoot(project: string | undefined): string {
  const base = project ?? '.';
  return path.resolve(process.cwd(), base);
}

export function createCLI(options?: CliOptions): Command {
  const program = new Command();
  const shouldExitOverride = Boolean(options?.exitOverride);

  if (shouldExitOverride) {
    program.exitOverride();
  }

  const wrapAction =
    <T extends unknown[]>(action: (...args: T) => Promise<void>) =>
    async (...args: T) => {
      try {
        await action(...args);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(message));
        if (shouldExitOverride) {
          throw error;
        }
        process.exitCode = 1;
      }
    };

  program
    .name('mcp-accelerator')
    .description('Developer tooling for the Model Context Protocol Accelerator.')
    .version(version);

  program
    .command('create-project <name>')
    .description('Create a new MCP Accelerator project with recommended defaults.')
    .option('-t, --transport <type>', 'Transport type (stdio | http | websocket | sse).', 'stdio')
    .option('-f, --force', 'Overwrite files if the directory already exists.', false)
    .action(
      wrapAction(async (name: string, cmdOptions: Record<string, unknown>) => {
        const transport = (cmdOptions.transport as string | undefined)?.toLowerCase() ?? 'stdio';
        if (!['stdio', 'http', 'websocket', 'sse'].includes(transport)) {
          throw new Error('Invalid transport type. Use stdio, http, websocket, or sse.');
        }

        const result = await generateProject(name, {
          projectRoot: process.cwd(),
          transport: transport as 'stdio' | 'http' | 'websocket' | 'sse',
          force: Boolean(cmdOptions.force),
        });

        console.log(chalk.green(`✔ Project created at ${result.projectPath}`));
        if (result.created.length > 0) {
          console.log(chalk.green('  Files:'));
          for (const file of result.created) {
            console.log(chalk.green(`    • ${file}`));
          }
        }
        if (result.skipped.length > 0) {
          console.log(chalk.yellow('  Skipped (already existed):'));
          for (const file of result.skipped) {
            console.log(chalk.yellow(`    • ${file}`));
          }
        }

        console.log('\nNext steps:');
        console.log(`  cd ${path.relative(process.cwd(), result.projectPath) || '.'}`);
        console.log('  npm install');
        console.log('  npm run dev');
      }),
    );

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
    .action(
      wrapAction(async (name: string, cmdOptions: Record<string, unknown>) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project as string | undefined);
        const result = await generateTool(name, {
          projectRoot,
          targetDir: cmdOptions.target as string | undefined,
          description: cmdOptions.description as string | undefined,
          skipTest: Boolean(cmdOptions.skipTest),
          force: Boolean(cmdOptions.force),
        });
        logGenerationResult(result);
      }),
    );

  generate
    .command('resource <name>')
    .description('Create a resource provider and optional tests.')
    .option('-d, --description <description>', 'Resource provider description.')
    .option('-t, --target <dir>', 'Target directory for the provider implementation.')
    .option('--skip-test', 'Skip test generation.', false)
    .option('-f, --force', 'Overwrite existing files.', false)
    .option('-p, --project <path>', 'Project root.', '.')
    .action(
      wrapAction(async (name: string, cmdOptions: Record<string, unknown>) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project as string | undefined);
        const result = await generateResourceProvider(name, {
          projectRoot,
          targetDir: cmdOptions.target as string | undefined,
          description: cmdOptions.description as string | undefined,
          skipTest: Boolean(cmdOptions.skipTest),
          force: Boolean(cmdOptions.force),
        });
        logGenerationResult(result);
      }),
    );

  generate
    .command('prompt <name>')
    .description('Create a prompt provider and optional tests.')
    .option('-d, --description <description>', 'Prompt provider description.')
    .option('-t, --target <dir>', 'Target directory for the provider implementation.')
    .option('--skip-test', 'Skip test generation.', false)
    .option('-f, --force', 'Overwrite existing files.', false)
    .option('-p, --project <path>', 'Project root.', '.')
    .action(
      wrapAction(async (name: string, cmdOptions: Record<string, unknown>) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project as string | undefined);
        const result = await generatePromptProvider(name, {
          projectRoot,
          targetDir: cmdOptions.target as string | undefined,
          description: cmdOptions.description as string | undefined,
          skipTest: Boolean(cmdOptions.skipTest),
          force: Boolean(cmdOptions.force),
        });
        logGenerationResult(result);
      }),
    );

  generate
    .command('provider <name>')
    .description('Create a resource or prompt provider scaffold.')
    .option('-k, --kind <kind>', 'Provider kind: resource | prompt.', 'resource')
    .option('-d, --description <description>', 'Provider description.')
    .option('-t, --target <dir>', 'Target directory for the provider implementation.')
    .option('--skip-test', 'Skip test generation.', false)
    .option('-f, --force', 'Overwrite existing files.', false)
    .option('-p, --project <path>', 'Project root.', '.')
    .action(
      wrapAction(async (name: string, cmdOptions: Record<string, unknown>) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project as string | undefined);
        const kind = (cmdOptions.kind as string | undefined)?.toLowerCase() ?? 'resource';

        if (kind !== 'resource' && kind !== 'prompt') {
          throw new Error(`Unknown provider kind "${kind}". Use "resource" or "prompt".`);
        }

        const commonOptions = {
          projectRoot,
          targetDir: cmdOptions.target as string | undefined,
          description: cmdOptions.description as string | undefined,
          skipTest: Boolean(cmdOptions.skipTest),
          force: Boolean(cmdOptions.force),
        };

        const result =
          kind === 'resource'
            ? await generateResourceProvider(name, commonOptions)
            : await generatePromptProvider(name, commonOptions);

        logGenerationResult(result);
      }),
    );

  generate
    .command('transport <name>')
    .description('Create a custom transport implementation and tests.')
    .option('-t, --target <dir>', 'Target directory for the transport implementation.')
    .option('--skip-test', 'Skip test generation.', false)
    .option('-f, --force', 'Overwrite existing files.', false)
    .option('-p, --project <path>', 'Project root.', '.')
    .action(
      wrapAction(async (name: string, cmdOptions: Record<string, unknown>) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project as string | undefined);
        const result = await generateTransport(name, {
          projectRoot,
          targetDir: cmdOptions.target as string | undefined,
          skipTest: Boolean(cmdOptions.skipTest),
          force: Boolean(cmdOptions.force),
        });
        logGenerationResult(result);
      }),
    );

  generate
    .command('test <entity> <name>')
    .description('Generate a standalone test for tools, resources, or prompts.')
    .option('-d, --description <description>', 'Description used in assertions.')
    .option('-t, --target <dir>', 'Target directory for the test file.')
    .option('-f, --force', 'Overwrite existing files.', false)
    .option('-p, --project <path>', 'Project root.', '.')
    .action(
      wrapAction(async (entity: string, name: string, cmdOptions: Record<string, unknown>) => {
        const normalized = entity.toLowerCase();
        if (!['tool', 'resource', 'prompt'].includes(normalized)) {
          throw new Error('Entity must be one of: tool, resource, prompt.');
        }

        const projectRoot = resolveProjectRoot(cmdOptions.project as string | undefined);
        const result = await generateTest(normalized as GeneratorEntity, name, {
          projectRoot,
          targetDir: cmdOptions.target as string | undefined,
          description: cmdOptions.description as string | undefined,
          force: Boolean(cmdOptions.force),
        });
        logGenerationResult(result);
      }),
    );

  program
    .command('generate-tool <name>')
    .description('Alias for "generate tool".')
    .option('-d, --description <description>', 'Tool description.', 'A new MCP tool')
    .option('-o, --output <path>', 'Output directory.', './src/tools')
    .action(
      wrapAction(async (name: string, cmdOptions: Record<string, unknown>) => {
        const projectRoot = process.cwd();
        const result = await generateTool(name, {
          projectRoot,
          targetDir: cmdOptions.output as string | undefined,
          description: cmdOptions.description as string | undefined,
          skipTest: false,
          force: false,
        });
        logGenerationResult(result);
      }),
    );

  program
    .command('generate-transport <name>')
    .description('Alias for "generate transport".')
    .option('-o, --output <path>', 'Output directory.', './src/transports')
    .action(
      wrapAction(async (name: string, cmdOptions: Record<string, unknown>) => {
        const projectRoot = process.cwd();
        const result = await generateTransport(name, {
          projectRoot,
          targetDir: cmdOptions.output as string | undefined,
          skipTest: false,
          force: false,
        });
        logGenerationResult(result);
      }),
    );

  program
    .command('list-tools')
    .description('List tools from a running MCP server (placeholder).')
    .action(
      wrapAction(async () => {
        console.log(
          'This command will list tools from a running MCP server in a future update.',
        );
      }),
    );

  program
    .command('doctor')
    .description('Verify project compliance with MCP Accelerator best practices.')
    .option('-p, --project <path>', 'Project root.', '.')
    .action(
      wrapAction(async (cmdOptions: Record<string, unknown>) => {
        const projectRoot = resolveProjectRoot(cmdOptions.project as string | undefined);
        const doctorResult = await runDoctor(projectRoot);
        printDoctorReport(doctorResult);

        if (doctorResult.hasFailures) {
          const error = new Error('Doctor checks failed.');
          if (shouldExitOverride) {
            throw error;
          }
          process.exitCode = 1;
        }
      }),
    );

  return program;
}

async function main(): Promise<void> {
  const program = createCLI();
  await program.parseAsync(process.argv);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  });
}
