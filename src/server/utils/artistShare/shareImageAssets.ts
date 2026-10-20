import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Exact repository artwork and licensed static fonts; rendering makes no asset request. */
export const shareGlasses = `data:image/png;base64,${readFileSync(join(process.cwd(), 'public/music-nerd-shades.png')).toString('base64')}`;
export const shareImageFonts = [
    { name: 'Inter', data: readFileSync(join(process.cwd(), 'public/fonts/inter/Inter-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: readFileSync(join(process.cwd(), 'public/fonts/inter/Inter-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
];
