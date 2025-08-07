-- Fix Facebook URL regex patterns to handle trailing slashes
-- This addresses the issue where URLs like "https://www.facebook.com/fastballtheband/" were rejected

BEGIN;

-- Update facebook platform regex to handle optional trailing slash
UPDATE urlmap
SET regex = '^https://(?:[^/]*\.)?facebook\.com/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)(?:&[^#]*)?|([^/\?#]+)/?)(?:[\?#].*)?$'
WHERE site_name = 'facebook';

-- Update facebookID platform regex to handle optional trailing slash  
UPDATE urlmap
SET regex = '^https://(?:[^/]*\.)?facebook\.com/(?:people/[^/]+/([0-9]+)/?|profile\.php\?id=([0-9]+)(?:&[^#]*)?|([^/\?#]+)/?)(?:[\?#].*)?$'
WHERE site_name = 'facebookID';

COMMIT;