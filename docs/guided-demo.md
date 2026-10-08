# Interactive rehearsal

Static-only isolated demo mirroring current ArtistProfileContent, HeroSection,
ArtistAskSheet, Lore tabs, and InterviewResponseCard structure. Vanilla DOM adaptation,
not direct React imports: the live components couple authentication/server actions.
Every handler mutates one in-memory demo model. No network research or production writes.

Research fills the profile; Ask renders cited answers; outside-Lore progress creates a
review card; approvals update local Lore; interview edits update response and history.
Refresh and Restart reset all state. Interview/discovery fixtures are synthetic and labeled.
New interviewer remains off. Profile setup identifies Sweetman's work as context, not Pete's.
Deploy only a separate static preview. No main merge or production promotion.

October 8 autoplay revision: landing on the demo starts an eight-second staged build.
About appears first, then clickable official-site links, two explicitly labeled sample
social-post cards, and Lore. The viewport follows each populated section. Every step
starts when selected, including Back and numbered navigation. Replay this step reruns
it; replaying the build clears its sections before rebuilding. Pending timers are
cancelled on navigation. Refresh starts a fresh run. No real scraping is introduced.
