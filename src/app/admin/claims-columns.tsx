"use client"

import { ColumnDef } from "@tanstack/react-table";

export interface PendingClaimRow {
    id: string;
    referenceCode: string | null;
    artistName: string;
    artistInstagram: string | null;
    userEmail: string | null;
    userName: string | null;
    createdAt: string;
}

const formatDate = (value: string | null | undefined): string => {
    if (!value) return "";
    const hasExplicitTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
    const dateObj = new Date(hasExplicitTZ ? value : `${value}Z`);
    const datePart = dateObj.toLocaleDateString();
    const timePart = dateObj
        .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
        .replace(/\s([AP]M)$/i, "\u00A0$1");
    return `${datePart} ${timePart}`;
};

export const claimsColumns: ColumnDef<PendingClaimRow>[] = [
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
            <span className="text-sm">{formatDate(row.original.createdAt)}</span>
        ),
    },
];
