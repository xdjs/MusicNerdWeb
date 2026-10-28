# Dialog contrast audit — #1632

Local component captures use the actual app components/global styles with fixture props and a fixture NextAuth session at 390x844. Auth hooks for correction/interview/legacy account and bulk-review/key-display service responses are isolated local adapters; no real key or approval was created. Photo errors intentionally expose the unauthenticated fixture state. These are visual checks, not auth or integration tests. No harness is shipped.

Captures prefixed `preview-a1bf5ab8` are the signed-in immutable staging preview of the first commit. Its DOM reported 832x900, but the browser capture was scaled/clipped by the viewport backend. Add Link text and expanded examples were readable in both themes and had no horizontal overflow. Do not use those images to claim comprehensive desktop layout verification.

Final local error-token captures end in `fixed`; they use d33e108d styles. Other components are unchanged since a1bf5ab8. Files initially labeled 832 from the local sweep were excluded: that tab remained at 390px. Raw DevTools viewport access was declined; no workaround was attempted. Native iOS keyboard/WebKit and complete desktop coverage remain unverified.
