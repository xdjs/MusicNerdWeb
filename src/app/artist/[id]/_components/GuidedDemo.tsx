"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";

const steps = [
  { title: "Your real artist profile", target: '#mn-about', text: "This is the real preview app and API. During a fresh onboarding build, watch the existing research status and sections fill. If this artist is already built, the page shows saved data; replaying this guide does not restart research." },
  { title: "Edit your profile", target: '[data-testid="edit-mode-toggle"]', text: "Click Edit profile in the artist header. These are the normal profile controls. If the button is missing, sign in with an account allowed to edit this artist." },
  { title: "Review your Lore", target: '#mn-lore', text: "Open Lore. Search the real approved sources, move between pages, or switch to Questions and Bios. Source changes here are real changes in this preview environment." },
  { title: "Ask about the artist", target: '#mn-ask', text: "Open Ask and type your question. For LATASHÁ, try: Who made the PPNE NYC music visualizer? The answer comes from the actual API. Read its citations and original passages." },
  { title: "Research beyond Lore", target: '#mn-ask', text: "Ask a specific question the saved evidence may not answer, such as: Who played bass on LATASHÁ’s PPNE? Real research may take time or remain unresolved. The guide neither supplies an answer nor starts research for you." },
  { title: "Review discoveries", target: '#mn-lore', text: "In Edit profile → Lore, reload discoveries if needed. Read the original and confirm the artist and context before choosing Add to Lore. There may be no new discoveries; this depends on the actual research result." },
  { title: "Review your interview answers", target: '#mn-lore', text: "Choose Questions to review real saved interview answers. If there are none, you will see the real empty state. Editing an answer saves it through the API and retains version history. The new interviewer is still disabled." },
  { title: "Reopen a checked answer", target: '#mn-ask', text: "After a completed research answer, reload the page, open Ask, and use Reopen saved answer when offered. Real answers expire and are rechecked against permitted sources. Use the step buttons to return here after reload." },
  { title: "Shared artist knowledge", target: '#mn-knowledge', text: "Open What we know about you to inspect the actual knowledge and its sources. The API makes shared evidence available to the website and other agents. This is real data, not a demonstration fixture." },
];

/** Preview-only orientation. Never intercepts data or clicks mutation controls. */
export default function GuidedDemo() {
  const [step, setStep] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [found, setFound] = useState(true);
  const [focusRevision, setFocusRevision] = useState(0);
  useEffect(() => {
    if (!visible || collapsed) return;
    let target: HTMLElement | null = null;
    let previousOutline = "";
    let previousOffset = "";
    const timer = window.setTimeout(() => {
      target = document.querySelector<HTMLElement>(steps[step].target);
      setFound(Boolean(target));
      if (!target) return;
      previousOutline = target.style.outline;
      previousOffset = target.style.outlineOffset;
      target.style.outline = "3px solid #ed80cf";
      target.style.outlineOffset = "5px";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    }, 150);
    return () => {
      window.clearTimeout(timer);
      if (target) { target.style.outline = previousOutline; target.style.outlineOffset = previousOffset; }
    };
  }, [step, visible, collapsed, focusRevision]);
  if (!visible) return <button type="button" onClick={() => setVisible(true)} className="fixed bottom-4 left-4 z-40 rounded-xl border border-pink-400/50 bg-neutral-950 px-4 py-3 text-sm text-white shadow-lg">Open walkthrough</button>;
  return <aside aria-label="Live preview walkthrough" className="fixed bottom-4 left-3 z-50 w-[min(290px,calc(100vw-24px))] rounded-2xl border border-pink-400/50 bg-neutral-950/95 p-4 text-white shadow-2xl backdrop-blur-md sm:left-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-pink-300">Live preview · {step + 1}/{steps.length}</p>
      <div className="flex gap-1"><button type="button" className="min-h-9 px-2 text-xs" onClick={() => setCollapsed(value => !value)}>{collapsed ? "Expand" : "Minimize"}</button><button type="button" aria-label="Close walkthrough" className="h-9 w-9" onClick={() => setVisible(false)}><X size={16}/></button></div>
    </div>
    {!collapsed && <>
      <h2 className="mb-2 mt-2 text-lg font-semibold">{steps[step].title}</h2>
      <p className="text-sm leading-relaxed text-neutral-300">{steps[step].text}</p>
      {!found && <p role="status" className="mt-2 text-xs text-amber-200">This control is not visible yet. Check sign-in or open the relevant section, then locate it again.</p>}
      <button type="button" className="mt-3 min-h-10 text-sm text-pink-200 underline underline-offset-4" onClick={() => setFocusRevision(value => value + 1)}>Locate this control</button>
      <nav aria-label="Walkthrough navigation" className="mt-2 flex items-center justify-between gap-2">
        <button type="button" disabled={step === 0} onClick={() => setStep(value => value - 1)} className="flex min-h-11 items-center gap-1 rounded-lg border border-white/20 px-3 disabled:opacity-40"><ChevronLeft size={16}/>Back</button>
        <button type="button" onClick={() => setStep(value => (value + 1) % steps.length)} className="flex min-h-11 items-center gap-1 rounded-lg bg-pink-400 px-3 font-medium text-black">{step === steps.length - 1 ? "Start over" : "Next"}<ChevronRight size={16}/></button>
      </nav>
      <div className="mt-3 flex flex-wrap gap-1" aria-label="Choose walkthrough step">{steps.map((item, index) => <button type="button" key={item.title} aria-label={`Step ${index + 1}: ${item.title}`} aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)} className={`min-h-8 min-w-8 rounded-lg border text-xs ${index === step ? "border-pink-300 bg-pink-400/20" : "border-white/15"}`}>{index + 1}</button>)}</div>
      <button type="button" onClick={() => { setStep(0); setFocusRevision(value => value + 1); }} className="mt-3 flex min-h-9 items-center gap-2 text-xs text-neutral-300"><RotateCcw size={13}/>Restart guide only</button>
      <p className="mt-2 border-t border-white/15 pt-2 text-[11px] text-neutral-400">Actual data and services. Normal actions may save changes or start paid research. Refresh resets this guide, not artist data.</p>
    </>}
  </aside>;
}
