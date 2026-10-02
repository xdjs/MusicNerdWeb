/** A production deployment. Vercel sets NEXT_PUBLIC_VERCEL_ENV on every deployment; it is unset locally. */
export const IS_PROD = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

/**
 * MusicNerdAPI (xdjs/MusicNerdAPI), which runs research since the #1365
 * cutover. Production talks to production; previews, staging.musicnerd.xyz and
 * local development talk to MusicNerdAPI's `staging` environment, which
 * deploys `main` on the staging database. An isolated preview can override
 * that target to verify a paired API PR; production never uses the override.
 */
export const MUSICNERD_API_URL = IS_PROD
    ? "https://musicnerd-api.vercel.app"
    : (process.env.NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL?.trim().replace(/\/+$/, "")
        || "https://musicnerd-api-staging.vercel.app");
