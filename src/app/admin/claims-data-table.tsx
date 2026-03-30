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
import { approveClaimAction, rejectClaimAction } from "@/app/actions/adminClaimActions";
import type { PendingClaimRow } from "./claims-columns";

interface ClaimsDataTableProps {
    columns: ColumnDef<PendingClaimRow>[];
    data: PendingClaimRow[];
}

export default function ClaimsDataTable({ columns, data }: ClaimsDataTableProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const allColumns: ColumnDef<PendingClaimRow>[] = [
        ...columns,
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const claimId = row.original.id;
                const isLoading = loadingId === claimId;
                return (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleApprove(claimId)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-2"
                        >
                            {isLoading ? "..." : "Approve"}
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            disabled={isLoading}
                            onClick={() => handleReject(claimId)}
                            className="text-xs h-7 px-2"
                        >
                            Reject
                        </Button>
                    </div>
                );
            },
        },
    ];

    const table = useReactTable({
        data,
        columns: allColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    const handleApprove = async (claimId: string) => {
        setLoadingId(claimId);
        try {
            const result = await approveClaimAction(claimId);
            if (result.success) {
                toast({ title: "Claim approved" });
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to approve claim", variant: "destructive" });
        } finally {
            setLoadingId(null);
        }
    };

    const handleReject = async (claimId: string) => {
        setLoadingId(claimId);
        try {
            const result = await rejectClaimAction(claimId);
            if (result.success) {
                toast({ title: "Claim rejected" });
                router.refresh();
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to reject claim", variant: "destructive" });
        } finally {
            setLoadingId(null);
        }
    };

    return (
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
                                No pending claims.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
