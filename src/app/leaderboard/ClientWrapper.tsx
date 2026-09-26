"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Leaderboard from "@/app/profile/Leaderboard";
import surface from "@/app/profile/ProfileConcept.module.css";
import styles from "@/components/community/Community.module.css";

export default function ClientWrapper() {
  const {data: session, status} = useSession();
  return <div className={`${surface.concept} ${styles.page} mx-auto w-full min-w-0 max-w-6xl px-5 sm:px-10 pb-16 text-foreground`}>
    <header className={styles.header}><div><h1>Community leaderboard</h1><p className={styles.description}>Meet the people helping fans discover more about their favorite artists.</p></div><Link className={styles.pill} href={status==='authenticated'?'/profile':'/'}>{status==='authenticated'?'Your profile':'Explore artists'}<ArrowUpRight size={15}/></Link></header>
    <Leaderboard currentUserId={status==='authenticated' ? session?.user?.id : undefined}/>
  </div>;
}
