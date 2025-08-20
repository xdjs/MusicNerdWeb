"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import UGCDataTable from "./ugc-data-table";        
import { ugcColumns } from "./columns";
import { whitelistedColumns } from "./columns";
import UsersDataTable from "./whitelisted-data-table";
import PleaseLoginPage from "@/app/_components/PleaseLoginPage";
import { UgcResearch, User } from "@/server/db/DbTypes";

export default function Admin() {
    const { status, data: session } = useSession();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authTransitioning, setAuthTransitioning] = useState(false);
    const [pendingUGCData, setPendingUGCData] = useState<UgcResearch[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    // Handle authentication transition
    useEffect(() => {
        if (status === 'loading') {
            setAuthTransitioning(true);
        } else if (status === 'authenticated' && authTransitioning) {
            // Show loading for a bit longer to ensure smooth transition
            const timer = setTimeout(() => {
                window.location.reload();
            }, 500);
            return () => clearTimeout(timer);
        } else if (status === 'unauthenticated') {
            setAuthTransitioning(false);
        }
    }, [status, authTransitioning]);

    // Check authorization and fetch data
    useEffect(() => {
        async function checkAuthAndFetchData() {
            if (status === 'loading') return;
            
            if (!session?.user) {
                setIsAuthorized(false);
                setIsLoading(false);
                return;
            }

            try {
                // Check if user is admin
                const userResponse = await fetch(`/api/user/${session.user.id}`);
                if (!userResponse.ok) {
                    setIsAuthorized(false);
                    setIsLoading(false);
                    return;
                }

                const userData = await userResponse.json();
                if (!userData.isAdmin) {
                    setIsAuthorized(false);
                    setIsLoading(false);
                    return;
                }

                setIsAuthorized(true);

                // Fetch pending UGC and users data
                const [ugcResponse, usersResponse] = await Promise.all([
                    fetch('/api/admin/pending-ugc'),
                    fetch('/api/admin/users')
                ]);

                if (ugcResponse.ok) {
                    const ugcData = await ugcResponse.json();
                    setPendingUGCData(ugcData);
                }

                if (usersResponse.ok) {
                    const usersData = await usersResponse.json();
                    setAllUsers(usersData);
                }
            } catch (error) {
                console.error('Error checking authorization:', error);
                setIsAuthorized(false);
            } finally {
                setIsLoading(false);
            }
        }

        checkAuthAndFetchData();
    }, [status, session]);

    // Show loading screen during authentication transition
    if (status === 'loading' || isLoading || authTransitioning) {
        return (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
                <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
                    <img className="h-12 w-12" src="/spinner.svg" alt="Loading..." />
                    <p className="text-foreground text-xl">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return <PleaseLoginPage text="You are not authorized to access this page" />;
    }

    return (
        <section className="admin-page px-10 py-5 space-y-6">
            <h1 className="text-2xl">Site Management</h1>
            <div>
                <h2 className="text-xl pb-3">Pending UGC</h2>
                <UGCDataTable columns={ugcColumns} data={pendingUGCData} />
            </div>
            <div>
                <h2 className="text-xl pb-3">Users</h2>
                <UsersDataTable columns={whitelistedColumns} data={allUsers || []} />
            </div>
        </section>
    );
}