import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePhoto from '../ProfilePhoto';
afterEach(() => jest.restoreAllMocks());
it('uploads a selected photo and loads account storage again, including a fresh mount', async () => {
  let stored = false;
  jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
    if (options?.method === 'POST') { stored = true; return { ok: true, json: async () => ({ success: true }) } as Response; }
    return { ok: true, json: async () => ({ url: stored ? 'https://images.test/account.webp' : null }) } as Response;
  });
  const first = render(<ProfilePhoto userId="account" />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('Upload profile photo'), { target: { files: [new File(['image'], 'avatar.png', { type: 'image/png' })] } });
  await waitFor(() => expect(screen.getByAltText('Your profile photo')).toHaveAttribute('src', 'https://images.test/account.webp'));
  expect(global.fetch).toHaveBeenCalledWith('/api/user/profile-image', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }));
  first.unmount();
  render(<ProfilePhoto userId="account" />);
  await waitFor(() => expect(screen.getByAltText('Your profile photo')).toHaveAttribute('src', 'https://images.test/account.webp'));
});
