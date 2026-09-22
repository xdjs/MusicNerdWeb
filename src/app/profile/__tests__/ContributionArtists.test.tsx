import { render, screen, fireEvent } from '@testing-library/react';
import ProfileConcept from '../ProfileConcept';
import type { LiveProfileModel } from '@/lib/profile/types';
jest.mock('../CollectionArtistImage',()=>({__esModule:true,default:()=>null}));
jest.mock('../UserEntriesTable',()=>({__esModule:true,default:()=>null}));
jest.mock('../SelfEditHistory',()=>({__esModule:true,default:()=>null}));
jest.mock('../ShareLinkDialog',()=>({__esModule:true,default:()=>null}));
jest.mock('@/app/artist/[id]/_components/LatestCards',()=>({__esModule:true,default:()=> <div>Live update cards</div>}));
const user={id:'u',email:null,wallet:null,isAdmin:false,isWhiteListed:false,isHidden:false};
const artist={artistId:'a',artistName:'Contributed Artist',imageUrl:null};
const model=()=>({name:'User',photo:null,entries:[],totalContributions:1,approved:1,pending:0,selfEdits:0,artistsAdded:0,artists:[artist],artistTotal:1,artistMatches:[artist],matchesTotal:1,artistsLoading:false,artistsError:null,matchesLoading:false,matchesError:null,hasMoreArtists:false,hasMoreMatches:false,loadMoreArtists:jest.fn(),loadMoreMatches:jest.fn(),setArtistSearch:jest.fn(),updates:[],updatesLoading:false,updatesError:null,updatesUnavailable:false,checkedArtists:1,hasMoreUpdates:false,loadMoreUpdates:jest.fn(),setUpdateFilter:jest.fn(),saveProfile:jest.fn()} satisfies LiveProfileModel);
it('shows contribution-derived artists and latest without bookmark controls',()=>{
 render(<ProfileConcept user={user} live={model()}/>);
 expect(screen.getByRole('link',{name:'Contributed Artist'})).toHaveAttribute('href','/artist/a');
 expect(screen.getByRole('heading',{name:'Your artists lately'})).toBeVisible();
 expect(screen.queryByText(/bookmark/i)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'View all 1 artists'}));
 expect(screen.queryByRole('button',{name:/remove bookmark/i})).not.toBeInTheDocument();
 expect(screen.getByLabelText('Search your artists')).toBeVisible();
});
it('offers contribution actions for an empty account without inventing a saved collection',()=>{
 const live={...model(),artists:[],artistMatches:[],artistTotal:0,matchesTotal:0,approved:0,totalContributions:0};
 render(<ProfileConcept user={user} live={live}/>);
 expect(screen.getByText(/Artists you add or contribute to will appear here/)).toBeVisible();
 expect(screen.queryByRole('heading',{name:'Your artists lately'})).not.toBeInTheDocument();
 expect(screen.queryByText(/bookmark/i)).not.toBeInTheDocument();
});
it('searches the entire server collection and offers additional result pages',()=>{
 const live={...model(),artistTotal:80,matchesTotal:40,hasMoreMatches:true};
 render(<ProfileConcept user={user} live={live}/>);
 fireEvent.click(screen.getByRole('button',{name:'Search collection'}));
 fireEvent.change(screen.getByLabelText('Search your artists'),{target:{value:'Music'}});
 expect(live.setArtistSearch).toHaveBeenCalledWith('Music');
 fireEvent.click(screen.getByRole('button',{name:'Load more results'}));expect(live.loadMoreMatches).toHaveBeenCalled();
});
