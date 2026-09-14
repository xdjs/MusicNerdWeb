import { str } from '@/lib/str';

it.each([
    ['  hello ', 'hello'],
    ['x', 'x'],
    ['', null],
    ['   ', null],
    [null, null],
    [undefined, null],
    [7, null],
    [{}, null],
])('str(%p) → %p', (input, expected) => {
    expect(str(input)).toBe(expected);
});
