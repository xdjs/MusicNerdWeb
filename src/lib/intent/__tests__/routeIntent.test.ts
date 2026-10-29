import { routeIntent } from '../routeIntent';
describe('routeIntent', () => {
 it('routes career intent', () => { expect(routeIntent('Show her career timeline')).toEqual({ view: 'timeline', filter: 'all' }); });
 it('routes visual exploration', () => { expect(routeIntent('Show me her music videos')).toEqual({ view: 'world', filter: 'all' }); });
 it('preserves follow-up context', () => { expect(routeIntent('Only releases', {view:'timeline',filter:'all'})).toEqual({view:'timeline',filter:'releases'}); });
 it('declines unsupported requests', () => { expect(routeIntent('Who is her manager?')).toBeNull(); });
 it('supports listening and NFT history', () => {
  expect(routeIntent('Where should I start listening?')?.view).toBe('listen');
  expect(routeIntent('Show her NFT history')).toEqual({view:'timeline',filter:'community'});
 });
});
