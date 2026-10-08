import { fireEvent, render, screen, act } from '@testing-library/react';
import GuidedDemo from '../GuidedDemo';

describe('live preview guide', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    HTMLElement.prototype.scrollIntoView = jest.fn();
  });
  afterEach(() => { jest.useRealTimers(); });
  it('locates the actual editor without activating or mutating it', () => {
    const mutate = jest.fn();
    render(<><button data-testid="edit-mode-toggle" onClick={mutate}>Edit profile</button><GuidedDemo/></>);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    act(() => { jest.runOnlyPendingTimers(); });
    expect(screen.getByTestId('edit-mode-toggle').style.outline).toContain('3px');
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Restart guide only' }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-mode-toggle').style.outline).toBe('');
  });
  it('reports unavailable controls instead of bypassing auth', () => {
    render(<GuidedDemo/>);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    act(() => { jest.runOnlyPendingTimers(); });
    expect(screen.getByRole('status')).toHaveTextContent('This control is not visible yet');
  });
});
