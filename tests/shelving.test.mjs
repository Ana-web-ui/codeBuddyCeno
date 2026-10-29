import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-shelving-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { generate, validate, assemblyGeometry } = require(join(out, 'generator.js'));
const { shelvingDefaults, shelvingSpace, shelvingParts } = require(join(out, 'shelving.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const { unitTransform } = require(join(out, 'assembly.js'));
const fixture = process.env.CODEBUDDY_SHELVING_FIXTURES ? resolve(process.env.CODEBUDDY_SHELVING_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixture, { recursive: true });
const manifest = [];
const base = () => ({ ...createProjectConfig('stand'), depth: 8, back: false, led: false, counter: false, spots: false,
    shelving: true, shelfDetailed: true });
const cases = [
    ['padrao', base()],
    ['sem-fundo', { ...base(), shelfBackEnabled: false }],
    ['sem-rodape', { ...base(), shelfBaseEnabled: false }],
    ['aberta', { ...base(), shelfBackEnabled: false, shelfBaseEnabled: false }],
    ['sem-prateleiras', { ...base(), shelfShelfCount: 0 }],
    ['seis-prateleiras', { ...base(), shelfShelfCount: 6 }],
    ['placas-finas', { ...base(), shelfBoardThickness: .015 }],
    ['placas-grossas', { ...base(), shelfBoardThickness: .08, shelfHeight: 2.4 }],
    ['fundo-fino', { ...base(), shelfBackThickness: .006 }],
    ['fundo-espesso', { ...base(), shelfBackThickness: .05 }],
    ['rodape-alto', { ...base(), shelfBaseHeight: .2 }],
    ['rodape-sem-recuo', { ...base(), shelfBaseInset: 0 }],
    ['recuo-maximo', { ...base(), shelfBaseInset: .1, shelfDepth: .25 }],
    ['minima', { ...base(), shelfWidth: .4, shelfDepth: .25, shelfHeight: .4, shelfShelfCount: 1,
        shelfBoardThickness: .015, shelfBaseHeight: .04, shelfBackThickness: .006 }],
    ['maxima', { ...base(), width: 14, depth: 12, shelfWidth: 3, shelfDepth: 1.5, shelfHeight: 3,
        shelfShelfCount: 6, shelfBoardThickness: .08, shelfBaseHeight: .2 }],
    ['vao-exato', { ...base(), shelfHeight: .75, shelfShelfCount: 4, shelfBoardThickness: .025, shelfBaseHeight: .1 }],
    ['materiais', { ...base(), color: '#e85c20', shelfMat: 'wood', shelfShelfMat: 'white', shelfBackMat: 'brand', shelfBaseMat: 'metal' }],
    ['tres-estantes', { ...base(), shelfCount: 3 }],
    ['segundo-ajustado', { ...base(), width: 14, depth: 12, shelfCount: 2,
        objectTransforms: { 'shelving:1': { x: 2, y: 2, rotation: 45 } } }],
    ['painel-e-estantes', { ...base(), width: 14, depth: 12, shelfCount: 2, backdrops: true, backdropDetailed: true, backdropFrameEnabled: true }],
    ['palco', { ...base(), projectType: 'palco', stage: true, stageWidth: 4, stageDepth: 2 }],
    ['legado', { ...base(), shelfDetailed: false, shelfBackEnabled: false, shelfBaseEnabled: false }],
    ['desligada', { ...base(), shelving: false }],
    ...[0, 90, 180, 270].map(frontRotation => ['frente-' + frontRotation, { ...base(), frontRotation }]),
    ...[45, 90, -90].map(rotation => ['ajuste-' + rotation, { ...base(), objectTransforms: { 'shelving:0': { x: 0, y: 0, rotation } } }]),
    ['giro-combinado', { ...base(), frontRotation: 90, objectTransforms: { 'shelving:0': { x: 0, y: 0, rotation: 45 } } }],
];
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

for (const [id, c] of cases) test('estantes: ' + id, () => {
    const before = JSON.stringify(c);
    validate(c);
    const units = assemblyGeometry(c).filter(u => u.id.startsWith('shelving:'));
    assert.equal(units.length, c.shelving ? c.shelfCount : 0);
    const parts = shelvingParts(c), space = shelvingSpace(c);
    assert.equal(parts.filter(p => p.role === 'shelving_shelf').length, c.shelfShelfCount);
    assert.equal(parts.some(p => p.role === 'shelving_back'), !c.shelfDetailed || c.shelfBackEnabled);
    assert.equal(parts.some(p => p.role === 'shelving_plinth'), c.shelfDetailed && c.shelfBaseEnabled);
    for (const part of parts) {
        assert.ok(part.size.every(n => n > 0));
        assert.ok(Math.abs(part.center[0]) + part.size[0] / 2 <= c.shelfWidth / 2 + 1e-7);
        assert.ok(Math.abs(part.center[1]) + part.size[1] / 2 <= c.shelfDepth / 2 + 1e-7);
        assert.ok(part.center[2] - part.size[2] / 2 >= .1 - 1e-7);
        assert.ok(part.center[2] + part.size[2] / 2 <= .1 + c.shelfHeight + 1e-7);
    }
    if (c.shelfDetailed) {
        const boards = parts.filter(p => ['shelving_bottom', 'shelving_shelf', 'shelving_top'].includes(p.role))
            .sort((a, b) => a.center[2] - b.center[2]);
        for (let i = 1; i < boards.length; i++) {
            const actual = boards[i].center[2] - boards[i].size[2] / 2 - boards[i - 1].center[2] - boards[i - 1].size[2] / 2;
            near(actual, space.gap);
            assert.ok(actual >= .1 - 1e-7);
        }
        for (let i = 0; i < parts.length; i++) for (const b of parts.slice(i + 1)) {
            const a = parts[i];
            assert.ok(!a.center.every((v, axis) => Math.abs(v - b.center[axis]) < (a.size[axis] + b.size[axis]) / 2 - 1e-7), `${a.name}/${b.name}`);
        }
    }
    const restored = parseProject(serializeProject(c));
    assert.deepEqual(restored, c);
    for (const target of ['blender', 'max']) {
        const script = generate({ ...c, target });
        assert.equal(script, generate({ ...restored, target }));
        assert.equal(script.includes('shelving_side_left'), c.shelving && c.shelfDetailed);
        if (c.shelving && c.shelfDetailed) {
            assert.equal(script.includes('shelving_back'), c.shelfBackEnabled);
            assert.equal(script.includes('shelving_plinth'), c.shelfBaseEnabled);
            assert.ok(script.includes('assembly_unit'));
            if (target === 'max' && Object.keys(c.objectTransforms).length) assert.ok(script.includes('obj.name'));
        }
        writeFileSync(join(fixture, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    manifest.push({ id, config: c, parts, units: units.map(u => ({ id: u.id, transform: unitTransform(c, u) })) });
    writeFileSync(join(fixture, 'manifest.json'), JSON.stringify(manifest));
    assert.equal(JSON.stringify(c), before);
});

test('JSON anterior recebe o modo simples sem perder os cinco tipos e seus ajustes', () => {
    for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
        const c = type === 'stand' ? { ...base(), objectTransforms: { 'shelving:0': { x: 0, y: 0, rotation: 45 } } } : createProjectConfig(type);
        const old = { ...c };
        for (const key of Object.keys(shelvingDefaults)) delete old[key];
        const expected = { ...c, ...shelvingDefaults };
        for (let version = 1; version <= 15; version++) {
            assert.deepEqual(parseProject(JSON.stringify({ format: 'code-buddy-project', version, config: old })), expected);
        }
        assert.deepEqual(parseProject(JSON.stringify(old)), expected);
    }
});

test('versão atual exige os campos das estantes e rejeita dados corrompidos', () => {
    for (const key of Object.keys(shelvingDefaults)) {
        const doc = JSON.parse(serializeProject(base()));
        assert.equal(doc.version, 20);
        delete doc.config[key];
        assert.throws(() => parseProject(JSON.stringify(doc)), /ausente/);
    }
    for (const patch of [{ shelfDetailed: 'sim' }, { shelfBackEnabled: 1 }, { shelfBaseEnabled: null },
        { shelfShelfMat: 'outro' }, { shelfBackMat: 'outro' }, { shelfBaseMat: 'outro' },
        { shelfBoardThickness: .01 }, { shelfBackThickness: .1 }, { shelfBaseHeight: .3 }, { shelfBaseInset: -.01 },
        { shelfShelfCount: 1.5 }, { shelfHeight: .4, shelfShelfCount: 4 },
        { shelfHeight: .749999, shelfShelfCount: 4, shelfBoardThickness: .025, shelfBaseHeight: .1 }]) {
        const c = { ...base(), ...patch }, before = JSON.stringify(c);
        assert.throws(() => validate(c), JSON.stringify(patch));
        assert.throws(() => serializeProject(c));
        assert.equal(JSON.stringify(c), before);
    }
});
