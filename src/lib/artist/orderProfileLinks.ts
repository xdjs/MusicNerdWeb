import type { ProfileLink } from './artistProfileLinks';

export function orderProfileLinks(links: ProfileLink[], order: string[] = []): ProfileLink[] {
    const ranks = new Map(order.map((name, index) => [name, index]));
    return [...links].sort((a, b) => (ranks.get(a.siteName) ?? order.length) - (ranks.get(b.siteName) ?? order.length));
}

