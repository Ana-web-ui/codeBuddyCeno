import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-presentation-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022',
    '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop',
    '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig, createActivationModelConfig } = require(join(out, 'project-types.js'));
const { floorOutline, floorArea, floorMesh, presentationViews, presentationDefaults, assertFloorOccupancy } = require(join(out, 'presentation.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const { generate, validate } = require(join(out, 'generator.js'));
const fixtures = process.env.CODEBUDDY_PRESENTATION_FIXTURES ? resolve(process.env.CODEBUDDY_PRESENTATION_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixtures, { recursive: true });
const base = () => ({ ...createProjectConfig('stand'), back: false, led: false, spots: false,
    presentationCameras: true, presentationCamera: 'isometric', lightingPreset: 'studio' });
const cases = [
    ['padrao', base()],
    ['arredondado', { ...base(), floorShape: 'rounded' }],
    ['eliptico', { ...base(), floorShape: 'ellipse' }],
    ['circular', { ...base(), width: 8, depth: 8, floorShape: 'ellipse' }],
    ['cantos-zero', { ...base(), floorShape: 'rounded', floorCornerRadius: 0 }],
    ['raio-maximo', { ...base(), counter: false, floorShape: 'rounded', floorCornerRadius: 2.5 }],
    ['arredondado-spots', { ...base(), spots: true, floorShape: 'rounded' }],
    ...['original', 'neutral', 'warm', 'studio'].map(lightingPreset => ['luz-' + lightingPreset, { ...base(), lightingPreset }]),
    ['luz-minima', { ...base(), lightingIntensity: .1 }],
    ['luz-maxima', { ...base(), lightingIntensity: 3 }],
    ...['front', 'isometric', 'top'].map(presentationCamera => ['camera-' + presentationCamera, { ...base(), presentationCamera }]),
    ...['landscape', 'square', 'portrait'].map(presentationFormat => ['formato-' + presentationFormat, { ...base(), presentationFormat }]),
    ['margem-minima', { ...base(), presentationMargin: 1.05 }],
    ['margem-maxima', { ...base(), presentationMargin: 2 }],
    ['estreito-alto', { ...base(), width: 3, depth: 8, height: 8, counter: false, presentationFormat: 'portrait' }],
    ['largo-baixo', { ...base(), width: 30, depth: 3, height: 2.5, counter: false }],
    ['giro-90', { ...base(), floorShape: 'ellipse', frontRotation: 90 }],
    ['giro-180', { ...base(), floorShape: 'rounded', frontRotation: 180 }],
    ['giro-270', { ...base(), frontRotation: 270 }],
    ['pedestal-ajustado', { ...base(), floorShape: 'ellipse', pedestals: true, pedestalCount: 1,
        objectTransforms: { 'pedestals:0': { x: 0, y: 0, rotation: 45 } } }],
    ...['palco', 'lounge', 'activation', 'reception'].map(type => [type, { ...createProjectConfig(type), presentationCameras: true, presentationCamera: 'top', lightingPreset: 'neutral' }]),
    ['foto', { ...createActivationModelConfig(createProjectConfig('activation'), 'photo'), presentationCameras: true, presentationCamera: 'isometric' }],
    ['demonstracao', { ...base(), width: 8, depth: 6, color: '#d54e24', lightingIntensity: .35,
        floorShape: 'rounded', floorCornerRadius: .5, backdrops: true, backdropDetailed: true, backdropFrameEnabled: true,
        shelving: true, shelfDetailed: true, shelfMat: 'wood', showcases: true, showcaseDetailed: true, showcaseBaseMat: 'brand',
        objectTransforms: { 'backdrops:0': { x: 0, y: 1.8, rotation: 0 }, 'shelving:0': { x: -2, y: 0, rotation: 0 },
            'showcases:0': { x: 2, y: 0, rotation: -15 } } }],
    ['legado', createProjectConfig('stand')],
];
const manifest = [];
for (const [id, config] of cases) test('apresentação: ' + id, () => {
    const before = JSON.stringify(config);
    validate(config);
    const restored = parseProject(serializeProject(config));
    assert.equal(JSON.parse(serializeProject(config)).version, 20);
    assert.deepEqual(restored, config);
    const mesh = floorMesh(config), n = floorOutline(config).length;
    assert.equal(mesh.vertices.length, n * 2 + 2);
    assert.equal(mesh.faces.length, n * 4);
    // Uma superfície fechada usa cada aresta duas vezes, em sentidos opostos.
    const edges = new Map();
    for (const face of mesh.faces) for (let i = 0; i < 3; i++) {
        const a = face[i], b = face[(i + 1) % 3], key = [Math.min(a, b), Math.max(a, b)].join(':');
        const counts = edges.get(key) ?? [0, 0];
        counts[a < b ? 0 : 1]++; edges.set(key, counts);
    }
    for (const counts of edges.values()) assert.deepEqual(counts, [1, 1]);
    for (const target of ['blender', 'max']) {
        const script = generate({ ...config, target });
        assert.equal(script, generate({ ...restored, target }));
        assert.equal(script.includes('presentation_camera'), config.presentationCameras);
        assert.equal(script.includes('Luz_Recorte'), config.lightingPreset === 'studio');
        if (target === 'max' && config.presentationCameras) {
            assert.ok(script.includes('orthoProjection = true'));
            assert.ok(script.includes('viewport.setCamera cbCameraEscolhida'));
            assert.ok(!script.includes('max zoomext sel all'));
        }
        writeFileSync(join(fixtures, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    manifest.push({ id, config, mesh, area: floorArea(config), views: presentationViews(config) });
    writeFileSync(join(fixtures, 'manifest.json'), JSON.stringify(manifest));
    assert.equal(JSON.stringify(config), before);
});

test('área e limites correspondem ao contorno físico exportado', () => {
    assert.equal(floorArea(base()), 50);
    const ellipse = { ...base(), floorShape: 'ellipse' };
    assert.ok(Math.abs(floorArea(ellipse) - Math.PI * 10 * 5 / 4) / floorArea(ellipse) < .001);
    const rounded = { ...base(), floorShape: 'rounded', floorCornerRadius: .3 };
    assert.ok(Math.abs(floorArea(rounded) - (50 - (4 - Math.PI) * .3 ** 2)) < .001);
    for (const c of [ellipse, rounded]) {
        assert.doesNotThrow(() => assertFloorOccupancy(c, [{ name: 'Central', x: 0, y: 0, width: 1, depth: 1 }]));
        assert.throws(() => assertFloorOccupancy(c, [{ name: 'Canto', x: 4.9, y: 2.4, width: .2, depth: .2 }]), /contorno/);
    }
});

test('valida ocupação automática e ajustada, paredes e configurações inválidas', () => {
    assert.doesNotThrow(() => validate({ ...base(), floorShape: 'rounded', floorCornerRadius: 0, back: true }));
    const invalid = [
        { floorShape: 'outro' }, { floorShape: 'rounded', floorCornerRadius: 2.6 }, { floorCornerRadius: NaN },
        { lightingPreset: 'outro' }, { lightingIntensity: 0 }, { lightingIntensity: 3.1 },
        { presentationCameras: 1 }, { presentationCamera: 'outro' }, { presentationFormat: 'outro' }, { presentationMargin: 1 },
        { floorShape: 'ellipse', back: true },
        { floorShape: 'ellipse', spots: true },
        { floorShape: 'ellipse', pedestals: true, pedestalCount: 1 },
        { floorShape: 'ellipse', pedestals: true, pedestalCount: 1, objectTransforms: { 'pedestals:0': { x: 4.3, y: 1.3, rotation: 0 } } },
    ];
    for (const patch of invalid) {
        const c = { ...base(), ...patch }, before = JSON.stringify(c);
        assert.throws(() => validate(c), JSON.stringify(patch));
        assert.throws(() => serializeProject(c), JSON.stringify(patch));
        assert.equal(JSON.stringify(c), before);
    }
});

test('migra versões anteriores com piso, luz e câmera originais nos cinco tipos', () => {
    for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
        const current = createProjectConfig(type), old = { ...current };
        for (const key of Object.keys(presentationDefaults)) delete old[key];
        for (let version = 1; version <= 19; version++)
            assert.deepEqual(parseProject(JSON.stringify({ format: 'code-buddy-project', version, config: old })), current);
        assert.deepEqual(parseProject(JSON.stringify(old)), current);
        assert.equal(current.floorShape, 'rectangle');
        assert.equal(current.presentationCameras, false);
        assert.equal(current.lightingPreset, 'original');
    }
    for (const key of Object.keys(presentationDefaults)) {
        const c = base(); delete c[key];
        assert.throws(() => parseProject(JSON.stringify({ format: 'code-buddy-project', version: 20, config: c })), /ausente/);
    }
    assert.throws(() => parseProject(JSON.stringify({ format: 'code-buddy-project', version: 21, config: base() })), /versão/);
});
