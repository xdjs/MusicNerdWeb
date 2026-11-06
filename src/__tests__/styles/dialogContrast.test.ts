import fs from 'node:fs';
import path from 'node:path';
import resolveConfig from 'tailwindcss/resolveConfig';
import config from '../../../tailwind.config';

// JSDOM does not resolve CSS variables. Check the configured utility against the
// actual theme variables and the brightest end of each shared dialog surface.
const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
const resolved = resolveConfig(config);
function luminance(rgb: number[]) {
    return rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
}
function hslRgb(h: number, s: number, l: number) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    return [0, 8, 4].map(n => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    });
}

describe('dialog error text contrast', () => {
    it.each([
        ['light', ':root', [247, 244, 249]],
        ['dark', '.dark', [35, 32, 38]],
    ] as const)('keeps small error text readable in %s mode', (_theme, selector, background) => {
        const utility = resolved.theme.textColor.destructive;
        const color = typeof utility === 'string' ? utility : utility.DEFAULT;
        const token = color.match(/var\((--[^)]+)\)/)![1]!;
        const theme = css.slice(css.indexOf(`${selector} {`)).split('}')[0]!;
        const value = theme.match(new RegExp(`${token}:\\s*([^;]+);`))![1]!;
        const [h, s, l] = value.match(/[\d.]+/g)!.map(Number);
        const foreground = luminance(hslRgb(h!, s!, l!));
        const surface = luminance(background.map(value => value / 255));
        const contrast = (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05);
        expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
    it('keeps destructive button fills separate from the error text color', () => {
        expect(resolved.theme.textColor['destructive-foreground'] ?? (resolved.theme.textColor.destructive as { foreground: string }).foreground).toBe('hsl(var(--destructive-foreground))');
        expect(resolved.theme.backgroundColor.destructive).toEqual({
            DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))',
        });
    });
});
