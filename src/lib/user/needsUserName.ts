export function needsUserName(user: { username?: string | null; wallet?: string | null }) {
  const name = user.username?.trim() ?? '';
  return !name || /[^\s@]+@[^\s@]+/.test(name) || name.toLowerCase() === user.wallet?.trim().toLowerCase();
}
