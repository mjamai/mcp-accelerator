#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  generatePackageJson,
  generateTsConfig,
  generateMainFile,
  generateReadme,
  generateGitignore,
  generateJestConfig,
  ProjectTemplateOptions,
} from './templates/project-template';
import {
  generateToolFile,
  generateToolTest,
  ToolTemplateOptions,
} from './templates/tool-template';
import {
  generateTransportFile,
  generateTransportTest,
  TransportTemplateOptions,
} from './templates/transport-template';

const program = new Command();

program
  .name('mcp-accelerator')
  .description('CLI for MCP Accelerator framework')
  .version('1.0.0');

/**
 * Create new project command
 */
program
  .command('create-project <name>')
  .description('Create a new MCP server project')
  .option('-t, --transport <type>', 'Transport type (stdio, http, websocket, sse)', 'stdio')
  .action((name: string, options: { transport: string }) => {
    const transportType = options.transport as ProjectTemplateOptions['transport'];
    
    if (!['stdio', 'http', 'websocket', 'sse'].includes(transportType)) {
      console.error('Invalid transport type. Must be: stdio, http, websocket, or sse');
      process.exit(1);
    }

    console.log(`Creating new MCP project: ${name}`);
    console.log(`Transport: ${transportType}`);

    const projectPath = path.join(process.cwd(), name);

    // Check if directory exists
    if (fs.existsSync(projectPath)) {
      console.error(`Directory ${name} already exists`);
      process.exit(1);
    }

    // Create project structure
    fs.mkdirSync(projectPath);
    fs.mkdirSync(path.join(projectPath, 'src'));
    fs.mkdirSync(path.join(projectPath, 'src', 'tools'));

    const templateOptions: ProjectTemplateOptions = {
      name,
      transport: transportType,
    };

    // Generate files
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      generatePackageJson(templateOptions)
    );

    fs.writeFileSync(
      path.join(projectPath, 'tsconfig.json'),
      generateTsConfig()
    );

    fs.writeFileSync(
      path.join(projectPath, 'src', 'index.ts'),
      generateMainFile(templateOptions)
    );

    fs.writeFileSync(
      path.join(projectPath, 'README.md'),
      generateReadme(templateOptions)
    );

    fs.writeFileSync(
      path.join(projectPath, '.gitignore'),
      generateGitignore()
    );

    fs.writeFileSync(
      path.join(projectPath, 'jest.config.js'),
      generateJestConfig()
    );

    console.log('\n✅ Project created successfully!');
    console.log('\nNext steps:');
    console.log(`  cd ${name}`);
    console.log('  npm install');
    console.log('  npm run dev');
  });

/**
 * Generate tool command
 */
program
  .command('generate-tool <name>')
  .description('Generate a new tool')
  .option('-d, --description <desc>', 'Tool description', 'A new MCP tool')
  .option('-o, --output <path>', 'Output directory', './src/tools')
  .action((name: string, options: { description: string; output: string }) => {
    console.log(`Generating tool: ${name}`);

    const outputDir = path.join(process.cwd(), options.output);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const templateOptions: ToolTemplateOptions = {
      name,
      description: options.description,
    };

    // Generate tool file
    const toolPath = path.join(outputDir, `${name}.ts`);
    fs.writeFileSync(toolPath, generateToolFile(templateOptions));

    // Generate test file
    const testDir = path.join(outputDir, '__tests__');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    const testPath = path.join(testDir, `${name}.test.ts`);
    fs.writeFileSync(testPath, generateToolTest(templateOptions));

    console.log('\n✅ Tool generated successfully!');
    console.log(`\nFiles created:`);
    console.log(`  ${toolPath}`);
    console.log(`  ${testPath}`);
    console.log(`\nRegister it in your server:`);
    console.log(`  import { ${name}Tool } from './tools/${name}';`);
    console.log(`  server.registerTool(${name}Tool);`);
  });

/**
 * Generate transport command
 */
program
  .command('generate-transport <name>')
  .description('Generate a custom transport implementation')
  .option('-o, --output <path>', 'Output directory', './src/transports')
  .action((name: string, options: { output: string }) => {
    console.log(`Generating transport: ${name}`);

    const outputDir = path.join(process.cwd(), options.output);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const templateOptions: TransportTemplateOptions = { name };

    // Generate transport file
    const transportPath = path.join(outputDir, `${name}-transport.ts`);
    fs.writeFileSync(transportPath, generateTransportFile(templateOptions));

    // Generate test file
    const testDir = path.join(outputDir, '__tests__');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    const testPath = path.join(testDir, `${name}-transport.test.ts`);
    fs.writeFileSync(testPath, generateTransportTest(templateOptions));

    console.log('\n✅ Transport generated successfully!');
    console.log(`\nFiles created:`);
    console.log(`  ${transportPath}`);
    console.log(`  ${testPath}`);
    console.log(`\nUse it in your server:`);
    const className = name.charAt(0).toUpperCase() + name.slice(1) + 'Transport';
    console.log(`  import { ${className} } from './transports/${name}-transport';`);
    console.log(`  const transport = new ${className}();`);
    console.log(`  await server.setTransport(transport);`);
  });

/**
 * List tools command (for running server)
 */
program
  .command('list-tools')
  .description('List all available tools in the current project')
  .action(() => {
    console.log('This command would connect to a running MCP server and list tools.');
    console.log('Implementation requires a running server instance.');
  });

program.parse(process.argv);

