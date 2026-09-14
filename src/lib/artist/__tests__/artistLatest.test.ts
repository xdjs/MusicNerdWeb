import { orderLatestItems, type ArtistLatestItem } from '../artistLatest';

function item(id: string, date: string, kind: ArtistLatestItem['kind'] = 'release'): ArtistLatestItem {
    return { id, date, kind, title: id, text: '', imageUrl: null, imageCaption: '', sourceUrl: null, sourceLabel: '' };
}

it('places partial dates at their period boundary in a mixed gallery without changing their precision', () => {
    const month = item('month', '2026-08');
    const year = item('year', '2025');
    const augustPost = item('august-post', '2026-08-15T10:00:00Z', 'instagram');
    const decemberAnswer = item('december-answer', '2025-12-20T10:00:00Z', 'interview');
    const septemberPost = item('september-post', '2026-09-02T10:00:00Z', 'instagram');
    expect(orderLatestItems([decemberAnswer, augustPost, year, month, septemberPost], Date.parse('2026-09-03')))
        .toEqual([septemberPost, month, augustPost, year, decemberAnswer]);
    expect(month.date).toBe('2026-08');
    expect(year.date).toBe('2025');
});

it('withholds incomplete or invalid partial periods while keeping precise recent activity', () => {
    const today = item('today', '2026-09-15T01:00:00Z', 'instagram');
    const lastYear = item('last-year', '2025');
    expect(orderLatestItems([
        item('this-month', '2026-09'), item('this-year', '2026'), item('future', '2027'),
        item('bad-month', '2026-13'), item('zero-month', '2026-00'), item('zero-year', '0000'),
        today, lastYear,
    ], Date.parse('2026-09-15T12:00:00Z'))).toEqual([today, lastYear]);
});

it('respects leap-month boundaries instead of treating February as its first day', () => {
    const february = item('february', '2024-02');
    const leapDay = item('leap-day', '2024-02-29T12:00:00Z', 'instagram');
    expect(orderLatestItems([february, leapDay], Date.parse('2024-02-29T13:00:00Z'))).toEqual([leapDay]);
    expect(orderLatestItems([leapDay, february], Date.parse('2024-03-01'))).toEqual([february, leapDay]);
});
