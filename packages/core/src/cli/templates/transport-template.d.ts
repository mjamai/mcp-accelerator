/**
 * Template generators for creating custom transports
 */
export interface TransportTemplateOptions {
    name: string;
}
export declare function generateTransportFile(options: TransportTemplateOptions): string;
export declare function generateTransportTest(options: TransportTemplateOptions): string;
//# sourceMappingURL=transport-template.d.ts.map