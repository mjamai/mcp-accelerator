import { Logger, PromptDefinition, PromptProvider, StrictMetadata } from '../types';
/**
 * Manages prompt providers and resolves list/get operations.
 */
export declare class PromptManager<TMetadata extends StrictMetadata = StrictMetadata> {
    private logger;
    private providers;
    constructor(logger: Logger);
    registerProvider(provider: PromptProvider): void;
    listProviders(): PromptProvider[];
    listPrompts(metadata: TMetadata): Promise<PromptDefinition[]>;
    getPrompt(id: string, metadata: TMetadata): Promise<PromptDefinition | null>;
}
//# sourceMappingURL=prompt-manager.d.ts.map