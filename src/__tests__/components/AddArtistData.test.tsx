/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddArtistData from '@/app/artist/[id]/_components/AddArtistData';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';
import { LINK_NOT_SUPPORTED } from '@/lib/linkSubmissionMessages';
import { requestArtistLinkSuggestion } from '@/lib/artistLinks/requestArtistLinkSuggestion';
import { requestArtistLinkEdit } from '@/lib/artistLinks/requestArtistLinkEdit';
jest.mock('@/lib/artistLinks/requestArtistLinkEdit', () => ({ requestArtistLinkEdit: jest.fn() }));
jest.mock('@/lib/artistLinks/requestArtistLinkSuggestion', () => ({ requestArtistLinkSuggestion: jest.fn() }));

const mockTrackEvent = jest.fn();
jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: (...a: unknown[]) => mockTrackEvent(...a) }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));

const baseProps = {
  // Partial artist fixture is sufficient for exercising the trigger.
  artist: { id: 'a1', name: 'Test Artist' } as any,
  spotifyImg: '',
  availableLinks: [],
  isOpenOnLoad: false,
};

describe('AddArtistData "+" trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requestArtistLinkSuggestion as jest.Mock).mockReset();
  });

  it('does nothing while the session is still loading', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: null, status: 'loading' });
    const getByIdSpy = jest.spyOn(document, 'getElementById');

    render(<AddArtistData {...baseProps} />);
    fireEvent.click(screen.getByRole('button'));

    expect(getByIdSpy).not.toHaveBeenCalledWith('login-btn'); // no spurious login prompt
    expect(screen.queryByText(/Suggest a link/i)).not.toBeInTheDocument(); // modal not opened

    getByIdSpy.mockRestore();
  });

  it('prompts login (clicks #login-btn) and does not open the modal when logged out', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: null, status: 'unauthenticated' });
    const loginClick = jest.fn();
    const getByIdSpy = jest
      .spyOn(document, 'getElementById')
      .mockReturnValue(Object.assign(document.createElement('button'), { click: loginClick }));

    render(<AddArtistData {...baseProps} />);
    fireEvent.click(screen.getByRole('button')); // only the trigger renders while the dialog is closed

    expect(getByIdSpy).toHaveBeenCalledWith('login-btn');
    expect(loginClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Suggest a link/i)).not.toBeInTheDocument();

    getByIdSpy.mockRestore();
  });

  it('auth-gates a handed-off URL, then resumes and consumes it after login', async () => {
    const spotifyUrl = 'https://open.spotify.com/artist/2TNJWBi73MnkSRkZRPBqSW?si=test';
    let authState = { user: null, status: 'loading' } as {
      user: { id: string } | null;
      status: 'authenticated' | 'loading' | 'unauthenticated';
    };
    (useMusicNerdUser as jest.Mock).mockImplementation(() => authState);

    const loginButton = document.createElement('button');
    loginButton.id = 'login-btn';
    const loginClick = jest.fn();
    loginButton.addEventListener('click', loginClick);
    document.body.appendChild(loginButton);
    window.history.replaceState(
      {},
      '',
      `/artist/a1?view=links&addLink=${encodeURIComponent(spotifyUrl)}#social-links`,
    );

    try {
      const { rerender } = render(
        <AddArtistData {...baseProps} isOpenOnLoad prefillUrl={spotifyUrl} />,
      );

      expect(loginClick).not.toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: /Suggest a link for Test Artist/i })).not.toBeInTheDocument();

      authState = { user: null, status: 'unauthenticated' };
      rerender(<AddArtistData {...baseProps} isOpenOnLoad prefillUrl={spotifyUrl} />);

      expect(loginClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('heading', { name: /Suggest a link for Test Artist/i })).not.toBeInTheDocument();
      expect(window.location.search).toContain('addLink=');
      expect(requestArtistLinkSuggestion).not.toHaveBeenCalled();

      // The real Privy flow reloads after login. An account update on the same
      // mount is enough to verify the pending handoff resumes as well.
      authState = {
        user: { id: 'u1' },
        status: 'authenticated',
      };
      rerender(<AddArtistData {...baseProps} isOpenOnLoad prefillUrl={spotifyUrl} />);

      expect(screen.getByRole('heading', { name: /Suggest a link for Test Artist/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste a profile link/i)).toHaveValue(spotifyUrl);
      expect(requestArtistLinkSuggestion).not.toHaveBeenCalled();
      await waitFor(() => expect(window.location.search).toBe('?view=links'));
      expect(window.location.hash).toBe('#social-links');
    } finally {
      loginButton.remove();
      window.history.replaceState({}, '', '/');
    }
  });

  it('handles a new handed-off URL when client navigation reuses the component', async () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({
      user: { id: 'u1' },
      status: 'authenticated',
    });
    const firstUrl = 'https://open.spotify.com/artist/2TNJWBi73MnkSRkZRPBqSW';
    const secondUrl = 'https://www.deezer.com/artist/815939';
    window.history.replaceState(
      {},
      '',
      `/artist/a1?addLink=${encodeURIComponent(firstUrl)}`,
    );

    try {
      const { rerender } = render(
        <AddArtistData {...baseProps} isOpenOnLoad prefillUrl={firstUrl} />,
      );
      expect(screen.getByPlaceholderText(/Paste a profile link/i)).toHaveValue(firstUrl);
      await waitFor(() => expect(window.location.search).toBe(''));

      window.history.replaceState(
        {},
        '',
        `/artist/a2?addLink=${encodeURIComponent(secondUrl)}`,
      );
      rerender(
        <AddArtistData
          {...baseProps}
          artist={{ ...baseProps.artist, id: 'a2', name: 'Second Artist' }}
          isOpenOnLoad
          prefillUrl={secondUrl}
        />,
      );

      expect(screen.getByPlaceholderText(/Paste a profile link/i)).toHaveValue(secondUrl);
      await waitFor(() => expect(window.location.search).toBe(''));
    } finally {
      window.history.replaceState({}, '', '/');
    }
  });

  it('warns in dev and does not open the modal when login button is absent', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: null, status: 'unauthenticated' });
    const getByIdSpy = jest.spyOn(document, 'getElementById').mockReturnValue(null);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(<AddArtistData {...baseProps} />);
    fireEvent.click(screen.getByRole('button'));

    expect(warnSpy).toHaveBeenCalled();
    expect(screen.queryByText(/Suggest a link/i)).not.toBeInTheDocument();

    getByIdSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('reports a visitor submission that no platform regex accepts as invalid', async () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const originalFetch = global.fetch;
    // /api/platformRegexes returns nothing, so no platform matches and the client rejects the URL
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ status: 'ok', regexes: [] }) })) as unknown as typeof fetch;
    try {
      render(<AddArtistData {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add a link for Test Artist' }));
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com/nobody' } });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith('add_link_submit', { platform: null, result: 'invalid' }));
      expect(requestArtistLinkSuggestion).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('opens the submit modal when logged in', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });

    render(<AddArtistData {...baseProps} />);
    const trigger = screen.getByRole('button', { name: 'Add a link for Test Artist' });
    expect(trigger).toHaveAttribute('title', 'Add a link for Test Artist');
    fireEvent.click(trigger);

    // UGC users see "Suggest a link for {artist}" header and a Submit button
    expect(screen.getByRole('heading', { name: /Suggest a link for Test Artist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('opens with the handed-off URL prefilled, consumes addLink, and does not submit', async () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const spotifyUrl = 'https://open.spotify.com/artist/2TNJWBi73MnkSRkZRPBqSW?si=test';
    const originalReplaceState = window.history.replaceState;
    const nativeReplaceState = originalReplaceState.bind(window.history);
    nativeReplaceState(
      { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ['existing-tree'] },
      '',
      `/artist/a1?view=links&addLink=${encodeURIComponent(spotifyUrl)}#social-links`,
    );
    let nextCanonicalUrl = window.location.href;

    // Simulate Next's patched History API: supplying its internal __NA state
    // bypasses router synchronization, while a normal state value updates the
    // canonical URL and preserves Next's state on the history entry.
    const nextReplaceState = jest.fn((data: unknown, unused: string, url?: string | URL | null) => {
      if ((data as { __NA?: boolean } | null)?.__NA) {
        nativeReplaceState(data, unused, url);
        return;
      }

      if (url) nextCanonicalUrl = new URL(String(url), window.location.href).href;
      nativeReplaceState(
        {
          ...(data && typeof data === 'object' ? data : {}),
          __NA: true,
          __PRIVATE_NEXTJS_INTERNALS_TREE: ['existing-tree'],
        },
        unused,
        url,
      );
    });
    window.history.replaceState = nextReplaceState as typeof window.history.replaceState;

    try {
      render(<AddArtistData {...baseProps} isOpenOnLoad prefillUrl={spotifyUrl} />);

      expect(screen.getByRole('heading', { name: /Suggest a link for Test Artist/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste a profile link/i)).toHaveValue(spotifyUrl);
      expect(requestArtistLinkSuggestion).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(nextReplaceState).toHaveBeenCalledWith(
          null,
          '',
          '/artist/a1?view=links#social-links',
        );
      });
      expect(new URL(nextCanonicalUrl).search).toBe('?view=links');
      expect(window.location.search).toBe('?view=links');
      expect(window.location.hash).toBe('#social-links');
      expect(window.history.state).toMatchObject({
        __NA: true,
        __PRIVATE_NEXTJS_INTERNALS_TREE: ['existing-tree'],
      });
    } finally {
      window.history.replaceState = originalReplaceState;
      nativeReplaceState({}, '', '/');
    }
  });

  it('resets a consumed prefill before a later manual open', async () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const spotifyUrl = 'https://open.spotify.com/artist/2TNJWBi73MnkSRkZRPBqSW';

    render(<AddArtistData {...baseProps} isOpenOnLoad prefillUrl={spotifyUrl} />);
    expect(screen.getByPlaceholderText(/Paste a profile link/i)).toHaveValue(spotifyUrl);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Suggest a link for Test Artist/i })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText(/Paste a profile link/i)).toHaveValue('');
  });

  it('keeps submission disabled while supported-link validation is loading', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    try {
      render(<AddArtistData {...baseProps} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add a link for Test Artist' }));

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
      fireEvent.click(submitButton);
      expect(requestArtistLinkSuggestion).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('lets an unchanged server-validated prefill reach the server if regex loading fails', async () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const spotifyUrl = 'https://open.spotify.com/artist/2TNJWBi73MnkSRkZRPBqSW';
    const originalFetch = global.fetch;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    (requestArtistLinkSuggestion as jest.Mock).mockResolvedValue({ status: 'error', message: 'Server rejected link' });

    try {
      render(<AddArtistData {...baseProps} isOpenOnLoad prefillUrl={spotifyUrl} />);

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(requestArtistLinkSuggestion).toHaveBeenCalledWith(baseProps.artist.id, spotifyUrl);
      });
    } finally {
      global.fetch = originalFetch;
      errorSpy.mockRestore();
    }
  });

  it('does not trust a modified prefill when regex loading fails', async () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const spotifyUrl = 'https://open.spotify.com/artist/2TNJWBi73MnkSRkZRPBqSW';
    const originalFetch = global.fetch;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    try {
      render(<AddArtistData {...baseProps} isOpenOnLoad prefillUrl={spotifyUrl} />);

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.change(screen.getByPlaceholderText(/Paste a profile link/i), {
        target: { value: 'https://open.spotify.com/artist/differentArtist' },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(LINK_NOT_SUPPORTED)).toBeInTheDocument();
      });
      expect(requestArtistLinkSuggestion).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
      errorSpy.mockRestore();
    }
  });

  it('uses "Save Link" submit label for a claim owner using direct edit', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });

    render(<AddArtistData {...baseProps} directEdit />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('heading', { name: /Add a link for Test Artist/i })).toBeInTheDocument();
    expect(screen.getByText(/saved directly to the artist profile/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Link' })).toBeInTheDocument();
  });

  it('uses immediate-addition copy for an auto-approved contribution', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });

    render(<AddArtistData {...baseProps} autoApprove />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('heading', { name: /Add a link for Test Artist/i })).toBeInTheDocument();
    expect(screen.getByText(/added immediately and recorded as your contribution/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Link' })).toBeInTheDocument();
  });

  it('shows the friendly LINK_NOT_SUPPORTED error when a URL matches no platform', async () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const originalFetch = global.fetch;
    // /api/platformRegexes returns no regexes → validatePlatformLinkBackend will reject any URL.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', regexes: [] }),
    }) as unknown as typeof fetch;

    try {
      render(<AddArtistData {...baseProps} />);
      fireEvent.click(screen.getByRole('button')); // open the modal

      const input = screen.getByPlaceholderText(/Paste a profile link/i);
      fireEvent.change(input, { target: { value: 'https://example.com/foo' } });
      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(LINK_NOT_SUPPORTED)).toBeInTheDocument();
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('lets a Deezer-backed artist select a Spotify example and submit through the existing link action', async () => {
    const originalFetch = global.fetch;
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', regexes: [{ siteName: 'spotify', regex: '^https://open\\.spotify\\.com/artist/[A-Za-z0-9]+$' }] }),
    }) as unknown as typeof fetch;
    (requestArtistLinkSuggestion as jest.Mock).mockResolvedValue({ status: 'success', message: 'Link added', siteName: 'spotify' });
    const artist = { ...baseProps.artist, deezer: '123', spotify: null };
    try {
      render(<AddArtistData {...baseProps} artist={artist} autoApprove availableLinks={[
        { id: 'spotify', siteName: 'spotify', example: 'https://open.spotify.com/artist/ARTIST_NAME' } as any,
      ]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Add a link for Test Artist' }));
      const input = screen.getByRole('textbox', { name: 'Profile link' });
      const examples = screen.getByRole('button', { name: 'Supported links' });
      expect(examples).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(examples);
      expect(examples).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByText('open.spotify.com/artist/ARTIST_NAME')).not.toBeInTheDocument();
      expect(screen.getByText(/Spotify links end with an artist ID/)).toBeVisible();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(input).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'open.spotify.com/artist/ARTIST_ID' }));
      expect(examples).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveValue('open.spotify.com/artist/ARTIST_ID');
      expect(input).toHaveFocus();
      const url = 'https://open.spotify.com/artist/2TNJWBi73MnkSRkZRPBqSW';
      fireEvent.change(input, { target: { value: url } });
      const submit = screen.getByRole('button', { name: 'Add Link' });
      await waitFor(() => expect(submit).toBeEnabled());
      fireEvent.click(submit);
      await waitFor(() => expect(requestArtistLinkSuggestion).toHaveBeenCalledWith(artist.id, url));
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('loads platform patterns and checks a profile page on MusicNerdAPI without credentials', async () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    const originalFetch = global.fetch;
    const url = 'https://soundcloud.com/nobody-here';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok', regexes: [{ siteName: 'soundcloud', regex: '^https://soundcloud\\.com/.+$' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok', valid: false, reason: 'Profile not found' }) }) as unknown as typeof fetch;
    try {
      render(<AddArtistData {...baseProps} />);
      expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/platformRegexes', { credentials: 'omit' });
      fireEvent.click(screen.getByRole('button', { name: 'Add a link for Test Artist' }));
      fireEvent.change(screen.getByRole('textbox'), { target: { value: url } });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await waitFor(() => expect(screen.getByText(LINK_NOT_SUPPORTED)).toBeInTheDocument());
      expect(fetch).toHaveBeenLastCalledWith('https://api-preview.test/api/validateLink', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), credentials: 'omit',
      });
      expect(requestArtistLinkSuggestion).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('shows the "Supported links" trigger inside the modal', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });

    render(<AddArtistData {...baseProps} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button', { name: 'Supported links' })).toBeInTheDocument();
  });

});

describe('isLinkTarget', () => {
  // The pure rule lives in src/lib/isLinkTarget (own test file); this covers the picker
  // that applies it. The old example-text match (any 0x address) also hid In Process,
  // whose example is https://www.inprocess.world/0x1f8d…, so no artist could pick it.

  it('lists the In Process example and hides wallet and ENS rows in the picker', () => {
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    render(<AddArtistData {...baseProps} availableLinks={[
      { id: 'wallet', siteName: 'wallet', example: 'Example Wallet: 0x000000...' } as any,
      { id: 'ens', siteName: 'ens', example: 'ARTIST_NAME.eth' } as any,
      { id: 'inprocess', siteName: 'inprocess', example: 'https://www.inprocess.world/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91' } as any,
      { id: 'bandcamp', siteName: 'bandcamp', example: 'https://ARTIST_NAME.bandcamp.com' } as any,
    ]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a link for Test Artist' }));
    fireEvent.click(screen.getByRole('button', { name: 'Supported links' }));
    expect(screen.getByRole('button', { name: 'inprocess.world/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ARTIST_NAME.bandcamp.com' })).toBeInTheDocument();
    expect(screen.queryByText(/Example Wallet/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ARTIST_NAME\.eth/)).not.toBeInTheDocument();
  });
});


describe('AddArtistData authenticated API editing', () => {
  const url = 'https://open.spotify.com/artist/0y9DJxRh3j84i13hctQcFx';
  const request = requestArtistLinkEdit as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    (useMusicNerdUser as jest.Mock).mockReturnValue({ user: { id: 'u1' }, status: 'authenticated' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', regexes: [{ siteName: 'spotify', regex: '^https://open\\.spotify\\.com/artist/[a-zA-Z0-9]{22}$' }] }) });
  });
  async function submit() {
    render(<AddArtistData {...baseProps} directEdit isOpenOnLoad prefillUrl={url} />);
    const save = screen.getByRole('button', { name: 'Save Link' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(request).toHaveBeenCalledWith('directEditLink', { artistId: 'a1', action: 'set', url }));
  }
  it.each([true, false, undefined])('preserves changed-save analytics for changed=%s without server analytics', async changed => {
    request.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', success: true, siteName: 'spotify', changed }) });
    await submit();
    await waitFor(() => expect(screen.getByText('Link saved successfully.')).toBeInTheDocument());
    expect(requestArtistLinkSuggestion).not.toHaveBeenCalled();
    if (changed) expect(mockTrackEvent).toHaveBeenCalledWith('profile_edit', { action: 'link_add', target: 'spotify' });
    else expect(mockTrackEvent).not.toHaveBeenCalledWith('profile_edit', expect.anything());
  });
  it('keeps a server collision visible and does not report a successful profile edit', async () => {
    request.mockResolvedValue({ ok: false, json: async () => ({ status: 'error', error: 'That account belongs to another artist.' }) });
    await submit();
    await waitFor(() => expect(screen.getByText('That account belongs to another artist.')).toBeInTheDocument());
    expect(mockTrackEvent).not.toHaveBeenCalledWith('profile_edit', expect.anything());
  });
});
