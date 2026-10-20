import { getShareProposalOptions } from '../getShareProposalOptions';
test('ignores experimental layouts outside previews and bounds query input', () => {
    expect(getShareProposalOptions(new URLSearchParams('layout=editorial'), false)).toBeNull();
    expect(getShareProposalOptions(new URLSearchParams('layout=script'), true)).toBeNull();
    expect(getShareProposalOptions(new URLSearchParams('layout=portrait&palette=pink&cta=untrusted'), true)).toEqual({ layout: 'portrait', palette: 'white', cta: 'know' });
    expect(getShareProposalOptions(new URLSearchParams('layout=profile&palette=logo&cta=meet'), true)).toEqual({ layout: 'profile', palette: 'logo', cta: 'meet' });
});

test('story refinement and wording stay explicitly preview-only', () => {
    const params = new URLSearchParams('layout=story&palette=logo&cta=story');
    expect(getShareProposalOptions(params, false)).toBeNull();
    expect(getShareProposalOptions(params, true)).toEqual({ layout: 'story', palette: 'logo', cta: 'story' });
});

test.each(['cover', 'sleeve', 'dossier'])('%s art direction and alternate pink are preview-only', layout => {
    const params = new URLSearchParams(`layout=${layout}&palette=pink&cta=read`);
    expect(getShareProposalOptions(params, false)).toBeNull();
    expect(getShareProposalOptions(params, true)).toEqual({ layout, palette: 'pink', cta: 'read' });
});
