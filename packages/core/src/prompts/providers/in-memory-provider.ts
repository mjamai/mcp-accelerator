import {
  PromptDefinition,
  PromptProvider,
  PromptProviderContext,
} from '../../types';

export interface InMemoryPrompt extends PromptDefinition {}

export class InMemoryPromptProvider implements PromptProvider {
  public readonly id: string;
  public readonly displayName: string;

  private readonly prompts: Map<string, InMemoryPrompt> = new Map();

  constructor(id: string, displayName: string, entries: InMemoryPrompt[] = []) {
    this.id = id;
    this.displayName = displayName;
    entries.forEach((prompt) => this.prompts.set(prompt.id, prompt));
  }

  addPrompt(prompt: InMemoryPrompt): void {
    this.prompts.set(prompt.id, prompt);
  }

  async listPrompts(
    _context: PromptProviderContext,
  ): Promise<PromptDefinition[]> {
    return Array.from(this.prompts.values()).map((prompt) => ({ ...prompt }));
  }

  async getPrompt(
    id: string,
    _context: PromptProviderContext,
  ): Promise<PromptDefinition | null> {
    const prompt = this.prompts.get(id);
    return prompt ? { ...prompt } : null;
  }
}
