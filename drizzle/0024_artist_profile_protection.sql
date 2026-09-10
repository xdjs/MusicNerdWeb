-- Preserve legacy link data; only retire these platforms from supported choices.
ALTER TABLE artists ADD COLUMN IF NOT EXISTS inprocess text;
--> statement-breakpoint
-- site_name is not unique in the live schema. Serialize configuration writes
-- and update/insert explicitly rather than assuming an ON CONFLICT index.
LOCK TABLE urlmap IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
UPDATE urlmap SET
    regex = '^https?://(?:www[.])?inprocess[.]world/(0x[a-fA-F0-9]{40})/?(?:[?#].*)?$',
    app_string_format = 'https://www.inprocess.world/%@',
    card_platform_name = 'In Process'
WHERE site_name = 'inprocess';
--> statement-breakpoint
INSERT INTO urlmap (site_name, site_url, example, app_string_format, regex,
    card_platform_name, card_description, site_image, is_web3_site, is_monetized,
    platform_type_list, "order", color_hex)
SELECT 'inprocess', 'inprocess.world',
    'https://www.inprocess.world/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91',
    'https://www.inprocess.world/%@',
    '^https?://(?:www[.])?inprocess[.]world/(0x[a-fA-F0-9]{40})/?(?:[?#].*)?$',
    'In Process', 'Support their work on %@', '/siteIcons/inprocess_icon.svg', true, true,
    ARRAY['listen', 'web3']::platform_type[], 21, '#000000'
WHERE NOT EXISTS (SELECT 1 FROM urlmap WHERE site_name = 'inprocess');
--> statement-breakpoint
DELETE FROM urlmap WHERE site_name IN ('catalog', 'foundation', 'soundxyz');
--> statement-breakpoint
ALTER TABLE artist_research_jobs DROP CONSTRAINT IF EXISTS artist_research_jobs_kind_check;
--> statement-breakpoint
ALTER TABLE artist_research_jobs ADD CONSTRAINT artist_research_jobs_kind_check
    CHECK (kind IN ('social_ingest', 'caption_extract', 'lore_refresh'));
