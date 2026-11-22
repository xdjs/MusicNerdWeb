import type { LucideIcon } from 'lucide-react';
import { MUTED_TEXT } from '../const';

/** One thing the agent will be able to do, with its icon and an optional badge. */
export default function Permission({ icon: Icon, title, badge, text }: { icon: LucideIcon; title: string; badge?: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden="true" className="mt-px h-5 w-5 shrink-0 text-foreground" strokeWidth={1.7} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-foreground">
          {title}
          {badge && <span className={`rounded-full border border-maroon/10 px-2 py-0.5 text-[11px] font-semibold dark:border-white/[0.08] ${MUTED_TEXT}`}>{badge}</span>}
        </p>
        <p className={`mt-0.5 break-words text-[13px] ${MUTED_TEXT}`}>{text}</p>
      </div>
    </div>
  );
}
