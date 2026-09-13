/** A trimmed, non-empty string from an unknown value, else null. */
export function str(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}
