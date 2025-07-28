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
  const dateObj = value instanceof Date ? value : new Date(value);
  const datePart = dateObj.toLocaleDateString();
  const timePart = dateObj
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    // Replace the regular space between minutes and AM/PM with a non-breaking space
    .replace(/\s([AP]M)$/i, "\u00A0$1");
  return `${datePart} ${timePart}`;
};

export const ugcColumns: ColumnDef<UgcResearch>[] = [
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
    accessorKey: "id",
    header: "UGC ID",
  },
  {
    accessorKey: "wallet",
    header: "Wallet Address",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ getValue }) => formatDate(getValue() as string | Date | null | undefined),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ getValue }) => formatDate(getValue() as string | Date | null | undefined),
  },
  {
    accessorKey: "siteName",
    header: "Site Name",
  },
  {
    accessorKey: "accepted",
    header: "Status",
    cell: ({ getValue }) => {
      const accepted = getValue() as boolean | null | undefined;
      return (
        <span className={`font-semibold ${accepted ? "text-green-600" : "text-yellow-600"}`}>
          {accepted ? "Approved" : "Pending"}
        </span>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) ? 0 : 1; // approved first
      const b = rowB.getValue(columnId) ? 0 : 1;
      return a - b;
    },
  },
  {
    accessorKey: "ugcUrl",
    header: "UGC URL",
  },
  {
    accessorKey: "siteUsername",
    header: "Site Username",
  },
  {
    accessorKey: "artistId",
    header: "Artist ID",
  },
  {
    accessorKey: "dateProcessed",
    header: "Date Processed",
    cell: ({ getValue }) => formatDate(getValue() as string | Date | null | undefined),
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
    id: "role",
    accessorFn: (row) => (row.isAdmin ? "Admin" : row.isWhiteListed ? "Whitelisted" : "User"),
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
      const order: Record<string, number> = {
        "Admin": 0,
        "Whitelisted": 1,
        "User": 2,
      };
      const a = order[rowA.getValue(columnId) as string] ?? 99;
      const b = order[rowB.getValue(columnId) as string] ?? 99;
      return a - b;
    },
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
