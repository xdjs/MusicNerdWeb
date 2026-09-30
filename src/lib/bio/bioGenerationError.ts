/** Carry generation preconditions through server actions without turning them into outages. */
export class BioGenerationError extends Error {
    constructor(message: string, readonly status: number, readonly code?: string) {
        super(message);
        this.name = 'BioGenerationError';
    }
}
