'use client';

import { Button } from '@/components/ui/button';
import { requestLogin } from '@/app/_components/nav/components/requestLogin';
import { MUTED_TEXT, PANEL } from './const';

/** A glass card asking a signed-out member to log in, with the pink Log in action. */
export default function SignInCard({ text, note }: { text: string; note?: string }) {
  return (
    <div className={`${PANEL} flex flex-col gap-3.5 p-5`}>
      <p className="text-[15px] leading-normal text-foreground">{text}</p>
      <Button variant="pink" className="min-h-12 rounded-md text-[15px] font-bold" onClick={() => requestLogin('please_login')}>
        Log in
      </Button>
      {note && <p className={`text-[13px] leading-normal ${MUTED_TEXT}`}>{note}</p>}
    </div>
  );
}
