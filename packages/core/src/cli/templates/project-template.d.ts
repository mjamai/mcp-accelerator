/**
 * Template generators for creating new projects
 */
export interface ProjectTemplateOptions {
    name: string;
    transport: 'stdio' | 'http' | 'websocket' | 'sse';
}
export declare function generatePackageJson(options: ProjectTemplateOptions): string;
export declare function generateTsConfig(): string;
export declare function generateMainFile(options: ProjectTemplateOptions): string;
export declare function generateReadme(options: ProjectTemplateOptions): string;
export declare function generateGitignore(): string;
export declare function generateJestConfig(): string;
//# sourceMappingURL=project-template.d.ts.map