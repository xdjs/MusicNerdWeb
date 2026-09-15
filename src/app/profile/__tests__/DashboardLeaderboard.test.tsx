import { act, render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../Dashboard';
import type { User } from '@/server/db/DbTypes';

jest.mock('@/app/actions/serverActions', () => ({
    getUgcStatsInRangeAction: jest.fn().mockResolvedValue({ ugcCount: 99, artistsCount: 88 }),
}));
jest.mock('../UserEntriesTable', () => () => null);

const user = { id: 'current-user', username: 'Current User', wallet: null, isHidden: false } as User;
const active = { userId: user.id, wallet: null, ugcCount: 4, artistsCount: 2, isHidden: false };
const other = { userId: 'other', wallet: null, ugcCount: 8, artistsCount: 0, isHidden: false };
let rows: typeof active[];

beforeEach(() => {
    rows = [];
    jest.mocked(fetch).mockImplementation(async input => ({
        ok: true,
        json: async () => String(input).startsWith('/api/leaderboard') ? rows : [],
    } as Response));
});

const stat = (label: string) => screen.getByText(label).parentElement!;
const view = (range: 'today' | 'all', account = user) => <Dashboard user={account} selectedRange={range} showLeaderboard={false} showDateRange={false} hideLogin />;

it('clears the previous rank and counts when switching to an inactive period', async () => {
    rows = [active];
    const { rerender } = render(view('all'));
    await screen.findByText('Rank:');
    await waitFor(() => expect(stat('UGC Added:')).toHaveTextContent('4'));
    rows = [];
    rerender(view('today'));
    await waitFor(() => expect(stat('UGC Added:')).toHaveTextContent('0'));
    expect(stat('Artists Added:')).toHaveTextContent('0');
    expect(stat('Rank:')).toHaveTextContent('—');
});

it('shows zero period counts on an initially empty period, not the all-time totals', async () => {
    render(view('today'));
    await screen.findByText('Rank:');
    await waitFor(() => expect(stat('UGC Added:')).toHaveTextContent('0'));
    expect(stat('Artists Added:')).toHaveTextContent('0');
    expect(stat('Rank:')).toHaveTextContent('—');
});

it('identifies the current account by user ID when multiple accounts have no wallet', async () => {
    rows = [other, active];
    render(view('all'));
    await screen.findByText('Rank:');
    await waitFor(() => expect(stat('UGC Added:')).toHaveTextContent('4'));
    expect(stat('Rank:')).toHaveTextContent('2');
});

it('keeps an inactive walletless account unranked when other contributors qualify', async () => {
    rows = [other];
    render(view('today'));
    await screen.findByText('Rank:');
    await waitFor(() => expect(stat('UGC Added:')).toHaveTextContent('0'));
    expect(stat('Rank:')).toHaveTextContent('—');
});

it('keeps hidden accounts unranked while showing the selected period counts', async () => {
    render(view('today', { ...user, isHidden: true }));
    await screen.findByText('Rank:');
    await waitFor(() => expect(stat('UGC Added:')).toHaveTextContent('0'));
    expect(stat('Rank:')).toHaveTextContent('N/A');
});

it('ignores a late response from the previous period', async () => {
    let resolveOld!: (response: Response) => void;
    const oldResponse = new Promise<Response>(resolve => { resolveOld = resolve; });
    jest.mocked(fetch).mockImplementation(async input => {
        if (String(input) === '/api/leaderboard') return oldResponse;
        return { ok: true, json: async () => [] } as Response;
    });
    const { rerender } = render(view('all'));
    await screen.findByText('Rank:');
    rerender(view('today'));
    await waitFor(() => expect(stat('UGC Added:')).toHaveTextContent('0'));
    await act(async () => {
        resolveOld({ ok: true, json: async () => [active] } as Response);
    });
    expect(stat('UGC Added:')).toHaveTextContent('0');
    expect(stat('Rank:')).toHaveTextContent('—');
});
