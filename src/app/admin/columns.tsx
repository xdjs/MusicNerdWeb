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
    accessorKey: "username",
    header: "Username",
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
    accessorKey: "name",
    header: "Artist Name",
  },
  // Updated At column intentionally omitted from UI
  {
    accessorKey: "siteName",
    header: "Site Name",
  },
  {
    accessorKey: "ugcUrl",
    header: "UGC URL",
    cell: ({ getValue }) => {
      const url = getValue() as string | null | undefined;
      if (!url) return "";
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {url}
        </a>
      );
    },
  },
  {
    accessorKey: "siteUsername",
    header: "Site Username",
  },
  {
    accessorKey: "artistId",
    header: "Artist ID",
    cell: ({ getValue }) => {
      const id = getValue() as string | null | undefined;
      if (!id) return "";
      const href = `https://musicnerd.xyz/${id}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {id}
        </a>
      );
    },
  },
  // Date Processed column intentionally omitted from UI
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
    accessorFn: (row) => {
      const roles: string[] = [];
      if (row.isAdmin) roles.push("Admin");
      if (row.isWhiteListed) roles.push("Whitelisted");
      if (roles.length === 0) roles.push("User");
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
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original as User;
      return <WhitelistUserEditDialog user={user} />;
    },
    enableSorting: false,
  }
];
