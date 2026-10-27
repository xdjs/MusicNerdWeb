import { act, fireEvent, render, screen } from '@testing-library/react';
import { useChat } from '@ai-sdk/react';
import ArtistAskSheet from '@/app/artist/[id]/_components/ArtistAskSheet';

// useChat is mocked (src/test/__mocks__/ai-sdk-react.ts): each test sets the chat's state.
const chat = jest.mocked(useChat);
const sendMessage = jest.fn();
const regenerate = jest.fn();
function state(overrides: Record<string, unknown> = {}) {
    chat.mockReturnValue({ messages: [], status: 'ready', error: undefined, sendMessage, stop: jest.fn(), regenerate, ...overrides } as never);
}
const user = (id: string, text: string) => ({ id, role: 'user', parts: [{ type: 'text', text }] });
const assistant = (id: string, text: string, sources: { n: number; title: string; url: string }[] = []) => ({ id, role: 'assistant', parts: [
    ...sources.map(s => ({ type: 'source-url', sourceId: String(s.n), url: s.url, title: s.title })), { type: 'text', text },
] });
const ANSWERED = [user('u1', 'How did Nova get started?'), assistant('a1', 'Nova started recording in a home studio.[1]', [{ n: 1, title: 'Studio interview', url: 'https://example.com/interview' }])];
beforeEach(() => { jest.clearAllMocks(); state(); });

it('opens existing suggested questions, sends one, renders real citation links, and keeps the chat through minimize', () => {
    const { rerender } = render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    const trigger = screen.getByRole('button', { name: 'Ask about Nova' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'How did Nova get started?' }));
    expect(sendMessage).toHaveBeenCalledWith({ text: 'How did Nova get started?' });
    state({ messages: ANSWERED });
    rerender(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    expect(screen.getByText(/Nova started recording/)).toBeInTheDocument();
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === 'https://example.com/interview')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize chat' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    expect(screen.getByText(/Nova started recording/)).toBeVisible();
    expect(sendMessage).toHaveBeenCalledTimes(1);
});


it('keeps the profile interactive and preserves an unfinished question when minimized', () => {
    const outside = jest.fn();
    render(<><button onClick={outside}>Profile action</button><ArtistAskSheet artistId="nova-id" artistName="Nova" /></>);
    const trigger = screen.getByRole('button', { name: 'Ask about Nova' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false');
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveFocus();
    fireEvent.change(input, { target: { value: 'A question in progress' } });
    fireEvent.click(screen.getByRole('button', { name: 'Profile action' }));
    expect(outside).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(trigger);
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.getByRole('textbox')).toHaveValue('A question in progress');
});

it('keeps earlier answers and sources when the next question fails, then allows a retry', () => {
    state({ messages: [...ANSWERED, user('u2', 'What came next?')], status: 'error', error: new Error('offline') });
    render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about Nova' }));
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByText(/Nova started recording/)).toBeVisible();
    expect(screen.getByRole('link', { name: /example.com/ })).toHaveAttribute('href', 'https://example.com/interview');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(regenerate).toHaveBeenCalledTimes(1);
});

it('moves the panel above the mobile keyboard and releases viewport listeners when minimized', () => {
    const original = window.visualViewport;
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight - 300, offsetTop: 0 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    const remove = jest.spyOn(viewport, 'removeEventListener');
    render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about Nova' }));
    expect(screen.getByRole('dialog')).toHaveStyle({ bottom: '308px', maxHeight: `${viewport.height - 16}px` });
    act(() => {
        viewport.height = window.innerHeight;
        viewport.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByRole('dialog').style.bottom).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Minimize chat' }));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: original });
});

it('keeps streaming while minimized and shows the answer on reopen without resending', () => {
    state({ messages: [ANSWERED[0]], status: 'submitted' });
    const { rerender } = render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    const trigger = screen.getByRole('button', { name: 'Ask about Nova' });
    fireEvent.click(trigger);
    expect(screen.getByRole('status')).toHaveTextContent('Checking Lore…');
    fireEvent.click(screen.getByRole('button', { name: 'Minimize chat' }));
    state({ messages: ANSWERED });
    rerender(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    fireEvent.click(trigger);
    expect(screen.getByText(/Nova started recording/)).toBeVisible();
    expect(sendMessage).not.toHaveBeenCalled();
});
