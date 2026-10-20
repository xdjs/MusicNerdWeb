/** Public/synthetic examples only; this gallery and its image route are preview-gated. */
export const artistSharePreviewCases = [
    { key: 'normal', label: 'With a public portrait', name: 'Pete Rango' },
    { key: 'missing', label: 'Without a usable portrait', name: 'Pete Rango' },
    { key: 'accent', label: 'Supported accented name', name: 'Björk' },
    { key: 'decomposed', label: 'Decomposed accent, normalized to NFC', name: 'Beyonce\u0301' },
    { key: 'long', label: 'A longer artist name', name: 'The Extraordinary Ensemble of Midnight Dreamers and Their Incredibly Long Artist Name' },
    { key: 'unicode', label: 'Unsupported glyphs still use neutral image text', name: '坂本龍一' },
];
