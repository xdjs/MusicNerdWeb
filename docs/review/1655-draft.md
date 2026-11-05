# Draft Web PR — local, not published

Title: Preserve contributed Lore and About through setup and public reads

Keep existing artist edits, pins and eligible trusted Lore while profile setup fills missing material. Public biography, history and Lore readers honor the source-publication policy and private evidence. The agreed legacy exception covers only the exact 16 approved claimed-bio snapshots, without inventing provenance or granting future blanket trust.

Requires the paired API receipt-aware writers and reconciled migrations 0060–0063. The candidate also contains trusted uploads and revocation-retention dependencies, which must be reviewed explicitly or extracted and retested. The guarded raw-reader projection remains a prototype; its client/grant cutover is not implemented by these migrations.

Validation: 246 earlier Web tests, types and offline build; paired API now passes all 30 native PostgreSQL tests with focused About and actual Next profile/setup browser suites. Actual manual save, pin/reload and repeated setup preserve stored biography, history, Lore and trusted/pending sources. External auth/models/discovery and hosted workflow boundaries are deterministic local adapters. Real hosted authentication was checked separately; hosted durable permissions and provider quality remain unproven.

Refs #1655. Prepare as a linked draft, not an automatic closing or release PR. Main was rechecked read-only on 2026-11-05 and remains 03b2d9a556644d4ec7121fca398977057ad8c90f. Tested candidate: f58408fae9703f54d7522423f904965b473afe41. See the paired API final compatibility review and full Next acceptance record. Do not direct traffic to new readers before private structures and exact legacy allowances exist; do not roll back to unguarded old readers.
