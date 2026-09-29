export function validateUserName(value: unknown): string | null {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) return 'User name is required.';
  if (name.length > 50) return 'User name must be 50 characters or less.';
  if (/[\x00-\x1F\x7F]/.test(name)) return 'User name contains invalid characters.';
  if (name.includes('@') || /^0x[a-f0-9]{40}$/i.test(name)) return 'Choose a user name instead of an email or wallet address.';
  return null;
}
