import { MUSICNERD_API_URL } from "./const";

/**
 * A URL on MusicNerdAPI (xdjs/MusicNerdAPI), which runs the research queue
 * since the #1365 cutover: production from a production deployment, staging
 * from everywhere else (`MUSICNERD_API_URL`).
 *
 * @param path - The route, starting with `/`.
 * @returns The absolute URL.
 */
export function musicNerdApiUrl(path: string): string {
    return `${MUSICNERD_API_URL}${path}`;
}
