-- Update TikTok regex pattern to support URLs without www subdomain
-- This makes it consistent with other platforms that support both www and non-www URLs

BEGIN;

UPDATE urlmap 
SET regex = '^https://(?:www\.)?tiktok\.com/@([^/]+)$',
    example = 'https://tiktok.com/@username OR https://www.tiktok.com/@username'
WHERE site_name = 'tiktok';

COMMIT;
