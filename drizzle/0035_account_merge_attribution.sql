CREATE TABLE "account_merge_events" (
	"source_user_id" uuid PRIMARY KEY NOT NULL,
	"target_user_id" uuid NOT NULL,
	"activity_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_merge_distinct_users" CHECK ("account_merge_events"."source_user_id" <> "account_merge_events"."target_user_id"),
	CONSTRAINT "account_merge_nonnegative_count" CHECK ("account_merge_events"."activity_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "account_merge_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "mnweb_select_account_merges" ON "account_merge_events" AS PERMISSIVE FOR SELECT TO "mnweb" USING (true);
--> statement-breakpoint
REVOKE ALL ON TABLE public.account_merge_events FROM PUBLIC, anon, authenticated, mnweb;
--> statement-breakpoint
GRANT SELECT ON TABLE public.account_merge_events TO mnweb;
--> statement-breakpoint
-- Trusted backend only: Link Wallet verifies Privy wallet ownership before entering
-- the merge transaction. No general event UPDATE privilege is granted to the app.
-- SECURITY DEFINER must be owned by the DDL role, never mnweb or a browser role.
CREATE FUNCTION public.transfer_account_activity(
    source_user uuid, target_user uuid, expected_privy_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    source_privy text;
    target_privy text;
    moved_count integer;
BEGIN
    IF source_user IS NULL OR target_user IS NULL OR source_user = target_user
       OR nullif(btrim(expected_privy_id), '') IS NULL THEN
        RAISE EXCEPTION 'Invalid account attribution transfer';
    END IF;

    -- Match mergeAccounts' lock order; FK inserts must wait for consolidation.
    PERFORM id FROM public.users WHERE id IN (source_user, target_user) ORDER BY id FOR UPDATE;
    SELECT privy_user_id INTO source_privy FROM public.users WHERE id = source_user;
    IF NOT FOUND OR source_privy IS NOT NULL THEN
        RAISE EXCEPTION 'Source account identity has not been released';
    END IF;
    SELECT privy_user_id INTO target_privy FROM public.users WHERE id = target_user;
    IF NOT FOUND OR target_privy IS DISTINCT FROM expected_privy_id THEN
        RAISE EXCEPTION 'Surviving account identity does not match';
    END IF;

    UPDATE public.artist_activity_events SET actor_user_id = target_user
    WHERE actor_user_id = source_user;
    GET DIAGNOSTICS moved_count = ROW_COUNT;

    INSERT INTO public.account_merge_events (source_user_id, target_user_id, activity_count)
    VALUES (source_user, target_user, moved_count);
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.transfer_account_activity(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.transfer_account_activity(uuid, uuid, text) TO mnweb;
