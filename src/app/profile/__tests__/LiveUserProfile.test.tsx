import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { LiveProfileModel } from '@/lib/profile/types';
import LiveUserProfile from '../LiveUserProfile';

const mockUpdate = jest.fn().mockResolvedValue(null);
let mockModel: LiveProfileModel;
jest.mock('next-auth/react', () => ({ useSession: () => ({ update: mockUpdate, status: 'authenticated', data: {user: {id: 'account'}} }) }));
jest.mock('@/hooks/useBookmarks', () => ({ useBookmarks: () => ({ bookmarks: [], canMutate: true, isLoading: false }) }));
jest.mock('../ProfileConcept', () => ({ __esModule: true, default: ({live}: {live: LiveProfileModel}) => { mockModel = live; return null; } }));
jest.mock('../ProfileLoading', () => ({ __esModule: true, default: () => null }));

let client: QueryClient;
let calls: string[];
let uploadFailure: 'http' | 'network' | null;
let nameFailure: boolean;
let photoReadFailure: boolean;
const file = new File(['photo'], 'photo.png', {type: 'image/png'});

beforeEach(() => {
  jest.clearAllMocks();
  calls = []; uploadFailure = null; nameFailure = false; photoReadFailure = false;
  client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  client.setQueryData(['profile-summary','account'], {totalContributions: 0, approved: 0, pending: 0, entries: [], suggestions: []});
  client.setQueryData(['profile-photo','account'], {url: '/old.png'});
  jest.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
    if (!options?.method) return {ok: !photoReadFailure, json: async () => ({userId: 'account', url: '/new.png'})} as Response;
    calls.push(options.method);
    if (options.method === 'POST' && uploadFailure === 'network') throw new TypeError('Failed to fetch');
    return {ok: options.method === 'POST' ? !uploadFailure : !nameFailure, json: async () => ({message: 'Name rejected'})} as Response;
  });
});
afterEach(() => {client.clear(); jest.restoreAllMocks();});

async function mount() {
  render(<QueryClientProvider client={client}><LiveUserProfile user={{id:'account', username:'Original', email:null, wallet:null, isAdmin:false, isWhiteListed:false, isHidden:false}} /></QueryClientProvider>);
  await waitFor(() => expect(mockModel).toBeDefined());
}

it.each(['http','network'] as const)('does not commit a name when the photo upload fails (%s), and allows retry', async failure => {
  await mount(); uploadFailure = failure;
  await act(async () => { await expect(mockModel.saveProfile('Changed', file)).rejects.toThrow(); });
  expect(calls).toEqual(['POST']);
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(client.getQueryData(['profile-photo','account'])).toEqual({url:'/old.png'});
  uploadFailure = null;
  await act(async () => { await expect(mockModel.saveProfile('Changed', file)).resolves.toEqual({name:'Changed',photo:'/new.png'}); });
  expect(calls).toEqual(['POST','POST','PATCH']);
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});

it('retains the saved photo if the name PATCH is rejected', async () => {
  await mount(); nameFailure = true;
  await act(async () => { await expect(mockModel.saveProfile('Changed',file)).rejects.toThrow('Name rejected'); });
  expect(calls).toEqual(['POST','PATCH']);
  expect(client.getQueryData(['profile-photo','account'])).toMatchObject({url:'/new.png'});
  expect(mockUpdate).not.toHaveBeenCalled();
});

it('saves a name without uploading an unchanged photo and refreshes the session', async () => {
  await mount();
  await act(async () => { await expect(mockModel.saveProfile('Changed',null)).resolves.toEqual({name:'Changed',photo:'/old.png'}); });
  expect(calls).toEqual(['PATCH']);
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});

 it('reports a committed upload when its refresh fails and retries the read without uploading again', async () => {
  await mount(); photoReadFailure = true;
  await act(async () => { await expect(mockModel.saveProfile('Changed',file)).rejects.toThrow('Your photo was saved'); });
  expect(calls).toEqual(['POST']);
  expect(client.getQueryData(['profile-photo','account'])).toMatchObject({url:null});
  expect(mockUpdate).not.toHaveBeenCalled();
  photoReadFailure = false;
  await act(async () => { await expect(mockModel.saveProfile('Changed',file)).resolves.toEqual({name:'Changed',photo:'/new.png'}); });
  expect(calls).toEqual(['POST','PATCH']);
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});
