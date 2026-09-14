/** Mirrors the `inprocess` urlmap regex (drizzle/0024_artist_profile_protection.sql). */
const IN_PROCESS_PROFILE_URL = /^https?:\/\/(?:www\.)?inprocess\.world\/(0x[a-fA-F0-9]{40})\/?(?:[?#].*)?$/;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/**
 * The 0x address behind `artists.inprocess`, lower-cased. The column stores the urlmap
 * capture group, which for In Process is the bare address (the profile URL is rebuilt
 * from `app_string_format` for display), so a bare address is the common input; a full
 * profile URL is accepted too. Null for anything else.
 */
export function extractInProcessAddress(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (ADDRESS.test(trimmed)) return trimmed.toLowerCase();
    const match = IN_PROCESS_PROFILE_URL.exec(trimmed);
    return match ? match[1].toLowerCase() : null;
}
