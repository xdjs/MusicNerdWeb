-- Fix Facebook platform display configuration
-- Ensure facebookID platform displays as "Facebook" like the main facebook platform

BEGIN;

-- Update facebookID platform to have correct cardPlatformName for UI display
UPDATE urlmap 
SET card_platform_name = 'Facebook'
WHERE site_name = 'facebookID';

-- Verify both Facebook platforms have consistent configuration for UI display
UPDATE urlmap 
SET card_platform_name = 'Facebook'
WHERE site_name = 'facebook' AND (card_platform_name IS NULL OR card_platform_name != 'Facebook');

COMMIT;