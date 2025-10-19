"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const tool_manager_1 = require("../tool-manager");
class NoopLogger {
    info() { }
    warn() { }
    error() { }
    debug() { }
}
describe('ToolManager JSON schema conversion', () => {
    it('produces a JSON Schema compatible structure for tool metadata', async () => {
        const manager = new tool_manager_1.ToolManager(new NoopLogger());
        manager.registerTool({
            name: 'read_file',
            description: 'Read file contents',
            inputSchema: zod_1.z.object({
                path: zod_1.z.string().min(1, 'Path is required'),
                encoding: zod_1.z.enum(['utf-8', 'base64']).optional(),
                withMetadata: zod_1.z.boolean().default(false),
            }),
            handler: async () => ({ content: 'mock' }),
        });
        const metadata = manager.getToolsMetadata();
        expect(metadata).toHaveLength(1);
        const toolMetadata = metadata[0];
        expect(toolMetadata.name).toBe('read_file');
        expect(toolMetadata.inputSchema).toMatchObject({
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                },
                encoding: {
                    type: 'string',
                    enum: ['utf-8', 'base64'],
                },
                withMetadata: {
                    type: 'boolean',
                },
            },
            required: ['path'],
        });
        expect(toolMetadata.inputSchema).not.toHaveProperty('$schema');
    });
});
//# sourceMappingURL=tool-manager.test.js.map