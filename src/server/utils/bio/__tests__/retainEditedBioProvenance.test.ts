import { createHash } from 'node:crypto';
import { retainEditedBioProvenance } from '../retainEditedBioProvenance';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const provenance = { version: 1, kind: 'generated', bioHash: hash('old'), claimId: 'claim', sources: [{ id: 1, kind: 'vault', revision: 'a'.repeat(64) }] };
it('preserves legacy manual behavior without inventing evidence', () => expect(retainEditedBioProvenance('old', 'new', null)).toBeNull());
it('keeps generated lineage through a manual edit', () => expect(retainEditedBioProvenance('old', 'new', provenance)).toEqual({ ...provenance, bioHash: hash('new') }));
it('keeps an unchanged value exactly, including unknown lineage', () => expect(retainEditedBioProvenance('old', 'old', provenance)).toBe(provenance));
it.each([{}, { ...provenance, bioHash: 'wrong' }, { version: 1, kind: 'unknown', bioHash: hash('old') }])('fails closed for unverified lineage', value => expect(retainEditedBioProvenance('old', 'new', value)).toEqual({ version: 1, kind: 'unknown', bioHash: hash('new') }));

it("preserves authored claim-scoped lineage through edits", () => expect(retainEditedBioProvenance("old", "new", {...provenance,kind:"authored"})).toEqual({...provenance,kind:"authored",bioHash:hash("new")}));
