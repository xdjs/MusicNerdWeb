"use client"

import { useState } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { approveClaimAction, rejectClaimAction, revokeClaimAction } from "@/app/actions/adminClaimActions";
import type { ClaimRow } from "./claims-columns";

interface ClaimsDataTableProps {
    columns: ColumnDef<ClaimRow>[];
    data: ClaimRow[];
}

export default function ClaimsDataTable({ columns, data }: ClaimsDataTableProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const filteredData = statusFilter
        ? data.filter(c => c.status === statusFilter)
        : data;

    const pendingCount = data.filter(c => c.status === "pending").length;
    const approvedCount = data.filter(c => c.status === "approved").length;
    const rejectedCount = data.filter(c => c.status === "rejected").length;

    const allColumns: ColumnDef<ClaimRow>[] = [
        ...columns,
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const claim = row.original;
                const isLoading = loadingId === claim.id;

                if (claim.status === "pending") {
                    return (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleApprove(claim.id)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2"
                            >
                                Approve
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={isLoading}
                                onClick={() => handleReject(claim.id)}
                                className="text-xs h-7 px-2"
                            >
                                Reject
                            </Button>
                        </div>
                    );
                }

                if (claim.status === "approved") {
                    return (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleRevoke(claim.id)}
                            className="text-xs h-7 px-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                        >
                            Revoke
                        </Button>
                    );
                }

                return <span className="text-xs text-muted-foreground">—</span>;
            },
        },
    ];

    const table = useReactTable({
        data: filteredData,
        columns: allColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    const handleAction = async (action: () => Promise<{ success: boolean; error?: string }>, claimId: string, label: string) => {
        setLoadingId(claimId);
        try {
            const result = await action();
            if (result.success) {
                toast({ title: `Claim ${label}` });
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: `Failed to ${label.toLowerCase()} claim`, variant: "destructive" });
        } finally {
            setLoadingId(null);
        }
    };

    const handleApprove = (id: string) => handleAction(() => approveClaimAction(id), id, "approved");
    const handleReject = (id: string) => handleAction(() => rejectClaimAction(id), id, "rejected");
    const handleRevoke = (id: string) => handleAction(() => revokeClaimAction(id), id, "revoked");

    return (
        <div className="space-y-3">
            {/* Status filter chips — all always visible for consistent layout */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setStatusFilter(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        statusFilter === null
                            ? "bg-pastypink text-white"
                            : "glass-subtle text-muted-foreground hover:text-foreground"
                    }`}
                >
                    All ({data.length})
                </button>
                <button
                    onClick={() => setStatusFilter("pending")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        statusFilter === "pending"
                            ? "bg-amber-500 text-white"
                            : "glass-subtle text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Pending ({pendingCount})
                </button>
                <button
                    onClick={() => setStatusFilter("approved")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        statusFilter === "approved"
                            ? "bg-green-600 text-white"
                            : "glass-subtle text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Approved ({approvedCount})
                </button>
                <button
                    onClick={() => setStatusFilter("rejected")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        statusFilter === "rejected"
                            ? "bg-red-500 text-white"
                            : "glass-subtle text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Rejected ({rejectedCount})
                </button>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={allColumns.length} className="h-24 text-center">
                                    No claims found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
