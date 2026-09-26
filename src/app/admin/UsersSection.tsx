"use client";

import { useState, useMemo } from "react";
import UsersDataTable from "./whitelisted-data-table";
import { ColumnDef } from "@tanstack/react-table";

interface Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export default function UsersSection<TData, TValue>({ columns, data }: Props<TData, TValue>) {
  const [query, setQuery] = useState("");

  const filteredData = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((row: any) => {
      const wallet = (row.wallet ?? "").toLowerCase();
      const username = (row.username ?? "").toLowerCase();
      return wallet.includes(q) || username.includes(q);
    });
  }, [data, query]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{filteredData.length.toLocaleString()} people</p>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search people"
          placeholder="Search by username or wallet"
          className="border border-border bg-transparent rounded-full px-4 py-2 text-sm w-full sm:w-72 text-foreground"
        />
      </div>
      <UsersDataTable columns={columns} data={filteredData} />
    </div>
  );
} 