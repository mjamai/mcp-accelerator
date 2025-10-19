export type DoctorStatus = 'pass' | 'warn' | 'fail';
export interface DoctorCheckResult {
    id: string;
    description: string;
    status: DoctorStatus;
    message: string;
    details: string[];
}
export interface DoctorRunResult {
    results: DoctorCheckResult[];
    hasFailures: boolean;
}
export declare function runDoctor(projectRoot: string): Promise<DoctorRunResult>;
export declare function printDoctorReport(result: DoctorRunResult): void;
//# sourceMappingURL=doctor.d.ts.map