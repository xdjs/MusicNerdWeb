import type { ReactNode } from "react";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal/constants";
import { formatEffectiveDate } from "@/lib/legal/formatEffectiveDate";

/** The shell the Terms and Privacy pages share: title, effective date, readable body. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 text-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_li]:leading-relaxed [&_a]:underline">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Effective <time dateTime={LEGAL_EFFECTIVE_DATE}>{formatEffectiveDate(LEGAL_EFFECTIVE_DATE)}</time>
      </p>
      {children}
    </article>
  );
}
