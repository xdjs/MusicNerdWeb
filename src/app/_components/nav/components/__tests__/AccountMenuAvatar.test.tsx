import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountMenuAvatar from '../AccountMenuAvatar';
import { readProfileJson } from '@/lib/profile/readProfileJson';
jest.mock('@/lib/profile/readProfileJson', () => ({readProfileJson: jest.fn()}));
const read = jest.mocked(readProfileJson);
beforeEach(()=>jest.clearAllMocks());
function setup(userId = 'user-a') {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  const view = (id: string) => <QueryClientProvider client={client}><AccountMenuAvatar key={id} userId={id}/></QueryClientProvider>;
  return {client, view, ...render(view(userId))};
}
it('shows the saved user photo and follows the profile editor cache update', async () => {
  read.mockResolvedValue({url:'/user-photo.png'});
  const {client} = setup();
  await waitFor(()=>expect(screen.getByRole('img', {name:'Your profile'})).toHaveAttribute('src','/user-photo.png'));
  expect(read).toHaveBeenCalledWith('/api/user/profile-image','user-a',expect.any(AbortSignal));
  act(()=>client.setQueryData(['profile-photo','user-a'],{url:'/new-photo.png'}));
  await waitFor(()=>expect(screen.getByRole('img',{name:'Your profile'})).toHaveAttribute('src','/new-photo.png'));
});
it('falls back for a broken image and recovers after a new upload', async () => {
  read.mockResolvedValue({url:'/broken.png'});
  const {client}=setup();
  await waitFor(()=>expect(screen.getByRole('img')).toHaveAttribute('src','/broken.png'));
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('img')).toHaveAttribute('src','/default_pfp_pink.png');
  act(()=>client.setQueryData(['profile-photo','user-a'],{url:'/new.png'}));
  await waitFor(()=>expect(screen.getByRole('img')).toHaveAttribute('src','/new.png'));
});
it.each([null,'error'])('uses the default avatar when photo is %s', async (state)=>{
  if(state === 'error') read.mockRejectedValue(new Error('Unavailable')); else read.mockResolvedValue({url:null});
  const {client}=setup();
  await waitFor(()=>expect(client.isFetching()).toBe(0));
  expect(screen.getByRole('img')).toHaveAttribute('src','/default_pfp_pink.png');
});
it('does not retain the previous account photo when accounts change', async ()=>{
  read.mockResolvedValueOnce({url:'/first.png'}).mockImplementationOnce(()=>new Promise(()=>{}));
  const {view,rerender}=setup();
  await waitFor(()=>expect(screen.getByRole('img')).toHaveAttribute('src','/first.png'));
  rerender(view('user-b'));
  expect(screen.getByRole('img')).toHaveAttribute('src','/default_pfp_pink.png');
});
