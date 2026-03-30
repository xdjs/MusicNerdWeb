import { randomBytes } from "crypto";

// Uppercase alphanumeric chars, excluding ambiguous ones (I, O, 0, 1)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferenceCode(): string {
    const bytes = randomBytes(4);
    const code = Array.from(bytes)
        .map(b => CHARS[b % CHARS.length])
        .join("");
    return `MN-${code}`;
}
