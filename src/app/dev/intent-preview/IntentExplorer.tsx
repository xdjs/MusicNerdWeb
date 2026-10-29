'use client';
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, AudioLines, History, Layers3, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '@/app/_components/ThemeProvider';
import { profileUrl } from '@/lib/intent/latashaSnapshot';
import { routeIntent } from '@/lib/intent/routeIntent';
import type { IntentFilter, IntentPlan, IntentView } from '@/lib/intent/types';
import ExplorationCanvas from './ExplorationCanvas';
import SourceNote from './SourceNote';
import styles from './intent.module.css';
const views: Record<IntentView,{ title:string; intro:string; prompt:string; label:string }> = {
 timeline:{ title:'A career, in chapters.', intro:'Follow four documented moments across releases and community. A starting point, not a complete biography.', prompt:'Show me her career timeline',label:'Career timeline' },
 listen:{ title:'Find your way into her sound.',intro:'Three doors into the catalog. An editorial listening path from the present back into the archive.',prompt:'Where should I start listening?',label:'Listening path' },
 world:{ title:'Step inside her visual world.',intro:'Music, film and process, brought together from the artist’s own collection. Choose a work to explore.',prompt:'Show me her visual world',label:'Visual world' }
};
export default function IntentExplorer() {
 const {theme,setTheme}=useTheme();
 const [plan,setPlan]=useState<IntentPlan|null>(null);
 const [input,setInput]=useState('');
 const [question,setQuestion]=useState('');
 const [error,setError]=useState('');
 const [history,setHistory]=useState<{plan:IntentPlan;question:string}[]>([]);
 const [showHistory,setShowHistory]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 function explore(text:string, explicit?:IntentPlan) {
  const next=explicit ?? routeIntent(text,plan ?? undefined);
  if (!next) {setError('This prototype can explore her career, listening path or visual world. Try one of those, or refine the current view.');return;}
  if(plan) setHistory(items=>[...items,{plan,question}]);
  setPlan(next);setQuestion(text);setInput('');setError('');setShowHistory(false);
  requestAnimationFrame(()=>heading.current?.focus());
 }
 function refine(filter:IntentFilter) {if(plan) explore(question,{...plan,filter});}
 function back() {const previous=history.at(-1);setHistory(items=>items.slice(0,-1));setPlan(previous?.plan ?? null);setQuestion(previous?.question ?? '');setError('');}
 const filters: {label:string;value:IntentFilter}[]=plan?.view==='timeline'?[{label:'All moments',value:'all'},{label:'Releases',value:'releases'},{label:'Community & NFTs',value:'community'}]:plan?.view==='world'?[{label:'All works',value:'all'},{label:'Films',value:'films'},{label:'The process',value:'process'}]:[];
 return <div className={styles.experiment}>
  <header className={styles.topbar}><a href={profileUrl} className={styles.brand}><img src="/musicNerdLogo.png" alt="Music Nerd" /><span>Music Nerd <small>Explore differently</small></span></a>
   <div className={styles.headerActions}><span className={styles.previewBadge}>Interaction prototype</span><button onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label={`Switch to ${theme==='dark'?'light':'dark'} theme`}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></div>
  </header>
  <div className={styles.layout}>
   <aside className={styles.identity}><div className={styles.portrait}><img src="/demo/latasha/portrait.jpg" alt="LATASHÁ" /><div className={styles.portraitCaption}>Rapper. Artist. World-builder.</div></div>
    <div className={styles.artistInfo}><h1>LATASHÁ</h1><p>New York roots. <br/>Los Angeles worlds.</p><a href={profileUrl} target="_blank" rel="noreferrer">Her Music Nerd profile <ArrowUpRight size={16}/></a><SourceNote id="bio" /></div>
    <div className={styles.identityNote}><AudioLines size={22}/><p>One artist.<br/>More than one way in.</p></div>
   </aside>
   <section className={styles.workspace} aria-label="Artist exploration">
    {!plan ? <div className={styles.welcome}><p className={styles.context}>Go beyond the bio</p><h2>What brings you<br/>to LATASHÁ?</h2><p className={styles.lede}>Start with your curiosity.<br/>The view follows you.</p></div> : <div className={styles.journeyBar}><button onClick={back}><ArrowLeft size={16}/> Back</button><button onClick={()=>setShowHistory(!showHistory)} aria-expanded={showHistory}><History size={16}/> Your explorations <span>{history.length+1}</span></button></div>}
    {showHistory && <div className={styles.history}>{history.length===0?<p>This is your first exploration.</p>:history.map((entry,index)=><button key={index} onClick={()=>explore(entry.question,entry.plan)}>{entry.question}<ArrowUpRight size={15}/></button>)}</div>}
    <form className={styles.composer} onSubmit={event=>{event.preventDefault();explore(input);}}><label htmlFor="artist-intent" className={styles.srOnly}>{plan?'Explore another angle':'What would you like to explore about LATASHÁ?'}</label><input id="artist-intent" value={input} onChange={event=>setInput(event.target.value)} placeholder={plan?'Ask for another angle…':'I’m curious about…'} maxLength={300} aria-describedby={error?'intent-error':'prototype-note'}/><button type="submit" disabled={!input.trim()} aria-label="Explore this intent"><ArrowUpRight size={25}/></button></form>
    {error && <div id="intent-error" role="alert" className={styles.error}>{error}<button onClick={()=>setError('')} aria-label="Dismiss message"><X size={16}/></button></div>}
    <div className={styles.suggestions} aria-label="Suggested explorations">{(Object.keys(views) as IntentView[]).map(view=><button key={view} aria-pressed={plan?.view===view} onClick={()=>explore(views[view].prompt,{view,filter:'all'})}>{views[view].label}<ArrowUpRight size={14}/></button>)}</div>
    {!plan ? <div className={styles.invitation}><div className={styles.coverStack}><img src="/demo/latasha/teen.jpg" alt="Teen Nite at Empire cover"/><img src="/demo/latasha/out-here.jpg" alt="OUT HERE cover"/><img src="/demo/latasha/past.jpg" alt="PAST LIFE cover"/></div><div><Layers3 size={23}/><p>Releases. Stories. Worlds.</p><span>Connected through sources,<br/>shaped around your question.</span></div></div> : <div className={styles.canvas}>
     <div className={styles.intentSummary}><span>Your curiosity</span><p>“{question}”</p></div>
     <h2 ref={heading} tabIndex={-1}>{views[plan.view].title}</h2><p className={styles.canvasIntro}>{views[plan.view].intro}</p>
     {filters.length>0 && <div className={styles.filters} aria-label="Refine this exploration">{filters.map(filter=><button key={filter.value} aria-pressed={plan.filter===filter.value} onClick={()=>refine(filter.value)}>{filter.label}</button>)}</div>}
     <ExplorationCanvas plan={plan}/>
     <div className={styles.followup}><p>Keep following the thread</p><button onClick={()=>explore(views[plan.view==='timeline'?'listen':plan.view==='listen'?'world':'timeline'].prompt)}>{views[plan.view==='timeline'?'listen':plan.view==='listen'?'world':'timeline'].prompt}<ArrowUpRight size={18}/></button></div>
    </div>}
    <footer className={styles.disclosure}><p id="prototype-note">Curated source snapshot · October 29, 2026. Deterministic intent routing; no live AI.</p><details><summary>About this experiment</summary><p>This preview demonstrates how an artist page can respond to what you want to explore. It recognizes a small set of intents and rearranges verified source material. It cannot answer arbitrary questions. Listening paths and presentation are editorial; the sources support the facts. Nothing you type is sent to a model or saved.</p><SourceNote id="profile"/></details></footer>
   </section>
  </div>
 </div>;
}
