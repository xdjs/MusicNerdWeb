import { z } from "zod";
import type { KnowledgeToolConfig } from "./types";
/** Validate and capture trusted host scope before any credential is obtained. */
export function validateInterviewApiScope(
  config: KnowledgeToolConfig,
): KnowledgeToolConfig {
  const origin = new URL(config.apiOrigin);
  if (
    origin.pathname !== "/" ||
    origin.username ||
    origin.password ||
    origin.hash ||
    origin.search ||
    !(
      origin.protocol === "https:" ||
      (origin.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
    ) ||
    !z.string().uuid().safeParse(config.artistId).success
  )
    throw new Error("Invalid Music Nerd API scope");
  if (
    config.timeoutMs !== undefined &&
    (!Number.isInteger(config.timeoutMs) ||
      config.timeoutMs < 100 ||
      config.timeoutMs > 60000)
  )
    throw new Error("Invalid Music Nerd API deadline");
  return { ...config, apiOrigin: origin.origin };
}
