"use client"

import { ColumnDef } from "@tanstack/react-table";
import { UgcResearch, User } from "@/server/db/DbTypes";
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import WhitelistUserEditDialog from "./WhitelistUserEditDialog";

// Helper to format dates in local timezone without seconds
const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return "";

  // Normalise to a Date object first.
  let dateObj: Date;

  if (value instanceof Date) {
    dateObj = value;
  } else {
    const str = value as string;
    // If the string does NOT include an explicit timezone ("Z" or "+/-hh:mm"),
    // assume it is stored in UTC and append "Z" so the Date constructor parses
    // it as UTC instead of local time.
    const hasExplicitTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(str);
    dateObj = new Date(hasExplicitTZ ? str : `${str}Z`);
  }

  const datePart = dateObj.toLocaleDateString();
  const timePart = dateObj
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    // Replace the space before AM/PM with a non-breaking space
    .replace(/\s([AP]M)$/i, "\u00A0$1");

  return `${datePart} ${timePart}`;
};

export const ugcColumns: ColumnDef<UgcResearch & { wallet?: string | null; username?: string | null }>[] = [
  {
    id: "select",
    header: () => <span className="sr-only">Selection</span>,
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Artist",
    cell: ({ row }) => <span className="font-semibold">{row.original.artistId ? <a href={`/artist/${row.original.artistId}`} className="underline underline-offset-4" title={row.original.artistId}>{row.original.name || "Unknown artist"}</a> : row.original.name || "Unknown artist"}</span>,
  },
  {
    accessorKey: "ugcUrl",
    header: "Suggested link",
    cell: ({ row }) => <div className="min-w-40 max-w-60"><p className="text-xs text-muted-foreground mb-1">{row.original.siteName}</p><a href={row.original.ugcUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="block truncate underline underline-offset-4" title={row.original.ugcUrl ?? undefined}>{row.original.siteUsername || row.original.ugcUrl || "No link supplied"}</a></div>,
  },
  {
    accessorKey: "username",
    header: "Shared by",
    cell: ({ row }) => <span title={row.original.wallet ?? undefined}>{row.original.username || (row.original.wallet ? `${row.original.wallet.slice(0, 6)}…${row.original.wallet.slice(-4)}` : "Contributor")}</span>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <Button variant="ghost" className="px-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Submitted <ArrowUpDown className="ml-2 h-3 w-3" /></Button>,
    cell: ({ getValue }) => formatDate(getValue() as string | Date | null | undefined),
  },
  {
    accessorKey: "id",
    header: "Details",
    cell: ({ row }) => <details><summary className="cursor-pointer text-xs">IDs</summary><dl className="mt-2 text-xs"><dt>Submission</dt><dd className="select-all">{row.original.id}</dd><dt className="mt-2">Artist</dt><dd className="select-all">{row.original.artistId}</dd></dl></details>,
  },
];

export const whitelistedColumns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "wallet",
    header: "Wallet Address",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    id: "role",
    accessorFn: (row) => {
      const roles: string[] = [];
      if (row.isAdmin) roles.push("Admin");
      if (row.isWhiteListed) roles.push("Whitelisted");
      if (roles.length === 0) roles.push("User");
      if (row.isHidden) roles.push("Hidden");
      return roles.join(", ");
    },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Role
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: (rowA, rowB, columnId) => {
      // Priority: Admin (0) > Whitelisted (1) > User (2)
      // If both have admin, they're equal. If neither have admin, compare whitelist status.
      const getUserPriority = (row: any) => {
        if (row.original.isAdmin) return 0;
        if (row.original.isWhiteListed) return 1;
        return 2;
      };
      const a = getUserPriority(rowA);
      const b = getUserPriority(rowB);
      return a - b;
    },
    size: 150, // Expand column width to accommodate multiple roles
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Updated At
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue }) => formatDate(getValue() as string | Date | null | undefined),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original as User;
      return <WhitelistUserEditDialog user={user} />;
    },
    enableSorting: false,
  }
];
