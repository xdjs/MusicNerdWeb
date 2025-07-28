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
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Users</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or wallet"
          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-56 text-black"
        />
      </div>
      <UsersDataTable columns={columns} data={filteredData} />
    </div>
  );
} 