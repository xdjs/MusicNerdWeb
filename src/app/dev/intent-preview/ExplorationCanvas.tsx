import { listening, timeline, visualWorld } from '@/lib/intent/latashaSnapshot';
import type { IntentPlan } from '@/lib/intent/types';
import SourceNote from './SourceNote';
import styles from './intent.module.css';
export default function ExplorationCanvas({ plan }: { plan: IntentPlan }) {
 const items = (plan.view === 'timeline' ? timeline : plan.view === 'listen' ? listening : visualWorld).filter(item =>
  plan.filter === 'all' || (plan.filter === 'releases' && item.kind === 'release') ||
  (plan.filter === 'community' && item.kind === 'community') || (plan.filter === 'films' && item.kind === 'film') ||
  (plan.filter === 'process' && item.kind === 'process'));
 if (!items.length) return <p className={styles.empty}>There are no verified items for this lens yet. Choose “All” to widen the view.</p>;
 return <div className={plan.view === 'timeline' ? styles.timeline : plan.view === 'listen' ? styles.listening : styles.gallery}>
  {items.map((item, index) => <article key={item.id} className={styles.item}>
   {plan.view === 'timeline' && <div className={styles.year}>{item.date.slice(0,4)}<span /></div>}
   {item.image && <a className={styles.art} href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><img src={item.image} alt={`${item.title} artwork`} /><span>{plan.view === 'world' && item.kind !== 'release' ? 'Watch' : 'Explore'} ↗</span></a>}
   <div className={styles.itemBody}>
    <p className={styles.itemMeta}>{plan.view === 'listen' ? `0${index + 1} / ${index === 0 ? 'Start here' : index === 1 ? 'Go back' : 'Dig deeper'}` : item.subtitle}</p>
    <h3>{item.title}</h3><p>{item.description}</p><p className={styles.date}>{item.dateLabel}</p>
    {plan.view === 'listen' && <a className={styles.listenLink} href={item.url} target="_blank" rel="noreferrer">Listen on Bandcamp <span aria-hidden="true">↗</span></a>}
    {!item.image && <a className={styles.listenLink} href={item.url} target="_blank" rel="noreferrer">Read the conversation ↗</a>}
    <SourceNote id={item.evidenceId} />
   </div>
  </article>)}
 </div>;
}
