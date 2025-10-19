/**
 * Template generators for creating new projects
 */

export interface ProjectTemplateOptions {
  name: string;
  transport: 'stdio' | 'http' | 'websocket' | 'sse';
}

export function generatePackageJson(options: ProjectTemplateOptions): string {
  return `{
  "name": "${options.name}",
  "version": "1.0.0",
  "description": "MCP Server built with MCP Accelerator",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "keywords": ["mcp", "server"],
  "license": "MIT",
  "dependencies": {
    "mcp-accelerator": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1"
  }
}
`;
}

export function generateTsConfig(): string {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`;
}

export function generateMainFile(options: ProjectTemplateOptions): string {
  const portMap = {
    stdio: '',
    http: '3000',
    websocket: '3001',
    sse: '3002',
  };

  const transportConfig = options.transport === 'stdio'
    ? `type: 'stdio'`
    : `type: '${options.transport}',
    port: ${portMap[options.transport]},
    host: '127.0.0.1'`;

  return `import { createServer, applyDefaultSecurity, z } from 'mcp-accelerator';

/**
 * Main entry point for ${options.name}
 */
async function main() {
  // Create MCP server
  const server = createServer({
    name: '${options.name}',
    version: '1.0.0',
    transport: {
      ${transportConfig}
    }
  });

  // Apply recommended security/observability defaults (configurable via env variables)
  await applyDefaultSecurity(server, {
    auth: {
      jwt: {
        secret: process.env.MCP_JWT_SECRET,
      },
      apiKey: {
        keys: process.env.MCP_API_KEYS?.split(',').map((key) => key.trim()).filter(Boolean),
      },
    },
    rateLimit: {
      max: process.env.MCP_RATE_LIMIT_MAX ? Number(process.env.MCP_RATE_LIMIT_MAX) : undefined,
      windowMs: process.env.MCP_RATE_LIMIT_WINDOW_MS ? Number(process.env.MCP_RATE_LIMIT_WINDOW_MS) : undefined,
    },
    observability: {
      serviceName: process.env.OTEL_SERVICE_NAME,
      serviceVersion: process.env.OTEL_SERVICE_VERSION,
      environment: process.env.OTEL_ENVIRONMENT,
    },
  });

  // Register example tools
  server.registerTool({
    name: 'echo',
    description: 'Echo back the input message',
    inputSchema: z.object({
      message: z.string().describe('Message to echo'),
    }),
    handler: async (input) => {
      return { echoed: input.message };
    },
  });

  server.registerTool({
    name: 'add',
    description: 'Add two numbers',
    inputSchema: z.object({
      a: z.number().describe('First number'),
      b: z.number().describe('Second number'),
    }),
    handler: async (input) => {
      return { result: input.a + input.b };
    },
  });

  // Start the server
  await server.start();
  
  console.log('${options.name} is running!');
  console.log(\`Transport: ${options.transport}\`);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

// Run the server
main().catch(console.error);
`;
}

export function generateReadme(options: ProjectTemplateOptions): string {
  return `# ${options.name}

MCP Server built with [MCP Accelerator](https://github.com/mcp-accelerator).

## Features

- ✨ Built with MCP Accelerator framework
- 🚀 ${options.transport.toUpperCase()} transport
- 🔧 Type-safe tool definitions with Zod
- 📝 Easy to extend and customize

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Run

\`\`\`bash
npm start
\`\`\`

## Available Tools

### echo
Echo back the input message.

**Input:**
- \`message\` (string): Message to echo

**Output:**
- \`echoed\` (string): The echoed message

### add
Add two numbers.

**Input:**
- \`a\` (number): First number
- \`b\` (number): Second number

**Output:**
- \`result\` (number): The sum

## Adding New Tools

Create new tools in \`src/tools/\` directory:

\`\`\`typescript
import { z } from 'mcp-accelerator';

export const myTool = {
  name: 'my-tool',
  description: 'Description of my tool',
  inputSchema: z.object({
    param: z.string(),
  }),
  handler: async (input) => {
    return { result: 'processed' };
  },
};
\`\`\`

Then register it in \`src/index.ts\`:

\`\`\`typescript
server.registerTool(myTool);
\`\`\`

## License

MIT
`;
}

export function generateGitignore(): string {
  return `node_modules/
dist/
coverage/
*.log
.env
.DS_Store
`;
}

export function generateJestConfig(): string {
  return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
};
`;
}
