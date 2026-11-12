import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const out = mkdtempSync(join(tmpdir(), 'codebuddy-reception-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out,
    'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { geometry, generate, validate } = require(join(out, 'generator.js'));
const { receptionGeometry, receptionDefaults, receptionQueueDefaults } = require(join(out, 'reception.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const base = () => createProjectConfig('reception');
const fixture = process.env.CODEBUDDY_RECEPTION_FIXTURES
    ? resolve(process.env.CODEBUDDY_RECEPTION_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixture, { recursive: true });
const manifest = [];
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const overlaps = (a, b) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 1e-7 &&
    Math.abs(a.y - b.y) < (a.depth + b.depth) / 2 - 1e-7;
const cases = [
    ['padrao', base()],
    ['fila-direita', { ...base(), receptionQueueEnabled: true }],
    ['fila-esquerda', { ...base(), receptionQueueEnabled: true, receptionExitSide: 'left' }],
    ['um-balcao', { ...base(), counterCount: 1, counterWidth: 2.4, receptionQueueEnabled: true }],
    ['seis-balcoes', { ...base(), width: 18, counterCount: 6, receptionQueueEnabled: true }],
    ['fila-larga', { ...base(), depth: 10, receptionQueueEnabled: true, receptionQueueWidth: 1.2 }],
    ['fileira-fundo', { ...base(), receptionRowY: 1.5, receptionQueueEnabled: true }],
    ['fileira-frente', { ...base(), depth: 10, receptionRowY: -1, receptionQueueEnabled: true }],
    ['fila-longa', { ...base(), depth: 14, receptionQueueEnabled: true, receptionQueueDepth: 4 }],
    ['balcao-profundo', { ...base(), depth: 12, counterDepth: 1.2, receptionQueueEnabled: true }],
    ['espacamento', { ...base(), width: 14, receptionCounterGap: 1.2, receptionQueueEnabled: true }],
    ['materiais', { ...base(), counterMat: 'wood', floorMat: 'concrete', receptionQueueEnabled: true }],
];

for (const [id, c] of cases) test('recepção: ' + id, () => {
    const before = JSON.stringify(c);
    validate(c);
    const g = receptionGeometry(c), positions = geometry(c);
    assert.equal(g.counters.length, c.counterCount);
    close(g.counters.reduce((sum, p) => sum + p.x, 0), 0);
    for (let i = 1; i < g.counters.length; i++) {
        close(g.counters[i].x - g.counters[i - 1].x - c.counterWidth - .08, c.receptionCounterGap);
    }
    assert.deepEqual(positions.counterXs, g.counters.map(p => p.x));
    assert.equal(positions.counterY, c.receptionRowY);
    for (const zone of [...g.counters, ...g.zones, ...(g.flow?.corridors ?? [])]) {
        assert.ok(Math.abs(zone.x) + zone.width / 2 <= c.width / 2 - .5 + 1e-7);
        assert.ok(Math.abs(zone.y) + zone.depth / 2 <= c.depth / 2 - .5 + 1e-7);
    }
    if (g.flow) {
        const f = g.flow;
        assert.equal(f.routes.filter(r => r.name.startsWith('Acesso ao')).length, c.counterCount);
        for (const zone of [...f.corridors, f.queue]) {
            assert.ok(![...g.counters, g.team, ...g.sideAccesses].some(obstacle => overlaps(zone, obstacle)));
        }
        const path = name => f.routes.find(r => r.name === name).points;
        assert.deepEqual(path('Entrada').at(-1), path('Fila')[0]);
        assert.deepEqual(path('Fila').at(-1), path('Distribuição')[0]);
        assert.deepEqual(path('Distribuição').at(-1), path('Saída')[0]);
        const exitCorridor = f.corridors.find(z => z.name === 'Saída');
        assert.ok(!overlaps(f.queue, exitCorridor));
        assert.equal(Math.sign(f.exit.x), c.receptionExitSide === 'left' ? -1 : 1);
    }
    const restored = parseProject(serializeProject(c));
    assert.deepEqual(restored, c);
    for (const target of ['blender', 'max']) {
        const script = generate({ ...c, target });
        assert.equal(script, generate({ ...restored, target }));
        if (c.counterDetailed) {
            for (const [index, x] of positions.counterXs.entries()) {
                assert.ok(script.includes(`counter:${index}`));
                assert.ok(script.includes(target === 'blender'
                    ? `location = (${x}, ${c.receptionRowY}, .1)`
                    : `pos:[${x}*METRO,${c.receptionRowY}*METRO,.1*METRO]`));
            }
        } else {
            const array = positions.counterXs.join(', ');
            assert.ok(script.includes(target === 'blender' ? `x = [${array}][i]` : `local x = (#(${array}))[i]`));
            assert.ok(script.includes(`y = ${c.receptionRowY}`));
        }
        writeFileSync(join(fixture, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    assert.equal(JSON.stringify(c), before);
    manifest.push({ id, config: c, counters: g.counters });
    writeFileSync(join(fixture, 'manifest.json'), JSON.stringify(manifest));
});

test('migração das versões 10 e 11 preserva todos os tipos e mantém fila desativada', () => {
    for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
        for (const version of [10, 11]) {
            const c = createProjectConfig(type), old = { ...c };
            for (const key of Object.keys(version === 10 ? receptionDefaults : receptionQueueDefaults)) delete old[key];
            assert.deepEqual(parseProject(JSON.stringify({ format: 'code-buddy-project', version, config: old })), c);
        }
    }
});

test('versão atual exige todos os campos; campos ausentes e valores inválidos não viram padrões', () => {
    for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
        for (const key of ['frontRotation', ...Object.keys(receptionDefaults)]) {
            const doc = JSON.parse(serializeProject(createProjectConfig(type)));
            delete doc.config[key];
            assert.throws(() => parseProject(JSON.stringify(doc)), /ausente/);
        }
    }
    for (const patch of [{ receptionExitSide: 'back' }, { receptionQueueEnabled: 'sim' },
        { receptionQueueWidth: null }, { receptionRowY: '1' }]) {
        const doc = JSON.parse(serializeProject(base()));
        Object.assign(doc.config, patch);
        assert.throws(() => parseProject(JSON.stringify(doc)));
    }
});

test('bloqueia dimensões, sobreposições, fluxos sem espaço e itens indisponíveis sem mutar o projeto', () => {
    for (const patch of [
        { counter: false }, { counterCount: 2.5 }, { counterCount: 7 },
        { width: 5 }, { depth: 3 }, { receptionCounterGap: .05 }, { receptionRowY: 4 },
        { receptionQueueWidth: .5 }, { receptionQueueWidth: NaN },
        { receptionQueueDepth: .5 }, { receptionQueueDepth: 6 },
        { receptionQueueWidth: 1.5, receptionServiceDepth: 1.2 },
        { receptionExitSide: 'back' }, { receptionQueueEnabled: 'sim' },
        { counterCount: 1 }, { receptionTeamDepth: 4 },
        { totem: true }, { touchScreens: true }, { back: true },
        { objectTransforms: { 'receptionCounter:0': { x: 0, y: 0, rotation: 0 } } },
    ]) {
        const c = { ...base(), receptionQueueEnabled: true, ...patch };
        const before = JSON.stringify(c);
        assert.throws(() => validate(c), JSON.stringify(patch));
        assert.equal(JSON.stringify(c), before);
    }
});
