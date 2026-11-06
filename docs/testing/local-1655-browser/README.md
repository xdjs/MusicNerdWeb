# Local browser acceptance for #1655

This is a separate synthetic build entrypoint. Production routing, authentication, environment configuration and app code are unchanged. It is not a production login bypass and is not imported by any production entrypoint.

From this Web checkout, using existing dependencies and an installed Playwright Chromium:

```sh
node docs/testing/local-1655-browser/run.mjs success 'Synthetic About' 'Original'
node docs/testing/local-1655-browser/run.mjs success 'Synthetic About' 'Synthetic About'
node docs/testing/local-1655-browser/run.mjs failure 'expected API error substring' 'Synthetic About'
```

The parent native API test owns database seeding, durable PostgreSQL lifecycle, provider outcome and the HTTP server on127.0.0.1:43165. This runner owns only its temporary Web bundle/server on127.0.0.1:43166 and fresh browser context. It does not reset or mutate database fixtures and has no remote scenario controls.

## Real code exercised

- BlurbSection, including regenerate button, busy state, response/error handling and editor state.
- requestArtistBioUpdate, including actual PUT, bearer header, request body, no-store and omitted credentials.
- useArtistBio, including real public GET, localStorage invalidation and read after a hard navigation.
- Button, markdown sanitization/rendering, and EditModeContext declaration.
- Actual browser fetch/CORS between the two loopback origins; the API is not mocked by Playwright.

## Explicit synthetic adapters

- Privy `getAccessToken` returns the fixed test token `local-synthetic`. The API fixture must authenticate that token through its separate test-only boundary. This does not test real Privy sign-in or signature verification.
- EditModeContext provider is set to an authorized edit session. Its refresh callback records a marker; it does not execute a Next page refresh.
- Next navigation is inert, since this bundle is not the full Next application.
- Toast output goes to a visible status element for assertions.
- BioVersionHistory reports an unpinned fixture and is otherwise inert; server actions/history pinning are not exercised here.
- BioCorrectionDialog is inert; correction flow is outside this scenario.
- Initial editor text is an explicit synthetic fixture prop, because legacy owner-visible text may be hidden from the public API. Reload deliberately omits this prop and uses the real public GET hook.

The runner clicks the actual Regenerate button and requires exactly one PUT with the expected bearer/body. Success must replace the editor and trigger the refresh marker. Failure must preserve the prior text, display the API error and avoid refresh. Both then clear localStorage and navigate afresh, asserting the real public API and rendered editor retain the expected persisted biography.

Only the two fixed loopback origins and exact required paths are allowed by browser request routing. External requests are aborted and fail the run. A fresh Chromium context blocks service workers; no existing user profile is opened. The temporary bundle, server and browser are cleaned up in finally. Native PostgreSQL and API cleanup remain the parent's responsibility.

Limits: this is a real component/request/browser/API/database path with test-only auth/model fixtures, not the entire ArtistPage, production authentication, pin-history UI, live research quality, hosted deployment or browser/network infrastructure parity.

## Verified local results and interruption cleanup

Four integrated browser scenarios passed against the parent's actual local API/native PostgreSQL fixture: missing document, current document, About failure and Lore failure. The parent suite reported29 passing native tests plus persisted-state equality after immediate PostgreSQL restart. Failure scenarios preserved the rendered biography and the public GET result after hard navigation.

`node docs/testing/local-1655-browser/cleanup-self-test.mjs` separately opens only this harness's fresh Chromium and loopback listener, sends SIGTERM and SIGINT in serial runs, and verifies nonzero signal exit143/130, owned browser PID termination, closed port43166, and removed temporary bundle. Both passed. The runner's cleanup is bounded/idempotent; startup is tracked, close failure attempts only the owned BrowserServer kill, and cleanup errors remain visible. This test needs permission to bind loopback and launch Chromium. Do not run it concurrently with integrated scenarios on the same port.

The cleanup self-test never calls the API. It is a CLI-only mode, not a browser-accessible control endpoint or production feature. This cleanup validation does not establish server-side cancellation when a browser disconnects.

Signal-test scope: both signal regressions interrupt after browser/server startup. They do not inject signals during startup or prove cleanup after SIGKILL, which cannot be handled. The final integrated rerun passed29/29 native tests plus restart equality after the cleanup change.
