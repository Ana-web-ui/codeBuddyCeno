import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-branding-export-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs',
    '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig, createActivationModelConfig } = require(join(out, 'project-types.js'));
const { generate, validate, assemblyGeometry, geometry } = require(join(out, 'generator.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const { artworkImageSize } = require(join(out, 'branding-image.js'));
const { artworkGeometry, artworkPlacement, artworkSurface } = require(join(out, 'branding-geometry.js'));
const { counterParts } = require(join(out, 'counter.js'));
const { unitTransform } = require(join(out, 'assembly.js'));
const image = (name, mime) => `data:image/${mime};base64,${readFileSync('tests/fixtures/branding-' + name).toString('base64')}`;
const logo = image('logo.png', 'png'), art = image('arte.jpg', 'jpeg'), tall = image('vertical.png', 'png');
const fixtures = process.env.CODEBUDDY_BRANDING_FIXTURES ? resolve(process.env.CODEBUDDY_BRANDING_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixtures, { recursive: true });
const base = () => ({ ...createProjectConfig('stand'), width: 12, depth: 8, back: false, led: false, spots: false,
    backdrops: true, panelArtEnabled: true, panelArtImage: art, panelArtName: 'Arte.jpg', panelArtMode: 'cover',
    counterArtEnabled: true, counterArtImage: logo, counterArtName: 'Logo.png' });
const cases = [
    ['simples', { ...base(), counterDetailed: false, backdropDetailed: false }],
    ['detalhado', { ...base(), counterDetailed: true, backdropDetailed: true }],
    ['moldura', { ...base(), counterDetailed: true, backdropDetailed: true, backdropFrameEnabled: true }],
    ['logo-inteiro', { ...base(), panelArtMode: 'contain', panelArtImage: logo }],
    ['arte-preenchida', { ...base(), counterArtMode: 'cover', counterArtImage: art }],
    ['vertical', { ...base(), panelArtImage: tall, panelArtMode: 'cover' }],
    ['reduzida', { ...base(), panelArtScale: .1, counterArtScale: .1 }],
    ['ampliada', { ...base(), panelArtScale: 3, counterArtScale: 3 }],
    ['deslocada', { ...base(), panelArtOffsetX: .5, panelArtOffsetY: -.5, counterArtOffsetX: -.5, counterArtOffsetY: .5 }],
    ['duas-unidades', { ...base(), counterCount: 2, backdropCount: 2 }],
    ['segunda-ajustada', { ...base(), backdropCount: 2, objectTransforms: { 'backdrops:1': { x: 2, y: 1, rotation: 45 } } }],
    ...[0, 90, 180, 270].map(frontRotation => ['frente-' + frontRotation, { ...base(), frontRotation }]),
    ['giro-combinado', { ...base(), backdropDetailed: true, backdropFrameEnabled: true, frontRotation: 90,
        objectTransforms: { 'backdrops:0': { x: 0, y: 1, rotation: -45 } } }],
    ['recepcao', { ...createProjectConfig('reception'), counterArtEnabled: true, counterArtImage: logo, counterArtName: 'Logo.png', frontRotation: 90 }],
    ['palco', { ...createProjectConfig('palco'), backdrops: true, panelArtEnabled: true, panelArtImage: art, panelArtName: 'Arte.jpg', panelArtMode: 'cover' }],
    ['foto', { ...createActivationModelConfig(createProjectConfig('activation'), 'photo'), backdropDetailed: true, backdropFrameEnabled: true,
        panelArtEnabled: true, panelArtImage: art, panelArtName: 'Arte.jpg', panelArtMode: 'cover' }],
    ['desativadas', { ...base(), panelArtEnabled: false, counterArtEnabled: false }],
    ['pecas-desligadas', { ...createProjectConfig('stand'), counter: false, backdrops: false, panelArtEnabled: true, panelArtImage: logo, counterArtEnabled: true, counterArtImage: logo }],
    ['com-led', { ...base(), led: true, screenImage: logo, screenName: 'TV.png' }],
    ['demonstracao', { ...base(), width: 8, depth: 6, counterDetailed: true, backdropDetailed: true, backdropFrameEnabled: true,
        floorShape: 'rounded', lightingPreset: 'studio', lightingIntensity: .35, presentationCameras: true, presentationCamera: 'front',
        objectTransforms: { 'backdrops:0': { x: 0, y: 1.8, rotation: 0 } } }],
];
const manifest = [];
for (const [id, c] of cases) test('artes: ' + id, () => {
    const before = JSON.stringify(c); validate(c);
    const restored = parseProject(serializeProject(c));
    assert.deepEqual(restored, c);
    const enabled = (c.counter && c.counterArtEnabled) || (c.backdrops && c.panelArtEnabled);
    for (const target of ['blender', 'max']) {
        const script = generate({ ...c, target });
        assert.equal(script, generate({ ...restored, target }));
        assert.equal(script.includes('branding_artwork'), Boolean(enabled));
        if (target === 'max' && enabled) {
            assert.ok(script.includes('mat.cutout_map = mapa'));
            assert.ok(script.includes('mapa.monoOutput = 1'));
            assert.ok(script.includes('CodeBuddy_Artes/'));
        }
        writeFileSync(join(fixtures, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    const units = assemblyGeometry(c).filter(u => u.id.startsWith('backdrops:'));
    const expected = [];
    if (c.backdrops && c.panelArtEnabled) for (const unit of units) {
        const t = unitTransform(c, unit), localY = c.backdropDetailed ? -c.backdropThickness / 2 + .0025 : 0;
        expected.push({ id: unit.id, slot: 'panelArt', transform: t, bodyY: localY, bodyZ: artworkSurface(c, 'panelArt').z,
            ...artworkGeometry(c, 'panelArt'), imageSize: artworkImageSize(c.panelArtImage) });
    }
    if (c.counter && c.counterArtEnabled) geometry(c).counterXs.forEach((x, i) => expected.push({ id: 'counter:' + i,
        slot: 'counterArt', transform: { x, y: geometry(c).counterY, rotation: 0 }, bodyY: 0, bodyZ: counterParts(c)[0].z,
        ...artworkGeometry(c, 'counterArt'), imageSize: artworkImageSize(c.counterArtImage) }));
    manifest.push({ id, config: c, expected });
    writeFileSync(join(fixtures, 'manifest.json'), JSON.stringify(manifest));
    assert.equal(JSON.stringify(c), before);
});

test('enquadramento tem proporção, recorte e deslocamento esperados', () => {
    const surface = { width: 4, height: 2 }, image = { width: 400, height: 100 };
    const contain = artworkPlacement(surface, image, { mode: 'contain', scale: 1, offsetX: 0, offsetY: 0 });
    assert.equal(contain.width, 4); assert.equal(contain.height, 1);
    assert.deepEqual([contain.u0, contain.u1, contain.v0, contain.v1], [0, 1, 0, 1]);
    const cover = artworkPlacement(surface, image, { mode: 'cover', scale: 1, offsetX: 0, offsetY: 0 });
    assert.equal(cover.width, 8); assert.equal(cover.height, 2);
    assert.deepEqual([cover.u0, cover.u1, cover.v0, cover.v1], [.25, .75, 0, 1]);
    const offset = artworkPlacement(surface, image, { mode: 'cover', scale: 1, offsetX: .25, offsetY: 0 });
    assert.deepEqual([offset.u0, offset.u1], [.125, .625]);
});

test('metadados de PNG/JPG e dimensões inválidas são reconhecidos sem DOM', () => {
    assert.deepEqual(artworkImageSize(logo), { width: 900, height: 300 });
    assert.deepEqual(artworkImageSize(art), { width: 1200, height: 600 });
    assert.deepEqual(artworkImageSize(tall), { width: 300, height: 900 });
    const bytes = Buffer.from(logo.split(',')[1], 'base64'); bytes.writeUInt32BE(8193, 16);
    assert.throws(() => artworkImageSize('data:image/png;base64,' + bytes.toString('base64')), /8192/);
    for (const value of ['data:image/png;base64,iVBORw0KGgo=', 'data:image/jpeg;base64,/9j/2Q=='])
        assert.throws(() => artworkImageSize(value));
});
