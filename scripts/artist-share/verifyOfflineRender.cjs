// Run outside Jest's fetch/Response mocks so the real next/og renderer is exercised.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');
const createFont = require('next/dist/compiled/@next/font/dist/fontkit').default;

const root = path.resolve(__dirname, '../..');
const compiledModules = new Map();
function loadSource(relative) {
    const filename = path.join(root, relative);
    if (compiledModules.has(filename)) return compiledModules.get(filename).exports;
    const loaded = new Module(filename, module);
    compiledModules.set(filename, loaded);
    loaded.filename = filename;
    loaded.paths = module.paths;
    loaded.require = id => id.startsWith('@/lib/')
        ? loadSource(`src/${id.slice(2)}.ts`)
        : require(id);
    loaded._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
        fileName: filename,
    }).outputText, filename);
    return loaded.exports;
}

async function main() {
    const { shareFontCoverage, shareFontSha256 } = loadSource('src/lib/artistShare/shareFontCoverage.ts');
    const fontPath = path.join(path.dirname(require.resolve('next/package.json')), 'dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf');
    const fontData = readFileSync(fontPath);
    assert.equal(createHash('sha256').update(fontData).digest('hex'), shareFontSha256, 'Next font changed: regenerate coverage and verify offline rendering');
    const expectedCoverage = shareFontCoverage.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, index) => start + index));
    const font = createFont(fontData);
    assert.deepEqual(font.characterSet.filter(point => font.hasGlyphForCodePoint(point)).sort((a, b) => a - b), expectedCoverage);

    let fetchCalls = 0;
    global.fetch = async () => { fetchCalls++; throw new Error('Offline rendering must not fetch fonts, emoji or other assets'); };
    const { renderArtistShareImage } = loadSource('src/server/utils/artistShare/renderArtistShareImage.tsx');
    async function render(name, bio) {
        const png = Buffer.from(await renderArtistShareImage(name, null, bio).arrayBuffer());
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), 1200);
        assert.equal(png.readUInt32BE(20), 630);
        assert.equal(fetchCalls, 0);
        return png;
    }
    assert.notDeepEqual(await render('Björk', 'Björk makes music.'), await render('Björk'));
    assert.deepEqual(await render('Björk', '坂本龍一'), await render('Björk'));
    await render('W'.repeat(90), 'W'.repeat(500));
    const fallback = await render('Discover this artist');
    const supported = ['Björk', 'Beyoncé', 'LATASHÁ', 'Sigur Rós', 'Zoë Keating', 'João Gilberto', 'MØ', 'Ólafur Arnalds', 'Artist © ® ™ Œ'];
    for (const name of supported) assert.notDeepEqual(await render(name), fallback, `${name} must retain its identity`);
    assert.deepEqual(await render('Beyonce\u0301'), await render('Beyoncé'), 'NFC renders decomposed accents identically');
    const unsupported = ['Dvořák', 'Łona', '坂本龍一', 'Кино', '🎵', 'Artist ©️', '\uffff'];
    for (const name of unsupported) assert.deepEqual(await render(name), fallback, `${name} needs an explicit unsupported-glyph fallback`);
    // Exercise every declared printable glyph, including symbols recognized by emoji parsers.
    const glyphs = expectedCoverage.filter(point => point >= 32).map(point => String.fromCodePoint(point));
    for (let index = 0; index < glyphs.length; index += 60) await render(glyphs.slice(index, index + 60).join(''));
    process.stdout.write(JSON.stringify({ supported: supported.length, unsupported: unsupported.length, coverage: expectedCoverage.length, fetchCalls }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
