/** Generated text lost a race with an artist edit or pin; never call this success. */
export class BioConflictError extends Error {
    constructor() {
        super('Your bio changed or was pinned while generation was running. Your current bio is safe; review it before trying again.');
        this.name = 'BioConflictError';
    }
}
