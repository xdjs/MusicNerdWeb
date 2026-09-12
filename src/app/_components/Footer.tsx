"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./HomePageSplash.module.css";

export default function Footer() {
    const isHome = usePathname() === "/";
    if (isHome) {
        return (
            <footer className={styles.homeFooter}>
                <Image
                    src="/music-nerd-parental-advisory.png"
                    alt="Music Nerd"
                    width={7500}
                    height={5475}
                    sizes="(min-width: 768px) 112px, 88px"
                    className={styles.stamp}
                />
                <p className={styles.footerCredit}>
                    Made in Seattle by <a href="https://x.com/cxy" target="_blank" rel="noopener noreferrer" className="underline">@cxy</a>{" "}
                    <a href="https://x.com/clt" target="_blank" rel="noopener noreferrer" className="underline">@clt</a> and friends
                </p>
            </footer>
        );
    }
    return (
        <footer className='px-5 py-5 w-full text-center mt-auto'>
            <h2 className='text-[14px] sm:text-[25px] tracking[-0.5px] font-bold text-maroon'>
                Made in Seattle by <a href="https://x.com/cxy" target="blank" className='link'>@<span className='underline'>cxy</span> </a>
                <a href="https://x.com/clt" target="blank" className='link'>@<span className='underline'>clt</span></a> and friends
            </h2>
        </footer>
    )
}