// Validate required environment variables
function validateEnv<T extends string>(value: T | undefined, name: string, isTest = false): T {
    if (!value) {
        if (isTest) {
            return 'test-value' as T;
        }
        throw new Error(`${name} environment variable is required`);
    }
    return value;
}

// Check if we're in a test environment
const isTestEnv = process.env.NODE_ENV === 'test';

export const SPOTIFY_WEB_CLIENT_ID = validateEnv(process.env.NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID, 'NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID', isTestEnv);
export const SPOTIFY_WEB_CLIENT_SECRET = validateEnv(process.env.NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_SECRET, 'NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_SECRET', isTestEnv);
export const SUPABASE_DB_CONNECTION = process.env.SUPABASE_DB_CONNECTION ?? "";
export const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "";
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? "";

// Supabase Storage
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Web search (profile discovery's last-resort tier and the vault search — see webSearch.ts).
// Exa by default since 2026-09-23 (#1265); "tavily" is the rollback. An empty key for the
// selected provider = webSearch() returns [] immediately, no network call.
export const EXA_API_KEY = process.env.EXA_API_KEY ?? "";
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";
export const WEB_SEARCH_PROVIDER = process.env.WEB_SEARCH_PROVIDER ?? "exa";

// Resend (transactional email — approval notifications). Empty = sends are skipped.
export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";

// Privy Configuration
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
export const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? "";

// Apify (Instagram post ingestion — see socialIngest.ts). Empty = ingestion no-ops.
export const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN ?? "";

// The scheduler's shared secret (Vercel cron sends it as a bearer token).
// Empty = /api/research/advance's GET stays as open as its POST already is,
// which is what local and preview environments need.
export const CRON_SECRET = process.env.CRON_SECRET ?? "";
