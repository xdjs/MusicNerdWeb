"use client";
import UsersDataTable from "./whitelisted-data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminPerson } from "./filterPeople";
export default function UsersSection<TData extends AdminPerson,TValue>({columns,data}:{columns:ColumnDef<TData,TValue>[];data:TData[]}) {
 return <UsersDataTable columns={columns} data={data}/>;
}
