export type GeneratorEntity = 'tool' | 'resource' | 'prompt';
export interface GeneratorResult {
    created: string[];
    skipped: string[];
}
export interface BaseGeneratorOptions {
    projectRoot: string;
    targetDir?: string;
    description?: string;
    force?: boolean;
    skipTest?: boolean;
}
export interface TestGeneratorOptions {
    projectRoot: string;
    targetDir?: string;
    force?: boolean;
    description?: string;
}
export interface ProjectGeneratorOptions {
    projectRoot: string;
    transport: 'stdio' | 'http' | 'websocket' | 'sse';
    force?: boolean;
}
export interface ProjectGeneratorResult extends GeneratorResult {
    projectPath: string;
}
export declare function generateTool(name: string, options: BaseGeneratorOptions): Promise<GeneratorResult>;
export declare function generateResourceProvider(name: string, options: BaseGeneratorOptions): Promise<GeneratorResult>;
export declare function generatePromptProvider(name: string, options: BaseGeneratorOptions): Promise<GeneratorResult>;
export declare function generateTest(entity: GeneratorEntity, name: string, options: TestGeneratorOptions): Promise<GeneratorResult>;
export declare function generateTransport(name: string, options: BaseGeneratorOptions): Promise<GeneratorResult>;
export declare function generateProject(name: string, options: ProjectGeneratorOptions): Promise<ProjectGeneratorResult>;
export declare function logGenerationResult(result: GeneratorResult): void;
//# sourceMappingURL=generator.d.ts.map