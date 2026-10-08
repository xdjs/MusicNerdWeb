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
