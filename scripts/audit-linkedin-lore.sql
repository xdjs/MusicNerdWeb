-- Read-only inventory, for separately reviewed cleanup. Does not imply automatic provenance.
-- Include all statuses so an approved/manual source is not silently treated as disposable.
SELECT id, artist_id, url, status
FROM artist_vault_sources
WHERE url ~* '^https?://([^/@]*@)?([a-z0-9-]+\.)*(linkedin\.com|lnkd\.in)\.?([/:?#]|$)'
ORDER BY artist_id, status, id;
