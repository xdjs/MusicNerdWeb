'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserNamePrompt from './UserNamePrompt';

type Account = { id: string; username: string; usernameNeedsConfirmation: boolean; usernamePromptedAt: string | null };

export default function UserNameSetup() {
  const { data: session, status, update } = useSession();
  const id = status === 'authenticated' ? session.user.id : null;
  const currentId = useRef(id); currentId.current = id;
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setAccount(null); setOpen(false);
    if (!id) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/user/${id}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return;
        const user = await response.json() as Account;
        if (controller.signal.aborted || user.id !== id) return;
        setAccount(user);
        if (!user.usernameNeedsConfirmation || user.usernamePromptedAt) return;
        const shown = await fetch(`/api/user/${id}/name-prompt`, { method: 'POST', signal: controller.signal });
        if (shown.ok) {
          const result = await shown.json();
          if (!controller.signal.aborted) setOpen(result.showPrompt === true);
        }
      } catch { /* Setup is optional; the profile reminder remains available. */ }
    })();
    return () => controller.abort();
  }, [id, session?.user.name]);
  useEffect(() => {
    const show = () => { if (account?.id === currentId.current) setOpen(true); };
    window.addEventListener('musicnerd:choose-user-name', show);
    return () => window.removeEventListener('musicnerd:choose-user-name', show);
  }, [account]);
  if (!open || !account || account.id !== id) return null;
  return <UserNamePrompt key={account.id} name={account.username} onDismiss={() => setOpen(false)} onSave={async name => {
    const response = await fetch(`/api/user/${account.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Could not save your user name.');
    if (currentId.current !== account.id) return;
    setOpen(false); setAccount({ ...account, username: name, usernameNeedsConfirmation: false });
    await update(); router.refresh();
  }} />;
}
