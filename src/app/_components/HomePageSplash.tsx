import { Suspense } from "react";
import ActivityFeed from "@/app/_components/ActivityFeed";
import styles from "@/app/_components/HomePageSplash.module.css";
import SearchBar from "@/app/_components/nav/components/SearchBar";

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
                </header>

                <div className={styles.manifesto}>
                    <div className={styles.lines}>
                        {MANIFESTO.map(({ before, keyword, after }) => (
                            <p key={keyword}>
                                {before}
                                <span className={styles.keyword}>{keyword}</span>
                                {after}
                            </p>
                        ))}
                    </div>
                </div>

                <div className={styles.discovery}>
                    <p className={styles.invitation}>
                        buy the music. follow the process. help make what comes next possible.
                    </p>
                    <div className={styles.search}>
                        <Suspense>
                            <SearchBar />
                        </Suspense>
                    </div>
                </div>

                <div className={styles.activity}>
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
}
