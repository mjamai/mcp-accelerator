import { MCPServer, InMemoryPromptProvider } from '@mcp-accelerator/core';

export async function bootstrapPromptServer(): Promise<MCPServer> {
  const server = new MCPServer({
    name: 'prompt-server',
    version: '1.0.0',
  });

  server.registerPromptProvider(
    new InMemoryPromptProvider('builtin', 'Built-in prompts', [
      {
        id: 'onboard-user',
        title: 'Onboard a new teammate',
        description: 'Introduces a teammate to the current project with a warm greeting.',
        version: '1.0.0',
        tags: ['welcome', 'onboarding'],
        placeholders: [
          {
            id: 'name',
            description: 'Name of the teammate to welcome',
            required: true,
          },
          {
            id: 'project',
            description: 'Project the teammate will work on',
            required: true,
          },
          {
            id: 'mentor',
            description: 'Person responsible for onboarding',
            required: false,
          },
        ],
        content: [
          { role: 'system', text: 'You are a friendly engineering manager.' },
          {
            role: 'user',
            text: [
              'Please welcome {{name}} to the {{project}} project.',
              'Mention that their mentor will be {{mentor}} if provided.',
            ].join(' '),
          },
        ],
      },
    ]),
  );

  return server;
}
