import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Leaderboard from '../Leaderboard';

const entry = (userId: string, isHidden = false) => ({userId, wallet: '', username: userId, email: null, ugcCount: 2, artistsCount: 1, isHidden});
const reply = (data: unknown) => ({ok: true, json: async () => data}) as Response;
beforeEach(() => { jest.mocked(fetch).mockReset(); });

it('keeps hidden contributors unranked and highlights only the matching account', async () => {
  jest.mocked(fetch).mockResolvedValue(reply([entry('pete'), entry('pete2'), entry('hidden', true)]));
  const {container} = render(<Leaderboard currentUserId="pete" />);
  await screen.findByRole('button', {name: /Recent artists for pete2/});
  expect(container.querySelectorAll('#leaderboard-current-user')).toHaveLength(1);
  expect(container.querySelectorAll('[data-podium="true"]')).toHaveLength(2);
  expect(screen.getByText('Unranked')).toBeInTheDocument();
});

it('opens recent edits deliberately and lets a failed request retry', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply([entry('pete')])).mockResolvedValueOnce({ok: false} as Response).mockResolvedValueOnce(reply([{ugcId:'edit',artistId:'artist-1',artistName:'Bio Ritmo',imageUrl:null}]));
  render(<Leaderboard />);
  const row = await screen.findByRole('button', {name: /Recent artists for pete/});
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(row);
  fireEvent.click(await screen.findByRole('button', {name:'Retry recent artists'}));
  expect(await screen.findByRole('link', {name:'Bio Ritmo'})).toHaveAttribute('href','/artist/artist-1');
  expect(row).toHaveAttribute('aria-expanded','true');
});

it('resets pagination with a new period, retains an empty state, and retries a failed list', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(Array.from({length:12},(_,i)=>entry(`nerd-${i}`)))).mockResolvedValueOnce({ok:false} as Response).mockResolvedValueOnce(reply([]));
  render(<Leaderboard />);
  fireEvent.click(await screen.findByRole('button', {name:'Next'}));
  expect(await screen.findByRole('button', {name:/Recent artists for nerd-10/})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:'All time'}));
  fireEvent.click(await screen.findByRole('button', {name:'Try again'}));
  expect(await screen.findByText('No contributions in this period yet.')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name:'Next'})).not.toBeInTheDocument();
  await waitFor(()=>expect(fetch).toHaveBeenLastCalledWith('/api/leaderboard', expect.anything()));
});

it('ignores a superseded period response', async () => {
  let finish!: (value: Response) => void;
  jest.mocked(fetch).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce(reply([entry('current-period')]));
  render(<Leaderboard />);
  fireEvent.click(screen.getByRole('button', {name:'All time'}));
  await screen.findByRole('button', {name:/Recent artists for current-period/});
  finish(reply([entry('old-period')]));
  await waitFor(()=>expect(screen.queryByRole('button', {name:/Recent artists for old-period/})).not.toBeInTheDocument());
});

it('finds the signed-in contributor on another page and focuses their row', async () => {
  const scroll = jest.fn();
  Element.prototype.scrollIntoView = scroll;
  jest.mocked(fetch).mockResolvedValue(reply(Array.from({length:12},(_,i)=>entry(`nerd-${i}`))));
  render(<Leaderboard currentUserId="nerd-11"/>);
  fireEvent.click(await screen.findByRole('button',{name:'Show my position'}));
  const row = await screen.findByRole('button',{name:'Recent artists for nerd-11'});
  await waitFor(()=>expect(row).toHaveFocus());
  expect(scroll).toHaveBeenCalled();
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
});
