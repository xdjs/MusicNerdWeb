import { getShareProposalOptions } from '../getShareProposalOptions';
test('ignores experimental layouts outside previews and bounds query input', () => {
    expect(getShareProposalOptions(new URLSearchParams('layout=editorial'), false)).toBeNull();
    expect(getShareProposalOptions(new URLSearchParams('layout=script'), true)).toBeNull();
    expect(getShareProposalOptions(new URLSearchParams('layout=portrait&palette=pink&cta=untrusted'), true)).toEqual({ layout: 'portrait', palette: 'white', cta: 'know' });
    expect(getShareProposalOptions(new URLSearchParams('layout=profile&palette=logo&cta=meet'), true)).toEqual({ layout: 'profile', palette: 'logo', cta: 'meet' });
});
