# Guided demo rehearsal

The `public/guided-demo/` static walkthrough is a separate preview deliverable for Pete's demo.
It uses actual production and preview verification screenshots, each labeled by environment,
with presenter notes, focus markers, enlargement, and explicitly simulated interactions.

No request is sent to Music Nerd APIs. It requires no sign-in. State exists only in JavaScript
memory, so refreshing starts at step 1 and removes demo edits. Restart does the same. Leaving a
step clears its local demonstration text. The newer interviewer is explicitly labeled off.

Deploy only this directory through a Vercel Build Output API static preview. Do not merge or
promote the walkthrough to the production app. Screenshots are public UI/fixture captures and
contain no credentials or private interview responses. Captures are frozen rehearsal evidence;
they are not an interactive live production profile.
