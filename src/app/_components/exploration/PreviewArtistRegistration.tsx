"use client";
import { useContext, useEffect } from "react";
import IntentExplorer from "@/app/dev/intent-preview/IntentExplorer";
import {
  PreviewArtistContext,
  type PreviewArtistProps,
} from "./PreviewArtistContext";
/** Hand route data to the persistent shell; direct rendering remains a safe fallback. */
export default function PreviewArtistRegistration(props: PreviewArtistProps) {
  const register = useContext(PreviewArtistContext);
  useEffect(() => {
    register?.(props);
  }, [register, props]);
  return register ? null : <IntentExplorer {...props} />;
}
