// Uppercase alphanumeric chars, excluding ambiguous ones (I, O, 0, 1)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferenceCode(): string {
    let code = "";
    for (let i = 0; i < 4; i++) {
        code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return `MN-${code}`;
}
