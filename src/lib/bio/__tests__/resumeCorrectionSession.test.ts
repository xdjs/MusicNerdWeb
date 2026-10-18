import { resumeCorrectionSession } from '../resumeCorrectionSession';

beforeEach(() => sessionStorage.clear());
it('leaves ordinary sign-in on its existing path', async () => {
 const update = jest.fn();
 expect(await resumeCorrectionSession('/artist/artist', update)).toBe(false);
 expect(update).not.toHaveBeenCalled();
});
it('updates the shared session for the current artist correction', async () => {
 sessionStorage.setItem('mn:bio-correction:artist', JSON.stringify({reason:'incorrect',details:'A correction',sourceUrl:'',bio:'Bio'}));
 const update = jest.fn().mockResolvedValue({user:{id:'user'}});
 expect(await resumeCorrectionSession('/artist/artist', update)).toBe(true);
 expect(update).toHaveBeenCalledTimes(1);
 expect(sessionStorage.getItem('mn:bio-correction:artist')).not.toBeNull();
});
it('does not resume a draft for a different page', async () => {
 sessionStorage.setItem('mn:bio-correction:other', '{}');
 const update = jest.fn();
 expect(await resumeCorrectionSession('/artist/artist', update)).toBe(false);
 expect(update).not.toHaveBeenCalled();
});
it('keeps the draft and reports a missing session instead of reloading', async () => {
 sessionStorage.setItem('mn:bio-correction:artist', '{}');
 await expect(resumeCorrectionSession('/artist/artist', jest.fn().mockResolvedValue(null))).rejects.toThrow('Sign-in could not finish');
 expect(sessionStorage.getItem('mn:bio-correction:artist')).not.toBeNull();
});
