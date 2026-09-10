-- SQL alternative when production service-role credentials are non-exportable.
-- Supabase supports bucket creation through storage.buckets. No object records,
-- existing buckets, grants, or policies are modified.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lore-upload-staging', 'lore-upload-staging', false, 10485760,
    ARRAY['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets
        WHERE id = 'lore-upload-staging' AND name = 'lore-upload-staging'
        AND public = false AND file_size_limit = 10485760
        AND allowed_mime_types @> ARRAY['application/pdf', 'text/plain', 'text/markdown',
            'text/csv', 'application/json', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/wav']
        AND cardinality(allowed_mime_types) = 12)
    THEN RAISE EXCEPTION 'Existing lore-upload-staging configuration differs; no settings overwritten';
    END IF;
END $$;
