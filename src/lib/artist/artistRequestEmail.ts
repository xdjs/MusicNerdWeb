/** Preparing this draft never sends email or creates an artist. */
export function artistRequestEmail(name: string, links: string) {
  const address = 'info@xdjs.com';
  const artist = name.trim();
  const subject = `Music Nerd artist request${artist ? `: ${artist}` : ''}`;
  const body = `Hi Music Nerd,\n\nI couldn't find this artist in Music Nerd's Spotify or Deezer lookup. Please review these links for a possible artist profile.\n\nArtist name: ${artist || '[Artist name]'}\n\nMusic and profile links:\n${links.trim() || '[Add public links, such as Bandcamp, Subvert, an official website or social profiles]'}\n\nThanks for reviewing this request.`;
  return {address, href: `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, copyText: `To: ${address}\nSubject: ${subject}\n\n${body}`};
}
