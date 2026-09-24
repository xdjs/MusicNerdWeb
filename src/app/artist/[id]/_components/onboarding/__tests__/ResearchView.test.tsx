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
});
