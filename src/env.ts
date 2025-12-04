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
export const OPENAI_API_KEY = validateEnv(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY', isTestEnv);
export const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '60000', 10);
export const OPENAI_MODEL = process.env.OPENAI_MODEL;

// Privy Configuration
// Note: These will be validated when Privy is actually used
// For now, allow empty/undefined values during build to prevent build failures
// Validation will happen at runtime when Privy components are imported
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyAppSecret = process.env.PRIVY_APP_SECRET;
const isPlaceholder = (value: string | undefined) => 
  !value || (typeof value === 'string' && (value.trim() === '' || value === 'your_privy_app_id' || value === 'your_privy_app_secret'));

// During build, allow empty/placeholder/undefined values (Privy not yet integrated)
// At runtime, these will be validated when Privy code is actually executed
export const PRIVY_APP_ID = isPlaceholder(privyAppId) && !isTestEnv
  ? ''
  : validateEnv(privyAppId, 'NEXT_PUBLIC_PRIVY_APP_ID', isTestEnv);

export const PRIVY_APP_SECRET = isPlaceholder(privyAppSecret) && !isTestEnv
  ? ''
  : validateEnv(privyAppSecret, 'PRIVY_APP_SECRET', isTestEnv);
