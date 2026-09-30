/**
 * A URL on MusicNerdAPI (xdjs/MusicNerdAPI), which runs the research queue
 * since the #1365 cutover. `NEXT_PUBLIC_MUSICNERD_API_URL` is set per Vercel
 * environment: production for production, a staging MusicNerdAPI on the
 * staging database for previews and staging.
 *
 * @param path - The route, starting with `/`.
 * @returns The absolute URL.
 */
export function musicNerdApiUrl(path: string): string {
    return `${process.env.NEXT_PUBLIC_MUSICNERD_API_URL}${path}`;
}
