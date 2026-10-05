export type LinkSection = 'links' | 'support';
export type ArtistLinkOrder = Partial<Record<LinkSection, string[]>>;
export interface ProfileLink {
    siteName: string;
    href: string;
    label: string;
    iconSrc: string;
}

// Compatibility exports; each implementation has one responsibility.
export { orderProfileLinks } from './orderProfileLinks';
export { getProfileLinks } from './getProfileLinks';
export { getListeningLinks } from './getListeningLinks';
