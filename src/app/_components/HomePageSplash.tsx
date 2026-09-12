import ActivityFeed from "@/app/_components/ActivityFeed";
import styles from "@/app/_components/HomePageSplash.module.css";

const MANIFESTO = [
    { before: "we listen with ", keyword: "intent" },
    { before: "we follow with ", keyword: "curiosity" },
    { before: "we ", keyword: "care", after: " when artists let us into the work" },
    { before: "we act with ", keyword: "purpose" },
];

export default function HomePageSplash() {
    return (
        <div className={styles.home}>
            <div className={styles.content}>
                <header className={styles.header}>
                    <h1 className={styles.wordmark} style={{ color: "#ff9ce3" }}>
                        music nerd
                    </h1>
                    <p className={styles.intro}>
                        a closer connection to the artists you love.
                    </p>
                </header>

                <section className={`glass ${styles.manifesto}`} aria-label="Our manifesto">
                    <div className={styles.lines}>
                        {MANIFESTO.map(({ before, keyword, after }) => (
                            <p key={keyword}>
                                {before}
                                <span className={styles.keyword}>{keyword}</span>
                                {after}
                            </p>
                        ))}
                    </div>
                    <p className={styles.invitation}>
                        buy the music. follow the process.
                        <br />
                        help make what comes next possible.
                    </p>
                </section>

                <section className={`glass-subtle ${styles.activity}`} aria-labelledby="home-activity-heading">
                    <h2 id="home-activity-heading" className={styles.activityHeading}>
                        around the directory
                    </h2>
                    <ActivityFeed />
                </section>
            </div>
        </div>
    );
}
