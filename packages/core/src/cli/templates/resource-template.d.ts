/**
 * Templates for generating resource providers
 */
export interface ResourceTemplateOptions {
    name: string;
    description?: string;
}
export declare function generateResourceFile(options: ResourceTemplateOptions): string;
export declare function generateResourceTest(options: ResourceTemplateOptions): string;
//# sourceMappingURL=resource-template.d.ts.map