"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapPromptServer = void 0;
const core_1 = require("@mcp-accelerator/core");
async function bootstrapPromptServer() {
    const server = new core_1.MCPServer({
        name: 'prompt-server',
        version: '1.0.0',
    });
    server.registerPromptProvider(new core_1.InMemoryPromptProvider('builtin', 'Built-in prompts', [
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
    ]));
    return server;
}
exports.bootstrapPromptServer = bootstrapPromptServer;
//# sourceMappingURL=typed-prompts.js.map