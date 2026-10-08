# Jordan build walkthrough — 2026-10-08

Preview-only preparation for Pete's request to watch the actual onboarding build.
The `buildPreview=1` query holds the existing onboarding component unmounted until
Start profile build is clicked, without adding the separate nine-step demo overlay.
Production ignores this query. After clicking, existing Web/API research, rendering,
and completion tour run normally. There are no supplied answers or timed mock data.

The staging fixture starts with Jordan Rein's public name and Spotify identity only.
Its approved claim is test setup, not an actual artist identity verification. No
production claim or profile is changed. Sources, links, and biography are not copied
from production. Reloading does not undo work or rerun completed onboarding.

Review boundary: the fresh fixture must remain unstarted for Pete. Verify the start
screen and empty stored research state; do not claim the build succeeded before it runs.
