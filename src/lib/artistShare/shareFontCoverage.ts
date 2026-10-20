// Derived from Next's noto-sans-v27-latin-regular.ttf cmap, excluding mappings to missing glyph 0. The offline regression
// verifies both the exact character map and hash against the installed font.
// Keep this small table at runtime; fontkit is used only by the regression.
export const shareFontSha256 = 'd2a8188db7fdd567bbd94017cec0622373d47206d45281b7c501f0775cdee83a';
export const shareFontCoverage: ReadonlyArray<readonly [number, number]> = [
    [0, 0], [13, 13], [32, 126], [160, 255], [305, 305], [338, 339],
    [699, 700], [710, 710], [730, 730], [732, 732], [8194, 8194],
    [8201, 8201], [8203, 8203], [8211, 8212], [8216, 8218],
    [8220, 8222], [8226, 8226], [8230, 8230], [8242, 8243],
    [8249, 8250], [8260, 8260], [8308, 8308], [8364, 8364],
    [8482, 8482], [8722, 8722], [8725, 8725], [65279, 65279],
    [65533, 65533],
];
