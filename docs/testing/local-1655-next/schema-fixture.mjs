/** Local schema metadata only: no connection, row data, credentials or introspection. */
import { build } from "esbuild";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { isTable } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
const here = dirname(fileURLToPath(import.meta.url));
const compiled = await build({
  entryPoints: [resolve(here, "../../../src/server/db/schema.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  write: false,
});
const mod = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  createRequire(import.meta.url),
  mod,
  mod.exports,
);
const dialect = new PgDialect();
const tables = Object.values(mod.exports)
  .filter(isTable)
  .map((table) => {
    const c = getTableConfig(table);
    return {
      name: c.name,
      schema: c.schema || "public",
      columns: c.columns.map((column) => ({
        name: column.name,
        sqlType: column.getSQLType(),
        enumValues: column.enumValues || null,
        notNull: column.notNull,
        primary: column.primary,
        default:
          column.default === undefined
            ? null
            : column.default &&
                typeof column.default === "object" &&
                "queryChunks" in column.default
              ? { sql: dialect.sqlToQuery(column.default).sql }
              : { value: column.default },
      })),
    };
  })
  .filter((t) => t.schema === "public");
writeFileSync(
  resolve(here, "schema-fixture.json"),
  JSON.stringify(
    {
      purpose:
        "Synthetic test compatibility only; not a migration or live schema audit",
      tables,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ publicTables: tables.length }));
