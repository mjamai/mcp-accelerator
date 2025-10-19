/**
 * Templates for generating prompt providers
 */
export interface PromptTemplateOptions {
    name: string;
    description?: string;
}
export declare function generatePromptFile(options: PromptTemplateOptions): string;
export declare function generatePromptTest(options: PromptTemplateOptions): string;
//# sourceMappingURL=prompt-template.d.ts.map