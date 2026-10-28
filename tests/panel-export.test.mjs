import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-panel-export-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig, createActivationModelConfig } = require(join(out, 'project-types.js'));
const { generate, validate, assemblyGeometry } = require(join(out, 'generator.js'));
const { panelParts } = require(join(out, 'panel.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const { unitTransform } = require(join(out, 'assembly.js'));
const { activationGeometry } = require(join(out, 'activation-geometry.js'));
const fixture = process.env.CODEBUDDY_PANEL_FIXTURES ? resolve(process.env.CODEBUDDY_PANEL_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixture, { recursive: true });
const manifest = [];
const base = () => ({ ...createProjectConfig('stand'), depth: 8, back: false, led: false, counter: false,
    spots: false, backdrops: true, backdropDetailed: true, backdropFrameEnabled: true });
const photo = () => ({ ...createActivationModelConfig(createProjectConfig('activation'), 'photo'),
    backdropDetailed: true, backdropFrameEnabled: true });
const cases = [
    ['moldura', base()],
    ['sem-moldura', { ...base(), backdropFrameEnabled: false }],
    ['legado', { ...base(), backdropDetailed: false }],
    ['desligado', { ...base(), backdrops: false }],
    ['minimo', { ...base(), backdropWidth: 1, backdropHeight: .8, backdropThickness: .02,
        backdropBaseDepth: .3, backdropFrameWidth: .2, backdropFrameDepth: .01 }],
    ['maximo', { ...base(), width: 14, depth: 10, backdropWidth: 6, backdropHeight: 3,
        backdropThickness: .2, backdropBaseDepth: 1.5, backdropFrameWidth: .2, backdropFrameDepth: .15 }],
    ['limite-profundidade', { ...base(), backdropThickness: .2, backdropFrameDepth: .05, backdropBaseDepth: .3 }],
    ['materiais', { ...base(), backdropMat: 'white', backdropStructureMat: 'wood', backdropBaseMat: 'metal', backdropFrameMat: 'brand' }],
    ['tres-paineis', { ...base(), width: 14, depth: 12, backdropCount: 3, backdropWidth: 2 }],
    ['segundo-ajustado', { ...base(), width: 14, depth: 12, backdropCount: 2, backdropWidth: 2,
        objectTransforms: { 'backdrops:1': { x: 2, y: 2, rotation: 45 } } }],
    ['palco', { ...base(), projectType: 'palco', stage: true, stageWidth: 4, stageDepth: 2 }],
    ...[0, 90, 180, 270].map(frontRotation => ['frente-' + frontRotation, { ...base(), frontRotation }]),
    ...[45, 90, -90].map(rotation => ['ajuste-' + rotation, { ...base(),
        objectTransforms: { 'backdrops:0': { x: 0, y: 0, rotation } } }]),
    ['giro-combinado', { ...base(), frontRotation: 90, objectTransforms: { 'backdrops:0': { x: 0, y: 0, rotation: 45 } } }],
    ['foto', photo()],
    ['foto-legado', { ...photo(), backdropDetailed: false }],
    ['foto-direita', { ...photo(), width: 12, depth: 12, activationEntranceSide: 'right', activationExitSide: 'front' }],
    ['foto-ajustada', { ...photo(), width: 12, depth: 12, objectTransforms: { 'backdrops:0': { x: -.5, y: 1, rotation: 45 } } }],
];

for (const [id, c] of cases) test('painéis: ' + id, () => {
    const before = JSON.stringify(c);
    validate(c);
    const units = assemblyGeometry(c).filter(unit => unit.id.startsWith('backdrops:'));
    assert.equal(units.length, c.backdrops ? c.backdropCount : 0);
    const parts = panelParts(c);
    assert.equal(parts.length, c.backdropDetailed ? c.backdropFrameEnabled ? 8 : 4 : 3);
    for (const part of parts) {
        assert.ok(part.size.every(n => n > 0));
        assert.ok(Math.abs(part.center[0]) + part.size[0] / 2 <= c.backdropWidth / 2 + 1e-7);
        assert.ok(Math.abs(part.center[1]) + part.size[1] / 2 <= c.backdropBaseDepth / 2 + 1e-7);
        assert.ok(part.center[2] - part.size[2] / 2 >= .1 - 1e-7);
        assert.ok(part.center[2] + part.size[2] / 2 <= .1 + c.backdropHeight + 1e-7);
    }
    if (c.backdropDetailed) {
        const front = parts.find(p => p.role === 'panel_front'), structure = parts.find(p => p.role === 'panel_structure');
        assert.ok(front.center[1] < structure.center[1]);
        assert.ok(Math.abs(front.center[1] + front.size[1] / 2 - (structure.center[1] - structure.size[1] / 2)) < 1e-7);
    }
    const restored = parseProject(serializeProject(c));
    assert.deepEqual(restored, c);
    for (const target of ['blender', 'max']) {
        const script = generate({ ...c, target });
        assert.equal(script, generate({ ...restored, target }));
        assert.equal(script.includes('panel_front'), c.backdrops && c.backdropDetailed);
        assert.equal(script.includes('panel_frame_left'), c.backdrops && c.backdropDetailed && c.backdropFrameEnabled);
        if (c.backdrops && c.backdropDetailed) {
            assert.ok(script.includes('assembly_unit'));
            if (target === 'max' && Object.keys(c.objectTransforms).length) assert.ok(script.includes('obj.name'));
        }
        writeFileSync(join(fixture, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    const photoGeometry = c.projectType === 'activation' ? activationGeometry(c).photo : null;
    manifest.push({ id, config: c, parts, units: units.map(u => ({ id: u.id, transform: unitTransform(c, u) })), photo: photoGeometry });
    writeFileSync(join(fixture, 'manifest.json'), JSON.stringify(manifest));
    assert.equal(JSON.stringify(c), before);
});

test('recusa moldura fora da projeção das bases e mantém os ajustes válidos no JSON', () => {
    for (const patch of [{ backdropFrameDepth: .16 }, { backdropFrameWidth: .01 }, { backdropFrameEnabled: 'sim' },
        { backdropThickness: .2, backdropBaseDepth: .3, backdropFrameDepth: .06 },
        { backdropFrameMat: 'outro' }, { backdropBaseMat: null }]) {
        const c = { ...base(), ...patch }, before = JSON.stringify(c);
        assert.throws(() => validate(c));
        assert.equal(JSON.stringify(c), before);
    }
    const c = { ...base(), objectTransforms: { 'backdrops:0': { x: 0, y: 0, rotation: 45 } } };
    for (const patch of [{ backdropFrameEnabled: false }, { backdropDetailed: false }, { backdropFrameWidth: .1 }, { backdropFrameMat: 'wood' }]) {
        assert.deepEqual(parseProject(serializeProject({ ...c, ...patch })).objectTransforms, c.objectTransforms);
    }
});
