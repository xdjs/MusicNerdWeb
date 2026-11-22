'use client';

import { useLogout } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { signOutEverywhere } from '@/app/_components/nav/components/signOutEverywhere';
import { INSET, LINK, MUTED_TEXT } from '../const';

/** Who is approving: the signed-in member, with Switch account to log out and in as someone else. */
export default function AccountCard({ member }: { member: { name: string; email: string | null; initial: string } }) {
  const { logout } = useLogout();
  const { toast } = useToast();

  async function switchAccount() {
    try {
      await signOutEverywhere(logout);
      window.location.reload();
    } catch (error) {
      toast({ title: 'Could not switch account', description: (error as Error).message, variant: 'destructive' });
    }
  }

  return (
    <div className={`m-4 flex items-center gap-3 rounded-xl px-3.5 py-3 ${INSET}`}>
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-highlightpink text-[15px] font-bold text-[#000]">{member.initial}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">{member.name}</p>
        {member.email && <p className={`truncate text-[13px] ${MUTED_TEXT}`}>{member.email}</p>}
      </div>
      <button type="button" onClick={switchAccount} className={`flex min-h-11 shrink-0 items-center px-1 text-[13px] ${LINK}`}>
        Switch account
      </button>
    </div>
  );
}
