// @ts-nocheck
import { renderHook } from '@testing-library/react';

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), refresh: mockRefresh }),
    usePathname: () => '',
    useSearchParams: () => new URLSearchParams(),
}));

import { useStageRefresh } from '../useStageRefresh';

const progress = (group, done) => ({ kind: 'progress', group, done, text: group });

describe('useStageRefresh', () => {
    beforeEach(() => jest.clearAllMocks());

    it('refreshes the page once each time a stage reports done', () => {
        const onComplete = jest.fn();
        const { rerender } = renderHook(({ items }) => useStageRefresh(items, onComplete), { initialProps: { items: [progress('platform-search', false)] } });
        expect(mockRefresh).not.toHaveBeenCalled();
        rerender({ items: [progress('platform-search', true)] });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        rerender({ items: [progress('platform-search', true), progress('source-search', false)] });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        rerender({ items: [progress('platform-search', true), progress('source-search', true)] });
        expect(mockRefresh).toHaveBeenCalledTimes(2);
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('on complete, refreshes and finishes once', () => {
        const onComplete = jest.fn();
        const { rerender } = renderHook(({ items }) => useStageRefresh(items, onComplete), { initialProps: { items: [] } });
        const items = [{ kind: 'complete' }];
        rerender({ items });
        rerender({ items: [...items] });
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});
