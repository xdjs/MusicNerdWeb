// @ts-nocheck
import { render, screen, fireEvent } from '@testing-library/react';
import ResearchView from '../ResearchView';

const progress = (group, text, done) => ({ kind: 'progress', group, text, done });
const writing = (stage, text) => ({ kind: 'writing', stage, text });
const base = { artistName: 'Bio Ritmo', imageUrl: 'https://img/artist.jpg', onSkip: jest.fn(), onFinish: jest.fn(), onRetry: jest.fn() };

describe('ResearchView', () => {
    it('takes over the page with the artist, the three stages, and a way to skip', () => {
        const onSkip = jest.fn();
        render(<ResearchView {...base} onSkip={onSkip} items={[]} complete={false} />);
        expect(screen.getByRole('heading', { level: 1, name: 'Bio Ritmo' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Bio Ritmo' })).toHaveAttribute('src', 'https://img/artist.jpg');
        expect(screen.getByText(/setting up your page/i)).toBeInTheDocument();
        const stages = screen.getByRole('list', { name: /research steps/i });
        expect(stages.querySelectorAll(':scope > li')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));
        expect(onSkip).toHaveBeenCalled();
    });

    it('shows each finished stage with its count and the running stage as current', () => {
        render(<ResearchView {...base} complete={false} items={[
            progress('platform-search', 'Found 7 profiles', true),
            progress('source-search', 'Read 17 sources', true),
            progress('about-write', 'Writing your About', false),
        ]} />);
        expect(screen.getByText('Found 7 profiles')).toBeInTheDocument();
        expect(screen.getByText('Read 17 sources')).toBeInTheDocument();
        expect(screen.getByText('Writing your About').closest('li')).toHaveAttribute('aria-current', 'step');
    });

    it('renders the Lore document and About as they stream, under the About stage', async () => {
        render(<ResearchView {...base} complete={false} items={[
            progress('about-write', 'Writing your About', false),
            writing('doc', '## overview\nBio Ritmo is a salsa band [1].'),
            writing('about', 'Bio Ritmo, also known as the Salsa Machine'),
        ]} />);
        const lore = await screen.findByRole('region', { name: 'Lore document' });
        expect(screen.getByText('Writing your About').closest('li')).toContainElement(lore);
        expect(lore).toHaveTextContent('Bio Ritmo is a salsa band');
        expect(await screen.findByRole('region', { name: 'About' })).toHaveTextContent('the Salsa Machine');
    });

    it('keeps a failed build in the view: the failed stage, its partial draft, and try again', async () => {
        const onRetry = jest.fn();
        render(<ResearchView {...base} onRetry={onRetry} complete={false} items={[
            progress('platform-search', 'Found 7 profiles', true),
            progress('source-search', 'Read 17 sources', true),
            progress('about-write', 'Writing your About', false),
            writing('doc', '## overview\nBio Ritmo is a'),
            { kind: 'error', text: 'Could not publish your About and Lore. Please try again; your saved bio is safe.' },
        ]} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Could not publish your About and Lore.');
        expect(await screen.findByRole('region', { name: 'Lore document' })).toHaveTextContent('Bio Ritmo is a');
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
        expect(onRetry).toHaveBeenCalled();
    });

    it('shows the profiles the build found as cards under their stage, with the refused-platforms sentence', () => {
        const profile = (siteName, value) => ({ siteName, displayName: siteName, value, profileUrl: null, logoUrl: null, previewImage: null });
        render(<ResearchView {...base} complete={false} items={[
            progress('platform-search', 'Finding your profiles', false),
            { kind: 'candidates', candidates: [profile('spotify', 'Bio Ritmo'), profile('youtube', 'bioritmo')] },
            { kind: 'unreachable', platforms: ['Instagram'] },
        ]} />);
        const stage = screen.getByText('Finding your profiles').closest('li');
        const cards = screen.getByRole('list', { name: /your profiles/i });
        expect(stage).toContainElement(cards);
        expect(cards.querySelectorAll(':scope > li')).toHaveLength(2);
        expect(stage).toHaveTextContent('instagram wouldn’t let us look just now');
    });

    it('counts the profiles it shows, not what discovery proposed', () => {
        // On the #1358 preview discovery proposed 8 and the build wrote 7: the
        // label said "Found 8 profiles" above seven cards.
        const profile = (siteName) => ({ siteName, displayName: siteName, value: 'bio', profileUrl: null, logoUrl: null, previewImage: null });
        const { rerender } = render(<ResearchView {...base} complete={false} items={[
            progress('platform-search', 'Found 8 profiles', true),
            { kind: 'linked', candidates: [profile('spotify'), profile('youtube')] },
        ]} />);
        expect(screen.getByRole('button', { name: 'Found 2 profiles' })).toBeInTheDocument();
        rerender(<ResearchView {...base} complete={false} items={[
            progress('platform-search', 'Found 8 profiles', true),
            { kind: 'linked', candidates: [profile('spotify')] },
        ]} />);
        expect(screen.getByRole('button', { name: 'Found 1 profile' })).toBeInTheDocument();
    });

    it('once the page is ready, collapses the profiles to a summary that opens again', () => {
        const profile = (siteName) => ({ siteName, displayName: siteName, value: 'bio', profileUrl: null, logoUrl: null, previewImage: null });
        render(<ResearchView {...base} complete items={[
            progress('platform-search', 'Found 2 profiles', true),
            { kind: 'linked', candidates: [profile('spotify'), profile('youtube')] },
            progress('source-search', 'Read 17 sources', true),
            progress('about-write', 'Wrote your About', true),
            { kind: 'complete' },
        ]} />);
        expect(screen.queryByRole('list', { name: /your profiles/i })).toBeNull();
        expect(screen.getByText('spotify and youtube')).toBeInTheDocument();
        const toggle = screen.getByRole('button', { name: 'Found 2 profiles' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('list', { name: /your profiles/i })).toBeInTheDocument();
    });

    it('shows each source as it is saved under its stage, then the total once the stage ends', () => {
        const src = (n, ogImage = null) => ({ title: `Story ${n}`, url: `https://site${n}.com/a`, ogImage });
        const { rerender } = render(<ResearchView {...base} complete={false} items={[
            progress('source-search', "Reading what's written about you", false),
            { kind: 'source', saved: [src(1, 'https://img/1.jpg')] },
            { kind: 'source', saved: [src(2)] },
        ]} />);
        const stage = screen.getByText('Reading what people wrote about you').closest('li');
        expect(stage).toContainElement(screen.getByRole('list', { name: /sources with images/i }));
        expect(stage).toHaveTextContent('Story 2');
        expect(stage).not.toHaveTextContent('in all');
        rerender(<ResearchView {...base} complete={false} items={[
            progress('source-search', 'Read 2 sources', true),
            { kind: 'source', saved: [src(1, 'https://img/1.jpg')] },
            { kind: 'source', saved: [src(2)] },
            { kind: 'sources', saved: [src(1, 'https://img/1.jpg'), src(2), src(3)] },
        ]} />);
        expect(screen.getByText('Read 2 sources').closest('li')).toHaveTextContent('3 sources in all.');
    });

    it('once the page is ready, collapses the sources to their domains', () => {
        const src = (n) => ({ title: `Story ${n}`, url: `https://site${n}.com/a`, ogImage: null });
        render(<ResearchView {...base} complete items={[
            progress('source-search', 'Read 2 sources', true),
            { kind: 'sources', saved: [src(1), src(2)] },
            { kind: 'complete' },
        ]} />);
        expect(screen.getByText('site1.com and site2.com')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Read 2 sources' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('hands off when complete, and stops offering skip', () => {
        const onFinish = jest.fn();
        render(<ResearchView {...base} onFinish={onFinish} complete items={[
            progress('platform-search', 'Found 7 profiles', true),
            progress('source-search', 'Read 17 sources', true),
            progress('about-write', 'Wrote your About', true),
        ]} />);
        expect(screen.getByText(/your page is ready/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /skip for now/i })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /see my page/i }));
        expect(onFinish).toHaveBeenCalled();
    });

    it('sits in the page flow under the app\'s own nav: a section named by the artist, no header or landmark of its own', () => {
        const { container } = render(<ResearchView {...base} items={[]} complete={false} />);
        const view = screen.getByRole('region', { name: 'Bio Ritmo' });
        expect(container.firstElementChild).toBe(view);
        expect(view.className).not.toMatch(/(^|\s)(fixed|absolute)(\s|$)/);
        expect(view.querySelector('header, main, nav')).toBeNull();
        expect(screen.queryByText('music nerd')).toBeNull();
        // In the page flow it inherits the body's colour, which globals.css leaves
        // black in dark mode, so the view sets the token itself.
        expect(view).toHaveClass('text-foreground');
    });

    it('sizes its heading and photo fluidly, so it grows with the window', () => {
        render(<ResearchView {...base} items={[]} complete={false} />);
        expect(screen.getByRole('heading', { level: 1 }).className).toContain('clamp(');
        expect(screen.getByRole('img', { name: 'Bio Ritmo' }).className).toContain('clamp(');
    });

    it('mutes secondary text through the token itself, which the dark-mode override wall does not reach', () => {
        render(<ResearchView {...base} items={[]} complete={false} />);
        const sub = screen.getByText(/we’re reading what the web knows about you/);
        expect(sub.className).toContain('text-[hsl(var(--muted-foreground))]');
        expect(sub.className).not.toMatch(/(^|\s)text-muted-foreground(\s|$)/);
    });
});
