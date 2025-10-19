import { PromptManager } from '../prompt-manager';
import { SilentLogger } from '../../core/logger';
import { InMemoryPromptProvider } from '../providers/in-memory-provider';

describe('PromptManager', () => {
  const createManager = () => new PromptManager(new SilentLogger());

  it('lists prompts with provider metadata', async () => {
    const manager = createManager();
    const provider = new InMemoryPromptProvider('builtin', 'Builtin prompts', [
      {
        id: 'greet-user',
        title: 'Greet the user',
        content: [
          { role: 'system', text: 'You are a friendly assistant.' },
          { role: 'user', text: 'Say hello to {{name}}.' },
        ],
        placeholders: [{ id: 'name', required: true }],
      },
    ]);

    manager.registerProvider(provider);

    const prompts = await manager.listPrompts({});
    expect(prompts).toHaveLength(1);
    expect(prompts[0].metadata?.provider).toMatchObject({
      id: 'builtin',
      displayName: 'Builtin prompts',
    });
  });

  it('retrieves prompt by id', async () => {
    const manager = createManager();
    const provider = new InMemoryPromptProvider('builtin', 'Builtin prompts', [
      {
        id: 'greet-user',
        title: 'Greet the user',
        content: [{ role: 'user', text: 'Hello' }],
      },
    ]);

    manager.registerProvider(provider);

    const prompt = await manager.getPrompt('greet-user', {});
    expect(prompt?.id).toBe('greet-user');
  });
});
