"use client"
import {
    ColumnDef,
    SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { addUsersToWhitelistAction as addUsersToWhitelist, addUsersToAdminAction as addUsersToAdmin, addUsersToHiddenAction as addUsersToHidden } from "@/app/actions/serverActions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeFromWhitelistAction as removeFromWhitelist, removeFromAdminAction as removeFromAdmin, removeFromHiddenAction as removeFromHidden } from "@/app/actions/serverActions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {filterPeople,type AdminPerson} from "./filterPeople";
import styles from "@/components/community/Community.module.css";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import SearchBar from "./UserSearch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


// -----------------------------
// Dialog helpers
// -----------------------------

export function AddWhitelistDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();
    const [users, setUsers] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error", message: string, isLoading: boolean }>({ status: "success", message: "", isLoading: false });
    const [query, setQuery] = useState('');

    async function addToWhitelist() {
        setUploadStatus({ status: "success", message: "", isLoading: true });
        const resp = await addUsersToWhitelist(users);
        if (resp.status === "success") {
            router.refresh();
            setIsDialogOpen(false);
            setUsers([]);
        }
        setUploadStatus({ status: resp.status as "success" | "error", message: resp.message, isLoading: false });
    }

    function removeFromUsers(user: string) {
        setUsers(users.filter((u) => u !== user));
    }

    function setUserWithFilter(user: string) {
        setUsers([...users.filter((u) => u !== user), user]);
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-xs px-2 py-1 h-8">Add Whitelist</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Users to Whitelist</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Insert wallet address or username</p>
                <div className="space-y-4">
                    <SearchBar setUsers={(user:string) => setUserWithFilter(user)} query={query} setQuery={setQuery} />
                    <div>
                        {users.map((user) => <Button variant="outline" onClick={() => removeFromUsers(user)} key={user}>{user} <X className="w-4 h-4 ml-1" /></Button>)} 
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={() => addToWhitelist()}>Save changes {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="whyyyyy" /> : ""}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Dialog for adding users to admin role
export function AddAdminDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();
    const [users, setUsers] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error", message: string, isLoading: boolean }>({ status: "success", message: "", isLoading: false });
    const [query, setQuery] = useState('');

    async function addToAdmin() {
        setUploadStatus({ status: "success", message: "", isLoading: true });
        const resp = await addUsersToAdmin(users);
        if (resp.status === "success") {
            router.refresh();
            setIsDialogOpen(false);
            setUsers([]);
        }
        setUploadStatus({ status: resp.status as "success" | "error", message: resp.message, isLoading: false });
    }

    function removeFromUsers(user: string) {
        setUsers(users.filter((u) => u !== user));
    }

    function setUserWithFilter(user: string) {
        setUsers([...users.filter((u) => u !== user), user]);
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-xs px-2 py-1 h-8">Add Admin</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Users to Admin</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Insert wallet address or username</p>
                <div className="space-y-4">
                    <SearchBar setUsers={(user:string) => setUserWithFilter(user)} query={query} setQuery={setQuery} />
                    <div>
                        {users.map((user) => <Button variant="outline" onClick={() => removeFromUsers(user)} key={user}>{user} <X className="w-4 h-4 ml-1" /></Button>)} 
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={() => addToAdmin()}>Save changes {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="whyyyyy" /> : ""}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Dialog for adding users to hidden role
export function AddHiddenDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();
    const [users, setUsers] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error", message: string, isLoading: boolean }>({ status: "success", message: "", isLoading: false });
    const [query, setQuery] = useState('');

    async function addToHidden() {
        setUploadStatus({ status: "success", message: "", isLoading: true });
        const resp = await addUsersToHidden(users);
        if (resp.status === "success") {
            router.refresh();
            setIsDialogOpen(false);
            setUsers([]);
        }
        setUploadStatus({ status: resp.status as "success" | "error", message: resp.message, isLoading: false });
    }

    function removeFromUsers(user: string) {
        setUsers(users.filter((u) => u !== user));
    }

    function setUserWithFilter(user: string) {
        setUsers([...users.filter((u) => u !== user), user]);
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-xs px-2 py-1 h-8">Hide User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Hide Users from Leaderboards</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Insert wallet address or username</p>
                <div className="space-y-4">
                    <SearchBar setUsers={(user:string) => setUserWithFilter(user)} query={query} setQuery={setQuery} />
                    <div>
                        {users.map((user) => <Button variant="outline" onClick={() => removeFromUsers(user)} key={user}>{user} <X className="w-4 h-4 ml-1" /></Button>)} 
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={() => addToHidden()}>Save changes {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="whyyyyy" /> : ""}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Dialog to remove by search from hidden
export function RemoveHiddenDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();
    const [users, setUsers] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error", message: string, isLoading: boolean }>({ status: "success", message: "", isLoading: false });
    const [query, setQuery] = useState('');

    async function removeFromHiddenList() {
        setUploadStatus({ status: "success", message: "", isLoading: true });
        const resp = await removeFromHidden(users);
        router.refresh();
        setIsDialogOpen(false);
        setUsers([]);
        setUploadStatus({ status: "success", message: "", isLoading: false });
    }

    function removeFromUsers(user: string) {
        setUsers(users.filter((u) => u !== user));
    }

    function setUserWithFilter(user: string) {
        setUsers([...users.filter((u) => u !== user), user]);
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-xs px-2 py-1 h-8">Unhide User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Unhide Users from Leaderboards</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Insert wallet address or username</p>
                <div className="space-y-4">
                    <SearchBar setUsers={(user:string) => setUserWithFilter(user)} query={query} setQuery={setQuery} />
                    <div>
                        {users.map((user) => <Button variant="outline" onClick={() => removeFromUsers(user)} key={user}>{user} <X className="w-4 h-4 ml-1" /></Button>)} 
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={() => removeFromHiddenList()}>Save changes {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="whyyyyy" /> : ""}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Dialog to remove by search from whitelist
export function RemoveWhitelistDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();
    const [users, setUsers] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error", message: string, isLoading: boolean }>({ status: "success", message: "", isLoading: false });
    const [query, setQuery] = useState('');

    async function removeFromWhitelistBySearch() {
        setUploadStatus({ status: "success", message: "", isLoading: true });
        await removeFromWhitelist(users);
        setUploadStatus({ status: "success", message: "", isLoading: false });
        router.refresh();
        setIsDialogOpen(false);
        setUsers([]);
    }

    function removeFromUsers(user: string) { setUsers(users.filter((u) => u !== user)); }
    function setUserWithFilter(user: string) { setUsers([...users.filter((u) => u !== user), user]); }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-xs px-2 py-1 h-8">Remove Whitelist</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Remove Users from Whitelist</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Insert wallet address or username</p>
                <div className="space-y-4">
                    <SearchBar setUsers={(user:string)=>setUserWithFilter(user)} query={query} setQuery={setQuery} />
                    <div>{users.map((u)=><Button variant="outline" onClick={()=>removeFromUsers(u)} key={u}>{u} <X className="w-4 h-4 ml-1" /></Button>)}</div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={removeFromWhitelistBySearch}>Save changes {uploadStatus.isLoading && <img className="w-4 h-4" src="/spinner.svg" alt="loading"/>}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Dialog to remove by search from admin
export function RemoveAdminDialog() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();
    const [users, setUsers] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error", message: string, isLoading: boolean }>({ status: "success", message: "", isLoading: false });
    const [query, setQuery] = useState('');

    async function removeFromAdminBySearch() {
        setUploadStatus({ status: "success", message: "", isLoading: true });
        await removeFromAdmin(users);
        setUploadStatus({ status: "success", message: "", isLoading: false });
        router.refresh();
        setIsDialogOpen(false);
        setUsers([]);
    }
    function removeFromUsers(user: string) { setUsers(users.filter((u)=>u!==user)); }
    function setUserWithFilter(user: string) { setUsers([...users.filter((u)=>u!==user), user]); }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-xs px-2 py-1 h-8">Remove Admin</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Remove Users from Admin</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Insert wallet address or username</p>
                <div className="space-y-4">
                    <SearchBar setUsers={(user:string)=>setUserWithFilter(user)} query={query} setQuery={setQuery} />
                    <div>{users.map((u)=> <Button variant="outline" onClick={()=>removeFromUsers(u)} key={u}>{u} <X className="w-4 h-4 ml-1" /></Button>)}</div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={removeFromAdminBySearch}>Save changes {uploadStatus.isLoading && <img className="w-4 h-4" src="/spinner.svg" alt="loading"/>}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface DataTableProps<TData extends AdminPerson, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export default function UsersDataTable<TData extends AdminPerson, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const router = useRouter();
    const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error", message: string, isLoading: boolean }>({ status: "success", message: "", isLoading: false });
    // Search query is handled by `query` state below. No additional role checkboxes needed.
    const [roleFilter, setRoleFilter] = useState<string>("All");
    const [query, setQuery] = useState<string>("");
    const [visibility,setVisibility] = useState("All");

    useEffect(() => {
        setRowSelection({});
        setPagination(previous=>({...previous,pageIndex:0}));
    }, [roleFilter,query,visibility]);
    const filteredData = useMemo(()=>filterPeople(data,query,roleFilter,visibility),[data,query,roleFilter,visibility]);

    const table = useReactTable({
        data: filteredData,
        getRowId: row=>row.id,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination as any,
        state: {
            sorting,
            rowSelection,
            pagination,
        },
    });

    type TDataWithId = TData & { id: string };

    async function commitRemoveFromWhitelist() {
        const selectedUsers = table.getFilteredSelectedRowModel().rows.map((row) => row.original as TDataWithId).map((row) => row.id);
        setUploadStatus({ status: "success", message: "", isLoading: true });
        await removeFromWhitelist(selectedUsers);
        setUploadStatus({ status: "success", message: "", isLoading: false });
        router.refresh();
    }

    async function commitRemoveFromAdmin() {
        const selectedUsers = table.getFilteredSelectedRowModel().rows.map((row) => row.original as TDataWithId).map((row) => row.id);
        setUploadStatus({ status: "success", message: "", isLoading: true });
        await removeFromAdmin(selectedUsers);
        setUploadStatus({ status: "success", message: "", isLoading: false });
        router.refresh();
    }

    async function commitAddSelectedToWhitelist() {
        const wallets = table.getFilteredSelectedRowModel().rows.map((row)=> row.original as TDataWithId).map((row:any)=> row.wallet).filter(Boolean);
        setUploadStatus({ status: "success", message: "", isLoading: true });
        await addUsersToWhitelist(wallets);
        setUploadStatus({ status: "success", message: "", isLoading: false });
        router.refresh();
    }

    async function commitAddSelectedToAdmin() {
        const wallets = table.getFilteredSelectedRowModel().rows.map((row)=> row.original as TDataWithId).map((row:any)=> row.wallet).filter(Boolean);
        setUploadStatus({ status: "success", message: "", isLoading: true });
        await addUsersToAdmin(wallets);
        setUploadStatus({ status: "success", message: "", isLoading: false });
        router.refresh();
    }

    async function commitAddSelectedToHidden() {
        const wallets = table.getFilteredSelectedRowModel().rows.map((row)=> row.original as TDataWithId).map((row:any)=> row.wallet).filter(Boolean);
        setUploadStatus({ status: "success", message: "", isLoading: true });
        await addUsersToHidden(wallets);
        setUploadStatus({ status: "success", message: "", isLoading: false });
        router.refresh();
    }

    async function commitRemoveFromHidden() {
        const selectedUsers = table.getFilteredSelectedRowModel().rows.map((row) => row.original as TDataWithId).map((row) => row.id);
        setUploadStatus({ status: "success", message: "", isLoading: true });
        await removeFromHidden(selectedUsers);
        setUploadStatus({ status: "success", message: "", isLoading: false });
        router.refresh();
    }

    return (
        <div className={`${styles.mobileRecords} ${styles.peopleRecords} space-y-4`}>
            <div className="flex flex-col gap-4 w-full">
                <div className={styles.filterBar}>
                  <input type="search" aria-label="Search people" placeholder="Search username, email or wallet" value={query} onChange={event=>setQuery(event.target.value)}/>
                  <label>Role<select aria-label="Role" value={roleFilter} onChange={event=>setRoleFilter(event.target.value)}><option value="All">All roles</option><option value="Admin">Admins</option><option value="Whitelisted">Whitelisted</option><option value="User">Standard users</option></select></label>
                  <label>Leaderboard<select aria-label="Leaderboard visibility" value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="All">All visibility</option><option value="Visible">Visible</option><option value="Hidden">Hidden</option></select></label>
                </div>
                <div className={styles.filterSummary}><span>{filteredData.length} of {data.length} people</span>{(query || roleFilter!=="All" || visibility!=="All") && <button type="button" onClick={()=>{setQuery("");setRoleFilter("All");setVisibility("All");}}>Clear filters</button>}</div>
                <div className={styles.filterBar}><label>Sort by<select aria-label="People order" value={sorting[0]?.id === "role" ? "role" : sorting[0]?.desc ? "recent" : "oldest"} onChange={event=>setSorting([{id:event.target.value==="role"?"role":"updatedAt",desc:event.target.value==="recent"}])}><option value="recent">Recently updated</option><option value="oldest">Oldest updated</option><option value="role">Role</option></select></label></div>
                <label className="inline-flex items-center gap-2 text-sm"><Checkbox aria-label="Select people on this page" checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={value=>table.toggleAllPageRowsSelected(!!value)} disabled={!filteredData.length}/>Select this page{table.getFilteredSelectedRowModel().rows.length ? ` · ${table.getFilteredSelectedRowModel().rows.length} selected` : ""}</label>
                                {/* Button row */}
                <div className={`${styles.peopleActions} grid grid-cols-2 sm:grid-cols-3 gap-2 w-full`}>
                {Object.values(rowSelection).some(Boolean) ? (
                    <>
                        {/* Selected state buttons */}
                        <Button variant="outline" disabled={uploadStatus.isLoading} className="text-xs px-2 py-1 h-8" onClick={() => commitAddSelectedToWhitelist()}>
                            {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="loading" /> : "Add Selected Whitelist"}
                        </Button>
                        <Button variant="outline" disabled={uploadStatus.isLoading} className="text-xs px-2 py-1 h-8" onClick={() => commitRemoveFromWhitelist()}>
                            {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="loading" /> : "Remove Selected Whitelist"}
                        </Button>

                        {/* Admin selected buttons */}
                        <Button variant="outline" disabled={uploadStatus.isLoading} className="text-xs px-2 py-1 h-8" onClick={() => commitAddSelectedToAdmin()}>
                            {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="loading" /> : "Add Selected Admin"}
                        </Button>
                        <Button variant="outline" disabled={uploadStatus.isLoading} className="text-xs px-2 py-1 h-8" onClick={() => commitRemoveFromAdmin()}>
                            {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="loading" /> : "Remove Selected Admin"}
                        </Button>

                        {/* Hidden selected buttons */}
                        <Button variant="outline" disabled={uploadStatus.isLoading} className="text-xs px-2 py-1 h-8" onClick={() => commitAddSelectedToHidden()}>
                            {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="loading" /> : "Hide Selected"}
                        </Button>
                        <Button variant="outline" disabled={uploadStatus.isLoading} className="text-xs px-2 py-1 h-8" onClick={() => commitRemoveFromHidden()}>
                            {uploadStatus.isLoading ? <img className="w-4 h-4" src="/spinner.svg" alt="loading" /> : "Unhide Selected"}
                        </Button>
                    </>
                ) : (
                    <>
                        {/* Default state buttons */}
                        <AddWhitelistDialog />
                        <RemoveWhitelistDialog />
                        <AddAdminDialog />
                        <RemoveAdminDialog />
                        <AddHiddenDialog />
                        <RemoveHiddenDialog />
                    </>
                )}
                </div>
            </div>

            {uploadStatus.status === "error" && <p className="text-red-500">{uploadStatus.message}</p>}
            <div className="rounded-md border bg-card">
                <Table >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                // data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} data-column={cell.column.id}>
                                            <span className={styles.recordLabel}>{({wallet:"Wallet",email:"Email",username:"Username",role:"Role",updatedAt:"Updated"} as Record<string,string>)[cell.column.id]}</span>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {data.length ? "No people match these filters." : "No people yet."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {/* Pagination controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-2 gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page:</span>
                        <Select value={String(table.getState().pagination.pageSize)} onValueChange={(value)=> table.setPageSize(Number(value))}>
                            <SelectTrigger className="w-[80px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
                        Page {table.getState().pagination.pageIndex + 1} of {Math.max(1,table.getPageCount())}
                    </div>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
