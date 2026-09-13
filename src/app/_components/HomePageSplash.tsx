import { Suspense } from "react";
import ActivityFeed from "./ActivityFeed";
import SearchBar from "./nav/components/SearchBar";
import AddArtist from "./nav/components/AddArtist";
import styles from "./HomePageSplash.module.css";

const MANIFESTO = [
    { action: "listen", rest: "with intent" },
    { action: "follow", rest: "with curiosity" },
    { action: "care", rest: "when artists let us in" },
    { action: "act", rest: "with purpose" },
];

export default function HomePageSplash() {
    return (
        <section className={styles.home} aria-labelledby="home-title">
            <div className={styles.manifesto}>
                {MANIFESTO.map(({ action, rest }) => (
                    <p key={action}>We <span>{action}</span> {rest}</p>
                ))}
                <h1 id="home-title" className={styles.title}>We are <span>music nerd</span></h1>
            </div>

            <div className={styles.discovery}>
                <h2 className={styles.invitation}>Help build the artist’s world with us</h2>
                <div className={styles.searchRow}>
                    <Suspense fallback={<div className={styles.searchSkeleton} />}>
                        <SearchBar appearance="home" />
                    </Suspense>
                    <AddArtist />
                </div>
                <div className={styles.activity}>
                    <ActivityFeed fadeRows={false} />
                </div>
            </div>
        </section>
    );
}
