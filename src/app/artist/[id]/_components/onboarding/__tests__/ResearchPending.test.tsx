// @ts-nocheck
import { render, screen } from '@testing-library/react';
import ResearchPending from '../ResearchPending';
import { ResearchProgressContext } from '../ResearchProgressContext';

const stages = (state) => [{ group: 'platform-search', label: 'Finding your profiles', state }];
const withStages = (value, ui) => <ResearchProgressContext.Provider value={value}>{ui}</ResearchProgressContext.Provider>;

describe('ResearchPending', () => {
    it('shows just the section when no build is running', () => {
        render(<ResearchPending group="platform-search" label="finding your profiles…"><p>links</p></ResearchPending>);
        expect(screen.getByText('links')).toBeInTheDocument();
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('while its stage is waiting or running, shows a loading line above the section', () => {
        for (const state of ['pending', 'active']) {
            const { unmount } = render(withStages(stages(state), <ResearchPending group="platform-search" label="finding your profiles…"><p>links</p></ResearchPending>));
            expect(screen.getByRole('status')).toHaveTextContent('finding your profiles…');
            expect(screen.getByText('links')).toBeInTheDocument();
            unmount();
        }
    });

    it('with hideUntilDone, shows only the loading line until the stage is done', () => {
        render(withStages(stages('active'), <ResearchPending group="platform-search" label="writing your about…" hideUntilDone><p>about</p></ResearchPending>));
        expect(screen.getByRole('status')).toHaveTextContent('writing your about…');
        expect(screen.queryByText('about')).toBeNull();
    });

    it('once its stage is done, or has failed, shows just the section', () => {
        for (const state of ['done', 'error']) {
            const { unmount } = render(withStages(stages(state), <ResearchPending group="platform-search" label="finding your profiles…" hideUntilDone><p>links</p></ResearchPending>));
            expect(screen.getByText('links')).toBeInTheDocument();
            expect(screen.queryByRole('status')).toBeNull();
            unmount();
        }
    });

    it('ignores other stages', () => {
        render(withStages([{ group: 'source-search', label: 'x', state: 'active' }], <ResearchPending group="platform-search" label="finding your profiles…"><p>links</p></ResearchPending>));
        expect(screen.queryByRole('status')).toBeNull();
    });
});
