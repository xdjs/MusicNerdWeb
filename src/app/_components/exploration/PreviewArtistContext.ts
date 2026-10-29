import { createContext, type ComponentProps } from "react";
import type IntentExplorer from "@/app/dev/intent-preview/IntentExplorer";
export type PreviewArtistProps = ComponentProps<typeof IntentExplorer>;
export const PreviewArtistContext = createContext<
  ((props: PreviewArtistProps) => void) | null
>(null);
