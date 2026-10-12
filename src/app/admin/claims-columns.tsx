"use client"

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { formatClaimDate } from "@/lib/claims/formatClaimDate";

export interface ClaimRow {
    id: string;
    status: "pending" | "approved" | "rejected";
    referenceCode: string | null;
    artistName: string;
    artistId: string;
    artistInstagram: string | null;
    userEmail: string | null;
    userName: string | null;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    approved: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export const claimsColumns: ColumnDef<ClaimRow>[] = [
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[row.original.status] ?? ""}`}>
                {row.original.status}
            </span>
        ),
    },
    {
        accessorKey: "referenceCode",
        header: "Ref Code",
        cell: ({ row }) => (
            <span className="font-mono font-bold text-sm">
                {row.original.referenceCode ?? "—"}
            </span>
        ),
    },
    {
        accessorKey: "artistName",
        header: "Artist",
        cell: ({ row }) => (
            <Link
                href={`/artist/${row.original.artistId}`}
                className="text-pastypink hover:underline text-sm"
            >
                {row.original.artistName}
            </Link>
        ),
    },
    {
        accessorKey: "artistInstagram",
        header: "Artist IG",
        cell: ({ row }) => {
            const ig = row.original.artistInstagram;
            if (!ig) return <span className="text-muted-foreground text-xs">Not set</span>;
            return (
                <a
                    href={`https://instagram.com/${ig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pastypink hover:underline text-sm"
                >
                    @{ig}
                </a>
            );
        },
    },
    {
        accessorKey: "userEmail",
        header: "User",
        cell: ({ row }) => (
            <span className="text-sm">
                {row.original.userName || row.original.userEmail || "Unknown"}
            </span>
        ),
    },
    {
        accessorKey: "createdAt",
        header: "Submitted",
        cell: ({ row }) => (
            <span className="text-sm">{formatClaimDate(row.original.createdAt)}</span>
        ),
    },
];
