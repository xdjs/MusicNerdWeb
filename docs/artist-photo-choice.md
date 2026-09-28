# Artist photo choices

Tracks #1378. Deezer is the automatic portrait/thumbnail default, falling back to
Spotify when unavailable. `artists.custom_image` is an explicit saved photo
(uploaded or selected from a provider) and always wins, irrespective of claim state.
No page read writes an image. Existing selections and crop coordinates are preserved.

In edit mode, Change photo opens a dialog with the current photo, previews for linked
Deezer/Spotify profiles, and Upload photo. Opening, previewing and cancelling never
save. Save photo resolves the chosen provider on the server; arbitrary client URLs
are not accepted. Missing/changed provider imagery leaves the current photo intact.
Selections save that specific provider URL; they do not follow future provider changes.
The provider still hosts the image; a removed remote image may require reselection.

GET/PATCH `/api/artist/photo-choice` require an approved claimant or live admin.
PATCH rechecks ownership under the existing artist write lock and compares the saved
photo and linked provider identity with the dialog's baseline. A stale dialog cannot
overwrite a newer upload/selection. Changing photos clears the old crop; selecting the
same current photo preserves it. Upload retains the existing storage flow.

## Preservation and release

Apply `scripts/release/preserve-bike-lane-portrait.sql` before the default changes. It saves Bike
Lane's September 28 production Spotify portrait only when her stable Spotify ID and
name match and no custom photo exists. Existing custom photos, including Pete Rango's,
are never updated. Matching uses the provider identity because staging and production
artist UUIDs differ. The data update is idempotent and does not change schema or grants.
It is a data-only release step, outside the schema migration sequence.

Before release, compare Bike Lane and Pete Rango's portrait URLs and crop positions
against the live baseline; confirm the pin on each target database through `mnweb`.
Verify picker save/reload/cancel/failure, unauthorized requests and both mobile/desktop
themes. Executing the preservation SQL, merging and production promotion are separate release steps.

## Save and refresh regression

Photo and crop saves can replace the keyed hero during a profile refresh. The section
navigation and Ask sheet must have distinct sibling keys; sharing the artist ID
caused React to duplicate the navigation above the hero. Regression coverage refreshes
the image and crop repeatedly and checks one navigation immediately below one hero.
