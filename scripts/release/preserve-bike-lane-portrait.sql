-- #1378: preserve the exact Bike Lane portrait observed on production 2026-09-28.
-- Stable provider identity works across environments; never replace an existing choice.
UPDATE public.artists
SET custom_image = 'https://i.scdn.co/image/ab6761610000e5eb082c9de8bc6a6e4fbc5c808b'
WHERE spotify = '4hmP7SKOIhC8e1PZo8UG7f'
  AND lower(btrim(name)) = 'bike lane'
  AND nullif(btrim(custom_image), '') IS NULL;
