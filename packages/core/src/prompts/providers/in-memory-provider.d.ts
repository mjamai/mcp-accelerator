import { PromptDefinition, PromptProvider, PromptProviderContext } from '../../types';
export interface InMemoryPrompt extends PromptDefinition {
}
export declare class InMemoryPromptProvider implements PromptProvider {
    readonly id: string;
    readonly displayName: string;
    private readonly prompts;
    constructor(id: string, displayName: string, entries?: InMemoryPrompt[]);
    addPrompt(prompt: InMemoryPrompt): void;
    listPrompts(_context: PromptProviderContext): Promise<PromptDefinition[]>;
    getPrompt(id: string, _context: PromptProviderContext): Promise<PromptDefinition | null>;
}
//# sourceMappingURL=in-memory-provider.d.ts.map