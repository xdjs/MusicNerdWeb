"use client"

import { ColumnDef } from "@tanstack/react-table";
import type { AdminUser } from "@/lib/admin/adminReadTypes";
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import styles from "@/components/community/Community.module.css";

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

export const whitelistedColumns: ColumnDef<AdminUser>[] = [
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
    accessorKey: "username",
    header: "Person",
    cell: ({ row }) => (
      <>
        <div className={styles.personIdentity}>
          <span>{row.original.username || row.original.email || "Unnamed contributor"}</span>
          <a
            href={`/admin/contributions?userId=${row.original.id}&status=all`}
            className={styles.personContributions}
          >
            View contributions
          </a>
        </div>
        <details className={styles.personDetails}>
          <summary>Contact and account details</summary>
          <dl>
            <dt>Email</dt><dd>{row.original.email || "Not provided"}</dd>
            <dt>Wallet</dt><dd>{row.original.wallet || "Not linked"}</dd>
            <dt>Updated</dt><dd>{formatDate(row.original.updatedAt)}</dd>
          </dl>
        </details>
      </>
    ),
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
        Updated
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue }) => formatDate(getValue() as string | Date | null | undefined),
  },
];
