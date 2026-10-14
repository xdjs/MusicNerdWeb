## Combined #1515 / #1371 verification

Web `064ee4161d9fd8eaa76d10b1dd5ee17f6ba3a263`, API `eb5dcc60b076ae1f26e143e42d8d95821ba067fe` at [exact Web preview](https://app-lytzshis7-musicnerd.vercel.app). Same isolated staging fixture and notification-disabled session-pool settings.

Fresh authenticated entry reached the saved 14-source review without an error. No new discovery or source approval was performed.

**Observed regression in the newly merged #1515 behavior:** selecting **Skip for now** closes onboarding and shows “Finish setting up your profile / Next up: pick your best sources,” but both **Edit profile** and **Add to Lore** remain absent. All fixture research jobs were already done; only the artist's review is unfinished. Continue is available. Thus `researching = onboardingState.complete === false` hides editing for incomplete review, not only running research. This is separate from the passing discovery-reuse/card verification above and remains a release decision.

![Combined build after Skip for now](https://raw.githubusercontent.com/xdjs/MusicNerdWeb/sweetmantech/pr-screenshots/onboarding-1371-reuse-oct14/integrated-skip-edit.jpg)
