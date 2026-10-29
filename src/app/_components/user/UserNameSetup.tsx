'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserNamePrompt from './UserNamePrompt';
import { requestUserApi } from '@/lib/user/requestUserApi';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';

export default function UserNameSetup() {
  const { user, refetch } = useMusicNerdUser();
  const id = user?.id ?? null;
  const currentId = useRef(id); currentId.current = id;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Until NextAuth signs in, PrivyLogin's reload would close the prompt after it is recorded as shown.
  const { status: sessionStatus } = useSession();
  const needsPrompt = !!user && user.usernameNeedsConfirmation && !user.usernamePromptedAt && sessionStatus === 'authenticated';
  useEffect(() => {
    setOpen(false);
    if (!id || !needsPrompt) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const shown = await requestUserApi(`/api/user/${id}/name-prompt`, { method: 'POST', signal: controller.signal });
        if (shown.ok) {
          const result = await shown.json();
          if (!controller.signal.aborted) setOpen(result.showPrompt === true);
        }
      } catch { /* Setup is optional; the profile reminder remains available. */ }
    })();
    return () => controller.abort();
  }, [id, needsPrompt]);
  useEffect(() => {
    const show = () => { if (id && currentId.current === id) setOpen(true); };
    window.addEventListener('musicnerd:choose-user-name', show);
    return () => window.removeEventListener('musicnerd:choose-user-name', show);
  }, [id]);
  if (!open || !user) return null;
  return <UserNamePrompt key={user.id} name={user.username ?? ''} onDismiss={() => setOpen(false)} onSave={async name => {
    const response = await requestUserApi(`/api/user/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save your user name.');
    if (currentId.current !== user.id) return;
    setOpen(false);
    await refetch(); router.refresh();
  }} />;
}
