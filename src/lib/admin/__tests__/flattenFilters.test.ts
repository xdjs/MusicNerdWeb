import { flattenFilters } from '../flattenFilters';

it('lifts the applied filters to the top level and drops the response status', () => {
  const page = flattenFilters<{ items: number[]; total: number; query: string; status: string }, 'query' | 'status'>(
    { status: 'ok', items: [1], total: 1, filters: { query: 'x', status: 'pending' } });
  expect(page).toEqual({ items: [1], total: 1, query: 'x', status: 'pending' });
});
