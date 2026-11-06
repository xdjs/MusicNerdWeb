import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
/** Build-only adapters. Not imported or enabled by any production entrypoint. */
export async function buildBrowserHarness(outfile) {
  const adapters = {
    "@privy-io/react-auth": `export async function getAccessToken(){return 'local-synthetic'}`,
    "next/navigation": `export const useRouter=()=>({refresh(){},push(){}});`,
    "@/hooks/use-toast": `export function useToast(){return {toast(value){document.getElementById('toast').textContent=[value.title,value.description].filter(Boolean).join(': ')}}}`,
    "./BioVersionHistory": `import {useEffect} from 'react';export default function History({onPinnedChange}){useEffect(()=>onPinnedChange(false),[onPinnedChange]);return null}`,
    "./BioCorrectionDialog": `export default function Correction(){return null}`,
  };
  await build({
    entryPoints: [resolve(here, "entry.tsx")],
    outfile,
    bundle: true,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"test"',
      "process.env.NEXT_PUBLIC_VERCEL_ENV": '"preview"',
      "process.env.NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL":
        '"http://127.0.0.1:43165"',
    },
    plugins: [
      {
        name: "isolated-test-adapters",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (args) =>
            args.path in adapters
              ? { path: args.path, namespace: "adapter" }
              : undefined,
          );
          b.onLoad({ filter: /.*/, namespace: "adapter" }, (args) => ({
            contents: adapters[args.path],
            loader: "js",
            resolveDir: root,
          }));
          b.onResolve({ filter: /^@\// }, (args) => ({
            path:
              resolve(root, "src", args.path.slice(2)) +
              "." +
              (args.path.includes("/components/ui/")
                ? "tsx"
                : args.path.endsWith("EditModeContext")
                  ? "tsx"
                  : "ts"),
          }));
        },
      },
    ],
  });
}
