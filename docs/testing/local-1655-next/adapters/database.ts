import { Pool } from "pg";
import { createDatabase } from "@/server/db/createDatabase";
const socket = process.env.MN_1655_PG_SOCKET;
if (socket && !/^\/(?:private\/)?tmp\/mn-1655-pg\.[A-Za-z0-9]+$/.test(socket))
  throw Error("Only an owned synthetic socket is allowed");
// Build has no socket and no database access. Runtime must supply the native fixture socket.
const pool = new Pool({
  host: socket || "/tmp/mn-1655-no-database",
  port: 55465,
  database: "mn_1655_synthetic",
  user: "mnweb",
  password: "",
  max: 3,
  connectionTimeoutMillis: 1000,
});
pool.on("error", () => {});
export const db = createDatabase(pool);
