import { render, screen, fireEvent } from '@testing-library/react';
import ContributionFilters from '../ContributionFilters';
const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const data = {userId:'account',query:'',type:'',origin:'',status:'all',counts:{user:{total:2,pending:1},research:{total:3,pending:0},unknown:{total:145,pending:0}}};
beforeEach(()=>push.mockClear());
it('applies dropdowns immediately with account and current search intact, resetting pagination',()=>{
 render(<ContributionFilters data={data}/>);
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'new search'}});
 fireEvent.change(screen.getByLabelText('Type'),{target:{value:'lore'}});
 const url = new URL(push.mock.calls[0][0],'https://example.test');
 expect(url.searchParams.get('userId')).toBe('account');
 expect(url.searchParams.get('query')).toBe('new search');
 expect(url.searchParams.get('type')).toBe('lore');
 expect(url.searchParams.get('status')).toBe('all');
 expect(url.searchParams.get('page')).toBe('1');
 expect(push.mock.calls[0][1]).toEqual({scroll:false});
});
it('search submits with the selected origin and clear preserves account history defaults',()=>{
 render(<ContributionFilters data={{...data,origin:'unknown',status:'approved'}}/>);
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Bio Ritmo'}});
 fireEvent.submit(screen.getByRole('search'));
 expect(push.mock.calls[0][0]).toContain('origin=unknown');
 expect(push.mock.calls[0][0]).toContain('query=Bio+Ritmo');
 const clear = new URL(screen.getByRole('link',{name:'Clear filters'}).getAttribute('href')!,'https://example.test');
 expect(clear.searchParams.get('userId')).toBe('account');
 expect(clear.searchParams.get('status')).toBe('all');
 expect(clear.searchParams.has('origin')).toBe(false);
});
it('shows origin counts without an unnecessary clear action on the default history',()=>{
 render(<ContributionFilters data={data}/>);
 expect(screen.getByRole('option',{name:'Unknown origin (145 total)'})).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Clear filters'})).not.toBeInTheDocument();
 expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder','Search artist or URL');
});
it('clears global filters to the pending queue',()=>{
 render(<ContributionFilters data={{...data,userId:'',status:'all'}}/>);
 expect(screen.getByRole('link',{name:'Clear filters'})).toHaveAttribute('href','/admin/contributions?status=pending');
});
