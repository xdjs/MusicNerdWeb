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
        : id === './renderArtistSixDirections' ? loadSource('src/server/utils/artistShare/renderArtistSixDirections.tsx') : id === './renderArtistAdditionalDirection' ? loadSource('src/server/utils/artistShare/renderArtistAdditionalDirection.tsx') : id === './renderArtistArtDirection' ? loadSource('src/server/utils/artistShare/renderArtistArtDirection.tsx') : id === './renderArtistStoryProposal' ? loadSource('src/server/utils/artistShare/renderArtistStoryProposal.tsx') : id === './shareImageAssets' ? loadSource('src/server/utils/artistShare/shareImageAssets.ts') : require(id);
    loaded._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
        fileName: filename,
    }).outputText, filename);
    return loaded.exports;
}

async function main() {
    const { shareFontCoverage, shareFontHashes } = loadSource('src/lib/artistShare/shareFontCoverage.ts');
    const fonts = Object.entries(shareFontHashes).map(([file, hash]) => {
        const data = readFileSync(path.join(root, 'public/fonts/inter', file));
        assert.equal(createHash('sha256').update(data).digest('hex'), hash, 'Inter font changed: regenerate coverage and verify offline rendering');
        const font = createFont(data);
        assert.equal(font.familyName, 'Inter');
        assert.deepEqual(font.variationAxes, {}, 'Use official static font files');
        return font;
    });
    const expectedCoverage = shareFontCoverage.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, index) => start + index));
    assert.deepEqual(fonts[0].characterSet.filter(point => fonts.every(font => font.hasGlyphForCodePoint(point))).sort((a,b) => a-b), expectedCoverage);

    let fetchCalls = 0;
    global.fetch = async () => { fetchCalls++; throw new Error('Offline rendering must not fetch fonts, emoji or other assets'); };
    const { renderArtistShareImage } = loadSource('src/server/utils/artistShare/renderArtistShareImage.tsx');
    async function render(name, bio, palette) {
        const png = Buffer.from(await renderArtistShareImage(name, null, bio, palette).arrayBuffer());
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), 1200);
        assert.equal(png.readUInt32BE(20), 630);
        assert.equal(fetchCalls, 0);
        return png;
    }
    assert.notDeepEqual(await render('Pete Rango', null, 'white'), await render('Pete Rango', null, 'pink'));
    assert.notDeepEqual(await render('Pete Rango', null, 'logo'), await render('Pete Rango', null, 'pink'));
    assert.notDeepEqual(await render('Björk', 'Björk makes music.'), await render('Björk'));
    assert.deepEqual(await render('Björk', '坂本龍一'), await render('Björk'));
    await render('W'.repeat(90), 'W'.repeat(500));
    await render('W'.repeat(40), 'W'.repeat(500));
    const { renderArtistShareProposal } = loadSource('src/server/utils/artistShare/renderArtistShareProposal.tsx');
    const layouts = [];
    for (const layout of ['editorial', 'portrait', 'profile', 'story', 'cover', 'sleeve', 'dossier', 'spotlight', 'sequence', 'broadcast', 'manifesto', 'orbit', 'checkerboard', 'panorama', 'monogram', 'margin']) {
        for (const name of ['Pete Rango', 'Beyonce\u0301', '坂本龍一', 'W'.repeat(12), 'W'.repeat(16), 'W'.repeat(17), 'W'.repeat(24), 'W'.repeat(90)]) {
            const bytes = Buffer.from(await renderArtistShareProposal(name, null, 'A public biography. '.repeat(20), layout, 'logo', 'know').arrayBuffer());
            assert.equal(bytes.readUInt32BE(16), 1200);
            assert.equal(bytes.readUInt32BE(20), 630);
            if (name === 'Pete Rango') layouts.push(bytes);
        }
    }
    assert.notDeepEqual(layouts[0], layouts[1]);
    assert.notDeepEqual(layouts[1], layouts[2]);
    assert.equal(fetchCalls, 0);
    const fallback = await render('Discover this artist');
    const supported = ['Björk', 'Beyoncé', 'LATASHÁ', 'Sigur Rós', 'Zoë Keating', 'João Gilberto', 'MØ', 'Ólafur Arnalds', 'Artist © ® ™ Œ', 'Dvořák', 'Łona', 'Кино'];
    for (const name of supported) assert.notDeepEqual(await render(name), fallback, `${name} must retain its identity`);
    assert.deepEqual(await render('Beyonce\u0301'), await render('Beyoncé'), 'NFC renders decomposed accents identically');
    const unsupported = ['坂本龍一', '🎵', 'Artist ©️', '\uffff'];
    for (const name of unsupported) assert.deepEqual(await render(name), fallback, `${name} needs an explicit unsupported-glyph fallback`);
    // Exercise every declared printable glyph, including symbols recognized by emoji parsers.
    const glyphs = expectedCoverage.filter(point => point >= 32).map(point => String.fromCodePoint(point));
    for (let index = 0; index < glyphs.length; index += 60) await render(glyphs.slice(index, index + 60).join(''));
    process.stdout.write(JSON.stringify({ supported: supported.length, unsupported: unsupported.length, coverage: expectedCoverage.length, fetchCalls }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
