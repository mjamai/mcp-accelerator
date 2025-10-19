/**
 * Template generators for creating new tools
 */
export interface ToolTemplateOptions {
    name: string;
    description: string;
}
export declare function generateToolFile(options: ToolTemplateOptions): string;
export declare function generateToolTest(options: ToolTemplateOptions): string;
//# sourceMappingURL=tool-template.d.ts.map