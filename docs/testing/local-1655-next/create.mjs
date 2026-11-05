/** Copy tracked source into a separate restricted-route artifact; never modifies production configuration. */
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, "../../..");
const out = mkdtempSync("/tmp/mn-1655-next-");
for (const file of execFileSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean)) {
  if (!(
    /^(src\/|public\/)/.test(file) ||
    [
      "package.json",
      "tsconfig.json",
      "next-env.d.ts",
      "postcss.config.mjs",
      "postcss.config.js",
      "tailwind.config.ts",
      "tailwind.config.js",
    ].includes(file)
  ))
    continue;
  if (/(__tests__|\.test\.|\.spec\.)/.test(file)) continue;
  if (
    file.startsWith("src/app/") &&
    ((/\/(page|route)\.[jt]sx?$/.test(file) &&
      file !== "src/app/artist/[id]/page.tsx") ||
      /\/(sitemap|robots|manifest)\.[jt]s$/.test(file))
  )
    continue;
  mkdirSync(dirname(join(out, file)), { recursive: true });
  copyFileSync(join(root, file), join(out, file));
}
mkdirSync(join(out, "test-adapters"), { recursive: true });
for (const file of [
  "session.ts",
  "server-auth.ts",
  "client-auth.tsx",
  "privy.tsx",
  "database.ts",
  "music.ts",
  "analytics.tsx",
])
  copyFileSync(join(here, "adapters", file), join(out, "test-adapters", file));
// Next's TypeScript path resolver may resolve @/ imports before webpack aliases.
// Redirect only these copied artifact modules as well, covering relative imports.
writeFileSync(
  join(out, "src/server/auth.ts"),
  "export * from '../../test-adapters/server-auth';\n",
);
writeFileSync(
  join(out, "src/server/db/drizzle.ts"),
  "export * from '../../../test-adapters/database';\n",
);
writeFileSync(
  join(out, "src/server/utils/musicPlatform/index.ts"),
  "export * from '../../../../test-adapters/music';\n",
);
writeFileSync(
  join(out, "src/instrumentation.ts"),
  `export function onRequestError(error:unknown){const e=error as Error&{cause?:unknown};console.error('[synthetic Next request error]',e?.message,e?.stack,e?.cause);}`,
);
symlinkSync(join(root, "node_modules"), join(out, "node_modules"));
const aliases = {
  "@/server/auth$": "server-auth.ts",
  "next-auth/react$": "client-auth.tsx",
  "@privy-io/react-auth$": "privy.tsx",
  "@/server/db/drizzle$": "database.ts",
  "@/server/utils/musicPlatform$": "music.ts",
  "@vercel/analytics/next$": "analytics.tsx",
  "@vercel/analytics$": "analytics.tsx",
};
writeFileSync(
  join(out, "next.config.mjs"),
  `import path from 'node:path';\nconst aliases=${JSON.stringify(aliases)};\nexport default {env:{NEXT_PUBLIC_PRIVY_APP_ID:'local-synthetic-app',NEXT_PUBLIC_VERCEL_ENV:'preview',NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL:'http://127.0.0.1:43165'},webpack(config){for(const [key,value] of Object.entries(aliases))config.resolve.alias[key]=path.resolve('test-adapters',value);config.externals.push('pino-pretty','lokijs','encoding');return config;}};\n`,
);
writeFileSync(
  join(out, "synthetic-artifact.json"),
  JSON.stringify(
    {
      kind: "local-only-next-profile",
      source: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim(),
      aliases,
    },
    null,
    2,
  ),
);
console.log(out);
