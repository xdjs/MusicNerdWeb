"use client"
import { useState } from "react";
import { useRefreshAdmin } from "@/hooks/useRefreshAdmin";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminUserLabel } from "@/lib/admin/adminUserLabel";
import type { AdminUserMatch } from "@/lib/admin/searchAdminUsers";
import { setAdminUserRole } from "@/lib/admin/setAdminUserRole";
import SearchBar from "./UserSearch";

/** Search users by wallet or username and turn one role on or off for them. */
export default function RoleUsersDialog({ trigger, title, role, enabled }: {
    trigger: string; title: string; role: "whitelisted" | "admin" | "hidden"; enabled: boolean;
}) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const refreshAdmin = useRefreshAdmin();
    const [users, setUsers] = useState<AdminUserMatch[]>([]);
    const [status, setStatus] = useState<{ error: string; isLoading: boolean }>({ error: "", isLoading: false });
    const [query, setQuery] = useState('');

    async function save() {
        setStatus({ error: "", isLoading: true });
        try {
            await setAdminUserRole(users.map(user => user.id), role, enabled);
            void refreshAdmin();
            setIsDialogOpen(false);
            setUsers([]);
            setStatus({ error: "", isLoading: false });
        } catch (error) {
            setStatus({ error: error instanceof Error ? error.message : "Could not change user roles.", isLoading: false });
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-xs px-2 py-1 h-8">{trigger}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Insert wallet address or username</p>
                <div className="space-y-4">
                    <SearchBar setUsers={user => setUsers([...users.filter(u => u.id !== user.id), user])} query={query} setQuery={setQuery} />
                    <div>{users.map(user => <Button variant="outline" onClick={() => setUsers(users.filter(u => u.id !== user.id))} key={user.id}>{adminUserLabel(user)} <X className="w-4 h-4 ml-1" /></Button>)}</div>
                </div>
                {status.error && <p role="alert" className="text-sm text-red-500">{status.error}</p>}
                <DialogFooter>
                    <Button type="submit" disabled={!users.length || status.isLoading} onClick={() => void save()}>Save changes {status.isLoading && <img className="w-4 h-4" src="/spinner.svg" alt="loading" />}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
