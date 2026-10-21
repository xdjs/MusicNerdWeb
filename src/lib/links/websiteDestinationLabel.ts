/** Put the distinguishing part first so separate pages remain recognizable in narrow grids. */
export function websiteDestinationLabel(href: string): string {
  const url = new URL(href);
  const host = url.host.replace(/^www\./, '');
  const page = `${url.pathname === '/' ? '' : url.pathname}${url.search}${url.hash}`;
  return page ? `${page} · ${host}` : host;
}
