import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-showcase-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { generate, validate, assemblyGeometry } = require(join(out, 'generator.js'));
const { showcaseDetailDefaults, showcaseSpace, showcaseParts } = require(join(out, 'showcase.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const { unitTransform } = require(join(out, 'assembly.js'));
const fixture = process.env.CODEBUDDY_SHOWCASE_FIXTURES ? resolve(process.env.CODEBUDDY_SHOWCASE_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixture, { recursive: true });
const manifest = [];
const base = () => ({ ...createProjectConfig('stand'), depth: 8, back: false, led: false, counter: false, spots: false,
    showcases: true, showcaseDetailed: true });
const cases = [
    ['padrao', base()],
    ['sem-perfis', { ...base(), showcaseProfilesEnabled: false }],
    ['sem-rodape', { ...base(), showcasePlinthEnabled: false }],
    ['sem-perfis-rodape', { ...base(), showcaseProfilesEnabled: false, showcasePlinthEnabled: false }],
    ['sem-prateleiras', { ...base(), showcaseShelfCount: 0 }],
    ['seis-prateleiras', { ...base(), showcaseShelfCount: 6 }],
    ['vidro-fino', { ...base(), showcaseGlassThickness: .004 }],
    ['vidro-espesso', { ...base(), showcaseGlassThickness: .03, showcaseProfileWidth: .04 }],
    ['perfil-minimo', { ...base(), showcaseProfileWidth: .01 }],
    ['perfil-maximo', { ...base(), showcaseProfileWidth: .06 }],
    ['rodape-alto', { ...base(), showcasePlinthHeight: .2 }],
    ['rodape-sem-recuo', { ...base(), showcasePlinthInset: 0 }],
    ['recuo-maximo', { ...base(), showcasePlinthInset: .1 }],
    ['tampo-espesso', { ...base(), showcaseDeckThickness: .08 }],
    ['minima', { ...base(), showcaseWidth: .3, showcaseDepth: .3, showcaseHeight: .6, showcaseBaseHeight: .105,
        showcasePlinthHeight: .04, showcaseDeckThickness: .01 + .005, showcaseShelfCount: 1 }],
    ['maxima', { ...base(), width: 14, depth: 12, showcaseWidth: 3, showcaseDepth: 2, showcaseHeight: 3,
        showcaseBaseHeight: 1.5, showcaseShelfCount: 6 }],
    ['vao-exato', { ...base(), showcaseHeight: 1.18, showcaseBaseHeight: .6, showcaseShelfCount: 4 }],
    ['materiais', { ...base(), color: '#2168bb', showcaseBaseMat: 'brand', showcaseDeckMat: 'wood', showcasePlinthMat: 'metal' }],
    ['optica', { ...base(), showcaseGlassRoughness: .15, showcaseGlassIor: 1.6, shelving: true, shelfDetailed: true, shelfShelfMat: 'glass' }],
    ['corpo-vidro', { ...base(), showcaseBaseMat: 'glass', showcaseProfileMat: 'glass', showcaseGlassRoughness: .2, showcaseGlassIor: 1.8 }],
    ['tres-vitrines', { ...base(), showcaseCount: 3 }],
    ['segunda-ajustada', { ...base(), width: 14, depth: 12, showcaseCount: 2,
        objectTransforms: { 'showcases:1': { x: 2, y: 2, rotation: 45 } } }],
    ['painel-estante-vitrine', { ...base(), width: 14, depth: 12, shelving: true, shelfDetailed: true,
        backdrops: true, backdropDetailed: true, backdropFrameEnabled: true }],
    ['palco', { ...base(), projectType: 'palco', stage: true, stageWidth: 4, stageDepth: 2 }],
    ['legado', { ...base(), showcaseDetailed: false }],
    ['desligada', { ...base(), showcases: false }],
    ...[0, 90, 180, 270].map(frontRotation => ['frente-' + frontRotation, { ...base(), frontRotation }]),
    ...[45, 90, -90].map(rotation => ['ajuste-' + rotation, { ...base(), objectTransforms: { 'showcases:0': { x: 0, y: 0, rotation } } }]),
    ['giro-combinado', { ...base(), frontRotation: 90, objectTransforms: { 'showcases:0': { x: 0, y: 0, rotation: 45 } } }],
];
for (const [id, c] of cases) test('vitrines: ' + id, () => {
    const before = JSON.stringify(c);
    validate(c);
    const units = assemblyGeometry(c).filter(u => u.id.startsWith('showcases:'));
    assert.equal(units.length, c.showcases ? c.showcaseCount : 0);
    const parts = showcaseParts(c), space = showcaseSpace(c);
    assert.equal(parts.filter(p => p.role === 'showcase_glass_shelf').length, c.showcaseShelfCount);
    assert.equal(parts.some(p => p.role === 'showcase_profile_post'), c.showcaseDetailed && c.showcaseProfilesEnabled);
    assert.equal(parts.some(p => p.role === 'showcase_plinth'), c.showcaseDetailed && c.showcasePlinthEnabled);
    for (const p of parts) {
        assert.ok(p.size.every(n => n > 0));
        assert.ok(Math.abs(p.center[0]) + p.size[0] / 2 <= c.showcaseWidth / 2 + 1e-7);
        assert.ok(Math.abs(p.center[1]) + p.size[1] / 2 <= c.showcaseDepth / 2 + 1e-7);
        assert.ok(p.center[2] - p.size[2] / 2 >= .1 - 1e-7);
        assert.ok(p.center[2] + p.size[2] / 2 <= .1 + c.showcaseHeight + 1e-7);
    }
    if (c.showcaseDetailed) {
        let previousTop = space.bottom;
        for (const p of parts.filter(p => p.role === 'showcase_glass_shelf')) {
            assert.ok(Math.abs(p.center[2] - p.size[2] / 2 - previousTop - space.gap) < 1e-7);
            previousTop = p.center[2] + p.size[2] / 2;
        }
        assert.ok(space.gap >= .1 - 1e-7);
        assert.ok(Math.abs(space.bottom + space.height - previousTop - space.gap) < 1e-7);
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
        assert.equal(script.includes('showcase_glass_left'), c.showcases && c.showcaseDetailed);
        if (c.showcases && c.showcaseDetailed) {
            assert.equal(script.includes('showcase_profile_post'), c.showcaseProfilesEnabled);
            assert.equal(script.includes('showcase_plinth'), c.showcasePlinthEnabled);
            assert.ok(script.includes('assembly_unit'));
            if (target === 'max') {
                assert.ok(script.includes('vidroVitrine.trans_ior = ' + c.showcaseGlassIor));
                assert.ok(script.includes('vidroVitrine.roughness = ' + c.showcaseGlassRoughness));
                assert.ok(script.includes('Vitrine_001_Vidro_Topo'));
            }
        }
        writeFileSync(join(fixture, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    manifest.push({ id, config: c, parts, units: units.map(u => ({ id: u.id, transform: unitTransform(c, u) })) });
    writeFileSync(join(fixture, 'manifest.json'), JSON.stringify(manifest));
    assert.equal(JSON.stringify(c), before);
});

test('JSON anterior recebe o modo simples nos cinco tipos, sem perder ajustes', () => {
    for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
        const c = type === 'stand' ? { ...base(), objectTransforms: { 'showcases:0': { x: 0, y: 0, rotation: 45 } } } : createProjectConfig(type);
        const old = { ...c };
        for (const key of Object.keys(showcaseDetailDefaults)) delete old[key];
        const expected = { ...c, ...showcaseDetailDefaults };
        for (let version = 1; version <= 16; version++)
            assert.deepEqual(parseProject(JSON.stringify({ format: 'code-buddy-project', version, config: old })), expected);
        assert.deepEqual(parseProject(JSON.stringify(old)), expected);
    }
});

test('JSON atual exige os campos, rejeita valores inválidos e versões futuras', () => {
    for (const key of Object.keys(showcaseDetailDefaults)) {
        const doc = JSON.parse(serializeProject(base()));
        assert.equal(doc.version, 19);
        delete doc.config[key];
        assert.throws(() => parseProject(JSON.stringify(doc)), /ausente/);
    }
    for (const patch of [{ showcaseDetailed: 'sim' }, { showcaseProfilesEnabled: 1 }, { showcasePlinthEnabled: null },
        { showcaseDeckMat: 'outro' }, { showcasePlinthMat: 'outro' }, { showcaseProfileMat: 'outro' },
        { showcaseDeckThickness: .001 }, { showcaseProfileWidth: .1 }, { showcasePlinthHeight: .3 },
        { showcasePlinthInset: -.01 }, { showcaseGlassRoughness: .21 }, { showcaseGlassIor: 1.2 },
        { showcaseShelfCount: 1.5 }, { showcaseHeight: .8 }, { showcaseBaseHeight: .1 },
        { showcaseGlassThickness: .03, showcaseProfileWidth: .02 },
        { showcaseHeight: 1.17999, showcaseShelfCount: 4 }]) {
        const c = { ...base(), ...patch }, before = JSON.stringify(c);
        assert.throws(() => validate(c), JSON.stringify(patch));
        assert.throws(() => serializeProject(c));
        assert.equal(JSON.stringify(c), before);
    }
    const doc = JSON.parse(serializeProject(base()));
    assert.throws(() => parseProject(JSON.stringify({ ...doc, version: 20 })), /versão/);
});
