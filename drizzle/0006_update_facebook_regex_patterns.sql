-- Update Facebook regex patterns to handle all three URL formats:
-- 1. Username format: https://www.facebook.com/username
-- 2. People format: https://www.facebook.com/people/Name/ID/
-- 3. Profile ID format: https://www.facebook.com/profile.php?id=ID

BEGIN;

-- Update the main facebook platform regex to handle all three formats
UPDATE urlmap 
SET regex = '^https://(?:[^/]*\.)?facebook\.com/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)(?:&[^#]*)?|([^/\?#]+))(?:[\?#].*)?$',
    example = 'https://www.facebook.com/username OR https://www.facebook.com/people/name/ID OR https://www.facebook.com/profile.php?id=ID'
WHERE site_name = 'facebook';

-- Update the facebookID platform regex to specifically handle ID formats
UPDATE urlmap 
SET regex = '^https://(?:[^/]*\.)?facebook\.com/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)(?:&[^#]*)?)$',
    example = 'https://www.facebook.com/people/name/ID OR https://www.facebook.com/profile.php?id=ID'
WHERE site_name = 'facebookID';

COMMIT;