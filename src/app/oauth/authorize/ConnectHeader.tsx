import Image from 'next/image';
import { ArrowLeftRight } from 'lucide-react';
import AgentTile from '../AgentTile';
import { ACCENT, HEADLINE, MUTED_TEXT } from '../const';

/** The agent tile and the Music Nerd disc, over "<agent> wants to use music nerd". */
export default function ConnectHeader({ agent }: { agent: string }) {
  return (
    <>
      <div className="flex items-center justify-center gap-3.5 pt-2">
        <AgentTile className="h-14 w-14 sm:h-[60px] sm:w-[60px]" />
        <ArrowLeftRight aria-hidden="true" className={`h-5 w-5 ${MUTED_TEXT}`} strokeWidth={1.8} />
        <Image src="/musicNerdLogo.png" alt="Music Nerd" width={60} height={60} className="h-14 w-14 rounded-full sm:h-[60px] sm:w-[60px]" priority />
      </div>
      <h1 id="consent-title" className={`break-words text-center text-[30px] leading-[1.1] sm:text-[34px] ${HEADLINE}`}>
        <span className="text-foreground">{agent}</span> wants to use <span className={ACCENT}>music nerd</span>
      </h1>
    </>
  );
}
