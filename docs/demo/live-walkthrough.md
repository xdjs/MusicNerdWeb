# Live preview walkthrough

Append `?guidedDemo=1` to an artist URL on a Web preview deployment. The flag is
ignored in production. The overlay imports no demo fixtures and intercepts no requests.
The normal profile, auth, API, research, source reviews and response saves run unchanged.

Next, Back, numbered steps and Locate scroll to/highlight existing controls. They never
submit a question, edit a profile, approve a source, or restart onboarding. Missing editor
controls are reported rather than bypassed. Close and Minimize leave the app usable.

Refresh or Restart resets only guide navigation. Real saved artist data persists. A fresh
onboarding run requires actual authorized onboarding state; a completed profile does not
pretend to rebuild. The separate existing `tourPreview=1` option can demonstrate the actual
post-build profile tour using saved data.

Before a live demonstration, verify the preview's database/API targets and signed-in artist
access. The overlay itself does not prove isolation. Use the same matching private research
key as the preview API if outside-Lore questions are enabled. Never copy production secrets
into public files, and never use a hostname alone as proof of environment.

For incomplete guided-preview onboarding, Start profile build mounts the real onboarding tree only after the user clicks. The guide yields while the native post-build tour is visible.
