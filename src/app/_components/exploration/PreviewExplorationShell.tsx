"use client";
import {
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import HomePageSplash from "../HomePageSplash";
import NavContent from "../nav/NavContent";
import Footer from "../Footer";
import SearchBar from "../nav/components/SearchBar";
import AddArtist from "../nav/components/AddArtist";
import IntentExplorer from "@/app/dev/intent-preview/IntentExplorer";
import {
  PreviewArtistContext,
  type PreviewArtistProps,
} from "./PreviewArtistContext";
import homeStyles from "../HomePageSplash.module.css";
import styles from "./shell.module.css";
/** One search DOM node and one retained artist surface across home/exploration history. */
export default function PreviewExplorationShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const home = pathname === "/";
  const exploring = /^\/artist\/[^/]+\/explore$/.test(pathname ?? "");
  const active = home || exploring;
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);
  useLayoutEffect(() => {
    if (home && previousPath.current !== "/")
      root.current
        ?.querySelector<HTMLInputElement>("[data-persistent-search] input")
        ?.focus({ preventScroll: true });
    previousPath.current = pathname;
  }, [home, pathname]);
  const [artist, setArtist] = useState<PreviewArtistProps | null>(null);
  const register = useCallback(
    (props: PreviewArtistProps) =>
      setArtist((previous) =>
        previous?.artistId === props.artistId &&
        previous?.initialEvidence === props.initialEvidence
          ? previous
          : props,
      ),
    [],
  );
  const [rect, setRect] = useState({ top: 0, left: 0, width: 0 });
  useLayoutEffect(() => {
    if (!active) return;
    const anchor = root.current?.querySelector<HTMLElement>(
      home ? "[data-home-search-anchor]" : "[data-header-search-anchor]",
    );
    if (!anchor) return;
    const measure = () => {
      const box = anchor.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [home, active, pathname]);
  const visibleArtist =
    exploring && pathname === `/artist/${artist?.artistId}/explore`;
  return (
    <PreviewArtistContext.Provider value={register}>
      <div ref={root} className={styles.shell} data-exploration-shell>
        <NavContent sharedSearch={active} />
        <main className="flex-grow flex flex-col min-h-0 w-full">
          <motion.div
            aria-hidden={!home}
            inert={!home}
            initial={false}
            animate={{ height: home ? "auto" : 0, opacity: home ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            style={{
              overflow: "hidden",
              visibility: home ? "visible" : "hidden",
            }}
          >
            <HomePageSplash sharedSearch />
          </motion.div>
          {children}
          {artist && (
            <div hidden={!visibleArtist}>
              <IntentExplorer key={artist.artistId} {...artist} />
            </div>
          )}
        </main>
        <Footer />
        <motion.div
          data-persistent-search
          className={`${homeStyles.searchRow} ${styles.search}`}
          initial={false}
          animate={{ top: rect.top, left: rect.left, width: rect.width }}
          transition={{
            duration: reduced ? 0 : 0.24,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ visibility: active && rect.width ? "visible" : "hidden" }}
          aria-hidden={!active}
          inert={!active}
        >
          <Suspense>
            <SearchBar appearance="home" exploration />
          </Suspense>
          <AddArtist />
        </motion.div>
      </div>
    </PreviewArtistContext.Provider>
  );
}
