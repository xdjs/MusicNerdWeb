"use client";

import { createContext } from "react";
import type { StageView } from "@/lib/onboarding/buildStages";

/** The build's stages while research paints the profile in place
 *  (docs/research-view.md, "In place"); null when no build is running. */
export const ResearchProgressContext = createContext<StageView[] | null>(null);
