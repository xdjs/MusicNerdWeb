import { getServerAuthSession } from "@/server/auth";
import { getUserById, getAllUsers } from "@/server/utils/queries/userQueries";
import { getPendingUGC } from "@/server/utils/queries/artistQueries";
import UGCDataTable from "./ugc-data-table";        
import { ugcColumns } from "./columns";
import { whitelistedColumns } from "./columns";
import UsersDataTable from "./whitelisted-data-table";
import PleaseLoginPage from "@/app/_components/PleaseLoginPage";

export default async function Admin() {
    const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === 'true' && process.env.NODE_ENV !== 'production';

    let isAuthorized = false;
    let userId: string | undefined;

    if (walletlessEnabled) {
        // Local dev shortcut – treat as admin without auth.
        isAuthorized = true;
    } else {
        const session = await getServerAuthSession();
        const user = session?.user;
        if (!user) return <PleaseLoginPage text="Log in to access this page" />;
        userId = user.id;
        const userRecord = await getUserById(userId);
        if (!userRecord || !userRecord.isAdmin) return <PleaseLoginPage text="You are not authorized to access this page" />;
        isAuthorized = true;
    }

    if (!isAuthorized) {
        return <PleaseLoginPage text="You are not authorized to access this page" />;
    }

    const [pendingUGCData, allUsers] = await Promise.all([
        getPendingUGC(),
        getAllUsers(),
    ]);

            return (
            <section className="admin-page px-10 py-5 space-y-6">
                <div className="flex flex-col space-y-6">
                    <div className="flex flex-col space-y-4">
                        <h1 className="text-3xl font-bold text-[#9b83a0]">Admin Dashboard</h1>
                        <p className="text-muted-foreground">Manage users, UGC, and system settings.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-[#9b83a0]">Pending UGC</h2>
                            <UGCDataTable data={pendingUGCData} columns={ugcColumns} />
                        </div>
                        
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-[#9b83a0]">All Users</h2>
                            <UsersDataTable data={allUsers} columns={whitelistedColumns} />
                        </div>
                    </div>
                </div>
            </section>
        );
}