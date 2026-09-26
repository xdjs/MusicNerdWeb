"use client"

import {
    ColumnDef,
    SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";

import { approveUgcAdminAction as approveUgcAdmin } from "@/app/actions/serverActions";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useMemo, useRef, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import styles from "@/components/community/Community.module.css"

interface DataTableProps<TData extends { id: string; name?: string | null }, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    onApprove?: typeof approveUgcAdmin
}

export default function UGCDataTable<TData extends { id: string; name?: string | null }, TValue>({
    columns,
    data,
    onApprove = approveUgcAdmin,
}: DataTableProps<TData, TValue>) {
    const router = useRouter();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [uploadStatus, setUploadStatus] = useState<{ status: "success" | "error", message: string, isLoading: boolean }>({ status: "success", message: "", isLoading: false });
    const inFlight = useRef(false);
    const [activeIds, setActiveIds] = useState<string[]>([]);
    const [approvedIds, setApprovedIds] = useState<Set<string>>(() => new Set());
    const pendingData = useMemo(() => data.filter(row => !approvedIds.has(row.id)), [data, approvedIds]);
    const table = useReactTable({
        data: pendingData,
        getRowId: row => row.id,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            rowSelection,
        },
    })

    async function approve(ids: string[]) {
        if (!ids.length || inFlight.current) return;
        inFlight.current = true;
        setActiveIds(ids);
        setUploadStatus({ status: "success", message: "", isLoading: true });
        try {
            const response = await onApprove(ids);
            if (response.status === "success") {
                setApprovedIds(previous => new Set([...previous, ...ids]));
                setRowSelection(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !ids.includes(id))));
                setUploadStatus({status: "success", message: ids.length === 1 ? "Submission approved." : `${ids.length} submissions approved.`, isLoading: false});
            } else {
                setUploadStatus({status: "error", message: response.message, isLoading: false});
            }
            // A bulk response can include partial success; reconcile the queue in either case.
            window.dispatchEvent(new Event("pendingUGCUpdated"));
            router.refresh();
        } catch {
            setUploadStatus({status: "error", message: "Approval couldn’t be confirmed. Refresh the queue before retrying.", isLoading: false});
        } finally {
            inFlight.current = false;
            setActiveIds([]);
        }
    }

    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);

    return (
        <div className={`${styles.ugcReview} space-y-4`}>
            <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox aria-label="Select all" disabled={uploadStatus.isLoading || !pendingData.length}
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)} />
                Select all
            </label>
            <Button variant="outline" onClick={() => void approve(selectedIds)} disabled={uploadStatus.isLoading || !selectedIds.length} className="w-fit rounded-full">
                {`Approve selected${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
            </Button>
            <select aria-label="Submission order" className="sm:hidden rounded-full border border-border bg-transparent px-3 py-2 text-xs text-foreground"
                value={sorting[0]?.id === "createdAt" ? (sorting[0].desc ? "newest" : "oldest") : "default"}
                onChange={event => setSorting(event.target.value === "default" ? [] : [{id: "createdAt", desc: event.target.value === "newest"}])}>
                <option value="default">Submission order</option><option value="oldest">Oldest first</option><option value="newest">Newest first</option>
            </select>
            </div>
            {uploadStatus.message && <p role={uploadStatus.status === "error" ? "alert" : "status"} className={uploadStatus.status === "error" ? "text-sm text-red-600 dark:text-red-400" : "text-sm text-muted-foreground"}>{uploadStatus.message}{uploadStatus.status === "error" && <button type="button" className="ml-2 underline underline-offset-4" onClick={() => router.refresh()}>Refresh queue</button>}</p>}
            <div className="rounded-md border bg-card">
                <Table>
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
                                <TableHead className={styles.approvalCell}>Review</TableHead>
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() ? "selected" : undefined}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} data-column={cell.column.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                    <TableCell className={styles.approvalCell} data-column="review">
                                        <Button type="button" variant="outline" size="sm" className={styles.approveButton}
                                            aria-label={`Approve ${row.original.name || row.original.id} submission`}
                                            disabled={uploadStatus.isLoading}
                                            onClick={() => void approve([row.original.id])}>
                                            {activeIds.includes(row.original.id) ? <><Loader2 size={14} className="mr-1.5 motion-safe:animate-spin" aria-hidden="true"/>Approving…</> : <><Check size={14} className="mr-1.5" aria-hidden="true"/>Approve</>}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                                    All caught up. New link submissions will appear here.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
