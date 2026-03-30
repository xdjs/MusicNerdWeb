"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UGCDataTable from "./ugc-data-table";
import ClaimsDataTable from "./claims-data-table";
import UsersSection from "./UsersSection";
import { ugcColumns, whitelistedColumns } from "./columns";
import { claimsColumns } from "./claims-columns";
import type { PendingClaimRow } from "./claims-columns";
import type { UgcResearch, User } from "@/server/db/DbTypes";

interface AdminTabsProps {
    pendingUGC: UgcResearch[];
    pendingClaims: PendingClaimRow[];
    allUsers: User[];
}

export default function AdminTabs({ pendingUGC, pendingClaims, allUsers }: AdminTabsProps) {
    return (
        <Tabs defaultValue="ugc" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="ugc" className="text-sm">
                    UGC ({pendingUGC.length})
                </TabsTrigger>
                <TabsTrigger value="claims" className="text-sm">
                    Claims ({pendingClaims.length})
                </TabsTrigger>
                <TabsTrigger value="users" className="text-sm">
                    Users
                </TabsTrigger>
            </TabsList>

            <TabsContent value="ugc">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-[#9b83a0]">
                        Pending UGC Submissions ({pendingUGC.length})
                    </h2>
                    <UGCDataTable columns={ugcColumns} data={pendingUGC} />
                </div>
            </TabsContent>

            <TabsContent value="claims">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-[#9b83a0]">
                        Pending Artist Claims ({pendingClaims.length})
                    </h2>
                    <ClaimsDataTable columns={claimsColumns} data={pendingClaims} />
                </div>
            </TabsContent>

            <TabsContent value="users">
                <UsersSection columns={whitelistedColumns} data={allUsers || []} />
            </TabsContent>
        </Tabs>
    );
}
