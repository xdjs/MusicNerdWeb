import { evidence } from "@/lib/intent/latashaSnapshot";
import styles from "./intent.module.css";
export default function SourceNote({ id }: { id: string }) {
  const source = evidence.find((item) => item.id === id);
  if (!source) return null;
  return (
    <details className={styles.source}>
      <summary>
        Why this is here <span aria-hidden="true">↗</span>
      </summary>
      <div>
        <p className={styles.origin}>{source.origin}</p>
        <p>{source.summary}</p>
        <p className={styles.caveat}>{source.limitation}</p>
        <a href={source.url} target="_blank" rel="noreferrer">
          Read the supporting source
        </a>
      </div>
    </details>
  );
}
