import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The rounded tile that stands for a connecting agent; agents send no icon of their own. */
export default function AgentTile({ className }: { className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-2xl border border-maroon/10 bg-white/70 text-foreground dark:border-white/10 dark:bg-white/10', className)}>
      <Bot aria-hidden="true" className="h-1/2 w-1/2" strokeWidth={1.7} />
    </span>
  );
}
