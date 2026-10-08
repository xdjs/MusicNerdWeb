import { act, renderHook } from '@testing-library/react';
import { useCopy } from '../useCopy';

const writeText = jest.fn();
beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
});

it('copies the text and reports it copied', async () => {
  const { result } = renderHook(() => useCopy('token-1'));
  expect(result.current.copied).toBe(false);
  await act(() => result.current.copy());
  expect(writeText).toHaveBeenCalledWith('token-1');
  expect(result.current.copied).toBe(true);
});

it('resets copied when the text changes', async () => {
  const { result, rerender } = renderHook(({ text }) => useCopy(text), { initialProps: { text: 'token-1' } });
  await act(() => result.current.copy());
  rerender({ text: 'token-2' });
  expect(result.current.copied).toBe(false);
});

it('does nothing when there is no text', async () => {
  const { result } = renderHook(() => useCopy(undefined));
  await act(() => result.current.copy());
  expect(writeText).not.toHaveBeenCalled();
  expect(result.current.copied).toBe(false);
});
