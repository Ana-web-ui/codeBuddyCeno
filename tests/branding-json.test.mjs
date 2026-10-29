import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const out = mkdtempSync(join(tmpdir(), 'codebuddy-branding-json-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out,
    'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { brandingDefaults, MAX_ARTWORK_BYTES, validateBranding } = require(join(out, 'branding.js'));
const { parseProject, serializeProject, MAX_PROJECT_BYTES } = require(join(out, 'project-file.js'));
const envelope = (config, version) => JSON.stringify({ format: 'code-buddy-project', version, config });
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=';

for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
    test(`migra versões 1–17 de ${type}, preservando a configuração`, () => {
        const current = createProjectConfig(type);
        if (type === 'stand') {
            current.pedestals = true;
            current.pedestalCount = 1;
            current.objectTransforms = { 'pedestals:0': { x: 1, y: 0, rotation: 30 } };
        }
        const old = { ...current };
        for (const key of Object.keys(brandingDefaults)) delete old[key];
        const before = JSON.stringify(old);
        for (let version = 1; version <= 17; version++) {
            const migrated = parseProject(envelope(old, version));
            assert.deepEqual(migrated, current);
            assert.equal(migrated.panelArtEnabled, false);
            assert.equal(migrated.counterArtEnabled, false);
        }
        assert.deepEqual(parseProject(JSON.stringify(old)), current);
        assert.deepEqual(parseProject(JSON.stringify({ config: old })), current);
        assert.equal(JSON.stringify(old), before);
    });

    test(`salva e reabre as duas artes e seus ajustes em ${type}`, () => {
        const config = { ...createProjectConfig(type),
            panelArtEnabled: true, panelArtImage: png, panelArtName: 'Logo TV1.png',
            panelArtMode: 'contain', panelArtScale: .6, panelArtOffsetX: -.25, panelArtOffsetY: .2,
            counterArtEnabled: true, counterArtImage: png, counterArtName: 'Arte do balcão.png',
            counterArtMode: 'cover', counterArtScale: 1.2, counterArtOffsetX: .1, counterArtOffsetY: -.1 };
        const before = JSON.stringify(config);
        const text = serializeProject(config);
        assert.equal(JSON.parse(text).version, 20);
        assert.deepEqual(parseProject(text), config);
        assert.equal(JSON.stringify(config), before);
    });
}

test('versão 20 exige todos os campos e rejeita versões futuras', () => {
    for (const key of Object.keys(brandingDefaults)) {
        const config = { ...createProjectConfig('stand') };
        delete config[key];
        assert.throws(() => parseProject(envelope(config, 20)), /ausente/);
    }
    assert.throws(() => parseProject(envelope(createProjectConfig('stand'), 21)), /versão/);
    assert.throws(() => parseProject(envelope({ ...createProjectConfig('stand'), panelArtUnknown: 1 }, 19)), /desconhecidos/);
});

test('recusa opções inválidas e imagens incompatíveis, mesmo desativadas', () => {
    for (const prefix of ['panelArt', 'counterArt']) {
        for (const fields of [
            { Enabled: 'sim' }, { Enabled: true }, { Name: 'a'.repeat(256) },
            { Mode: 'stretch' }, { Scale: .09 }, { Scale: 3.01 },
            { OffsetX: -.51 }, { OffsetY: .51 },
            { Image: 'https://exemplo.com/logo.png' },
            { Image: 'data:image/svg+xml;base64,PHN2Zz4=' },
            { Image: 'data:image/png;base64,AAAA' },
            { Image: 'data:image/png;base64,A' },
            { Image: png.replace('image/png', 'image/jpeg') },
        ]) {
            const patch = Object.fromEntries(Object.entries(fields).map(([key, value]) => [prefix + key, value]));
            const c = { ...createProjectConfig('stand'), ...patch };
            assert.throws(() => serializeProject(c), JSON.stringify(patch));
            assert.throws(() => parseProject(envelope(c, 18)), JSON.stringify(patch));
        }
        const c = { ...createProjectConfig('stand'), [prefix + 'Scale']: NaN };
        assert.throws(() => validateBranding(c));
    }
});

test('mantém imagens guardadas quando a aplicação está desativada', () => {
    const c = { ...createProjectConfig('stand'), panelArtImage: png, panelArtName: 'logo.png', panelArtScale: 2 };
    assert.deepEqual(parseProject(serializeProject(c)), c);
});

test('comporta as três imagens no limite individual e recusa excedentes', () => {
    // Payload sintético para medir o orçamento de bytes, sem renderizar a imagem.
    const bytes = Buffer.alloc(MAX_ARTWORK_BYTES);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
    const image = 'data:image/png;base64,' + bytes.toString('base64');
    const c = { ...createProjectConfig('stand'), panelArtEnabled: true, panelArtImage: image,
        counterArtEnabled: true, counterArtImage: image, screenImage: image };
    const text = serializeProject(c);
    assert.ok(Buffer.byteLength(text) > 4 * 1024 * 1024);
    assert.ok(Buffer.byteLength(text) < MAX_PROJECT_BYTES);
    assert.deepEqual(parseProject(text), c);
    const oversized = 'data:image/png;base64,' + Buffer.concat([bytes, Buffer.from([0])]).toString('base64');
    assert.throws(() => serializeProject({ ...c, panelArtImage: oversized }), /2 MB/);
    assert.throws(() => parseProject(' '.repeat(MAX_PROJECT_BYTES + 1)), /10 MB/);
});
