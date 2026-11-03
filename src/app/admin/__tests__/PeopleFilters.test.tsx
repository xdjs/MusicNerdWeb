import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import UsersSection from '../UsersSection';
import {whitelistedColumns} from '../columns';
import type {AdminUser} from '@/lib/admin/adminReadTypes';
jest.mock('@/hooks/useRefreshAdmin',()=>({useRefreshAdmin:()=>jest.fn()}));
jest.mock('../UserSearch',()=>()=>null);
const data:AdminUser[]=Array.from({length:12},(_,i)=>({id:`person-${i}`,username:`person-${i}`,email:`person-${i}@example.com`,wallet:`0x${i}`,isAdmin:i===0,isWhiteListed:i===0,isHidden:i===1,updatedAt:'2026-09-26T12:00:00Z'}));
it('has one identity search and resets selection and pagination as filters change',async()=>{
 render(<UsersSection columns={whitelistedColumns} data={data}/>);
 expect(screen.getAllByRole('searchbox')).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Next'}));
 expect(screen.getByText('Page 2 of 2')).toBeVisible();
 fireEvent.click(screen.getByRole('checkbox',{name:'Select people on this page'}));
 expect(screen.getByRole('button',{name:'Hide Selected'})).toBeEnabled();
 fireEvent.change(screen.getByRole('searchbox',{name:'Search people'}),{target:{value:'PERSON-0@example.com '}});
 await waitFor(()=>expect(screen.getByText('Page 1 of 1')).toBeVisible());
 expect(screen.queryByRole('button',{name:'Hide Selected'})).not.toBeInTheDocument();
 expect(screen.getByText('1 of 12 people')).toBeVisible();
 fireEvent.keyDown(screen.getByRole('combobox',{name:'Leaderboard visibility'}),{key:"ArrowDown"});
 fireEvent.click(screen.getByRole("option",{name:"Hidden"}));
 expect(screen.getByText('No people match these filters.')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
 expect(screen.getByText('12 of 12 people')).toBeVisible();
});

it('updates pagination through the styled rows-per-page menu',()=>{
 render(<UsersSection columns={whitelistedColumns} data={data}/>);
 expect(screen.getByText('Page 1 of 2')).toBeVisible();
 fireEvent.keyDown(screen.getByRole('combobox',{name:'Rows per page'}),{key:'ArrowDown'});
 fireEvent.click(screen.getByRole('option',{name:'20'}));
 expect(screen.getByText('Page 1 of 1')).toBeVisible();
 expect(screen.getByRole('button',{name:'Next'})).toBeDisabled();
 expect(screen.getByText('person-11')).toBeVisible();
});
