import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-structure-move-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { validate, generate, assemblyGeometry } = require(join(out, 'generator.js'));
const { placedMembers } = require(join(out, 'assembly.js'));
const { serializeProject, parseProject } = require(join(out, 'project-file.js'));
const fixtures = process.env.CODEBUDDY_LED_FIXTURES ? resolve(process.env.CODEBUDDY_LED_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixtures, { recursive: true });
const image = 'data:image/png;base64,' + readFileSync('tests/fixtures/branding-logo.png').toString('base64');
const base = () => ({ ...createProjectConfig('stand'), width: 12, depth: 10, spots: false });
const cases = [
    ['parede', { ...base(), objectTransforms: { 'led:0': { x: 1, y: 1, rotation: 30 } } }],
    ['ilha-com-arte', { ...base(), back: false, screenImage: image, screenName: 'Marca.png', objectTransforms: { 'led:0': { x: -1, y: 1, rotation: -40 } } }],
    ['margem-suportes', { ...base(), back: false, objectTransforms: { 'led:0': { x: 1, y: 4.65, rotation: 0 } } }],
    ...[90,180,270].map(frontRotation => ['frente-' + frontRotation, { ...base(), frontRotation, objectTransforms: { 'led:0': { x: 1, y: 1, rotation: 30 } } }]),
];
const manifest = [];
for (const [id,c] of cases) test('LED móvel: ' + id, () => {
    validate(c);
    const unit = assemblyGeometry(c).find(u => u.id === 'led:0');
    assert.ok(unit); assert.equal(unit.members.length, 3);
    const [m] = placedMembers(c, unit);
    assert.equal(m.x, c.objectTransforms['led:0'].x);
    assert.equal(m.y, c.objectTransforms['led:0'].y);
    assert.equal(m.rotation, c.objectTransforms['led:0'].rotation);
    const restored = parseProject(serializeProject(c));
    assert.deepEqual(restored, c);
    for (const target of ['blender','max']) {
        const script = generate({ ...c, target });
        assert.equal(script, generate({ ...restored, target }));
        assert.ok(script.includes('MONTAGEM INDIVIDUAL: led:0'));
        assert.ok(script.includes('LED_Moldura') && script.includes('LED_Suporte') && script.includes('LED_Base'));
        writeFileSync(join(fixtures, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    manifest.push({ id, config: c });
    writeFileSync(join(fixtures, 'manifest.json'), JSON.stringify(manifest));
});
test('LED bloqueia saída do piso, choque com balcão, depósito e parede, e ID desativado', () => {
    for (const c of [
        { ...base(), objectTransforms: { 'led:0': { x: 8, y: 1, rotation: 0 } } },
        { ...base(), objectTransforms: { 'led:0': { x: 0, y: -2.8, rotation: 0 } } },
        { ...base(), objectTransforms: { 'led:0': { x: 0, y: 4.8, rotation: 0 } } },
        { ...base(), led: false, objectTransforms: { 'led:0': { x: 1, y: 1, rotation: 0 } } },
        { ...base(), storageEnabled: true, storageX: -4, storageY: 3, objectTransforms: { 'led:0': { x: -4, y: 3, rotation: 0 } } },
    ]) assert.throws(() => validate(c));
});
test('ajustes de outros móveis respeitam o LED movido e podem ocupar sua posição antiga', () => {
    const c = { ...base(), objectTransforms: { 'led:0': { x: 0, y: 1, rotation: 0 }, 'counter:0': { x: 0, y: 4, rotation: 0 } } };
    validate(c);
    assert.throws(() => validate({ ...c, objectTransforms: { ...c.objectTransforms, 'counter:0': { x: 0, y: 1, rotation: 0 } } }));
});
test('posição automática e suporte original continuam ao restaurar o LED', () => {
    for (const back of [true,false]) {
        const c = { ...base(), back };
        validate(c);
        const unit = assemblyGeometry(c).find(u => u.id === 'led:0');
        assert.equal(unit.y, 4.65); assert.equal(unit.members.length, back ? 1 : 3);
        for (const target of ['blender','max']) assert.ok(!generate({ ...c, target }).includes('MONTAGEM INDIVIDUAL: led:0'));
    }
});
