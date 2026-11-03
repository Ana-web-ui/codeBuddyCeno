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
const { structureLayout } = require(join(out, 'structure-layout.js'));
const { receptionGeometry } = require(join(out, 'reception.js'));
const { serializeProject, parseProject } = require(join(out, 'project-file.js'));
const fixtures = process.env.CODEBUDDY_STRUCTURE_FIXTURES ? resolve(process.env.CODEBUDDY_STRUCTURE_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixtures, { recursive: true });
const stand = () => ({ ...createProjectConfig('stand'), width: 12, depth: 10, back: false, led: false, spots: false, totem: false, counterCount: 2 });
const stage = () => ({ ...createProjectConfig('palco'), width: 12, depth: 10, chairs: false, led: false, spots: false });
const logo = 'data:image/png;base64,' + readFileSync('tests/fixtures/branding-logo.png').toString('base64');
const moves = { 'counter:0': { x: -2, y: -1.5, rotation: 35 }, 'counter:1': { x: 2, y: -2, rotation: -25 } };
const cases = [
    ['balcoes-simples', { ...stand(), objectTransforms: moves }],
    ['balcoes-detalhados-arte', { ...stand(), counterDetailed: true, counterArtEnabled: true, counterArtImage: logo, counterArtName: 'Marca.png', objectTransforms: moves }],
    ['palco-girado', { ...stage(), objectTransforms: { 'stage:0': { x: 1, y: 1, rotation: 20 } } }],
    ['palco-com-plateia', { ...stage(), chairs: true, objectTransforms: { 'stage:0': { x: .3, y: structureLayout(stage()).stage.y, rotation: 0 } } }],
    ['recepcao-individual', { ...createProjectConfig('reception'), objectTransforms: { 'counter:1': { x: .15, y: .8, rotation: 0 } } }],
    ['recepcao-fila', { ...createProjectConfig('reception'), receptionQueueEnabled: true, receptionBarriersEnabled: true, receptionSignEnabled: true, objectTransforms: Object.fromEntries(structureLayout(createProjectConfig('reception')).counters.map((t,i) => [`counter:${i}`, { x: t.x + .3, y: t.y + .5, rotation: 0 }])) }],
    ...[90,180,270].map(frontRotation => ['frente-' + frontRotation, { ...stand(), frontRotation, objectTransforms: moves }]),
];
const manifest = [];
for (const [id,c] of cases) test('movimentação estrutural: ' + id, () => {
    const before = JSON.stringify(c);
    validate(c);
    const restored = parseProject(serializeProject(c));
    assert.deepEqual(restored, c);
    for (const [key,t] of Object.entries(c.objectTransforms)) {
        const unit = assemblyGeometry(c).find(u => u.id === key);
        assert.ok(unit, key);
        const member = placedMembers(c, unit)[0];
        assert.equal(member.x, t.x); assert.equal(member.y, t.y); assert.equal(member.rotation, t.rotation);
    }
    for (const target of ['blender','max']) {
        const script = generate({ ...c, target }, { confirmedPartial: JSON.stringify({ ...c, target }) });
        assert.equal(script, generate({ ...restored, target }, { confirmedPartial: JSON.stringify({ ...restored, target }) }));
        writeFileSync(join(fixtures, id + (target === 'blender' ? '.py' : '.ms')), script);
        if (c.stage) assert.ok(script.includes('stage:0'));
        if (c.counter) assert.ok(script.includes('counter:0'));
    }
    manifest.push({ id, config: c });
    writeFileSync(join(fixtures, 'manifest.json'), JSON.stringify(manifest));
    assert.equal(JSON.stringify(c), before);
});
test('recepção recalcula atendimento, equipe e percurso após mover os balcões', () => {
    const c = cases.find(([id]) => id === 'recepcao-fila')[1];
    const a = receptionGeometry(createProjectConfig('reception')), b = receptionGeometry(c);
    assert.ok(Math.abs(b.service.x - .3) < 1e-8);
    assert.ok(Math.abs(b.service.y - a.service.y - .5) < 1e-8);
    assert.ok(Math.abs(b.team.y - a.team.y - .5) < 1e-8);
    assert.equal(b.details.sign.x, b.team.x);
    b.counters.forEach(counter => assert.ok(b.flow.routes.some(route => route.points.some(point => point.x === counter.x))));
});
test('rejeita sobreposição, saída do piso, invasão da plateia, IDs ausentes e giro da recepção', () => {
    for (const c of [
        { ...stand(), objectTransforms: { 'counter:0': { x: 30, y: 0, rotation: 0 } } },
        { ...stand(), objectTransforms: { 'counter:0': { ...structureLayout(stand()).counters[1] } } },
        { ...stage(), chairs: true, objectTransforms: { 'stage:0': { x: 0, y: 0, rotation: 0 } } },
        { ...stand(), objectTransforms: { 'stage:0': { x: 0, y: 0, rotation: 0 } } },
        { ...createProjectConfig('reception'), objectTransforms: { 'counter:1': { x: 0, y: .5, rotation: 30 } } },
    ]) assert.throws(() => validate(c));
});
test('sem ajustes os balcões e o palco mantêm as posições automáticas', () => {
    for (const type of ['stand','palco','lounge','reception','activation']) {
        const c = createProjectConfig(type); validate(c);
        for (const unit of assemblyGeometry(c).filter(u => /^(stage|counter):/.test(u.id))) {
            const [m] = placedMembers(c, unit);
            assert.equal(m.x, unit.x); assert.equal(m.y, unit.y); assert.equal(m.rotation, 0);
        }
    }
});
