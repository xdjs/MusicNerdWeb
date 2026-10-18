import { validateBioCorrection } from '../validateBioCorrection';

describe('validateBioCorrection', () => {
  it('accepts bounded reports and trims details', () => {
    expect(validateBioCorrection({ reason: 'wrong_artist', details: ' Namesake ', sourceUrl: 'https://example.com/bio', expectedBio: 'The bio' })).toEqual({ reason: 'wrong_artist', details: 'Namesake', sourceUrl: 'https://example.com/bio', expectedBio: 'The bio' });
  });
  it.each([null, {}, { reason: 'invented' }, { reason: 'other', details: 'x'.repeat(2001), expectedBio: 'bio' }, { reason: 'other', sourceUrl: 'javascript:alert(1)', expectedBio: 'bio' }, { reason: 'other', sourceUrl: 'http://localhost/a', expectedBio: 'bio' }])('rejects invalid input %p', value => {
    expect(validateBioCorrection(value)).toBeNull();
  });
});
