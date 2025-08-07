-- Fix Facebook platform display configuration
-- Ensure facebookID platform displays as "Facebook" like the main facebook platform

BEGIN;

-- Update facebookID platform to have complete visual configuration matching facebook platform
UPDATE urlmap 
SET card_platform_name = 'Facebook',
    site_image = (SELECT site_image FROM urlmap WHERE site_name = 'facebook' LIMIT 1),
    color_hex = (SELECT color_hex FROM urlmap WHERE site_name = 'facebook' LIMIT 1),
    platform_type_list = (SELECT platform_type_list FROM urlmap WHERE site_name = 'facebook' LIMIT 1),
    is_monetized = false
WHERE site_name = 'facebookID';

-- Ensure both Facebook platforms are properly configured as non-monetized social media
UPDATE urlmap 
SET card_platform_name = 'Facebook',
    is_monetized = false
WHERE site_name = 'facebook';

COMMIT;