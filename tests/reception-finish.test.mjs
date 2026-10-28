import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-reception-finish-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { generate, validate } = require(join(out, 'generator.js'));
const { receptionGeometry } = require(join(out, 'reception.js'));
const { receptionFinishDefaults } = require(join(out, 'reception-finish.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const base = () => ({ ...createProjectConfig('reception'), receptionQueueEnabled: true,
    receptionBarriersEnabled: true, receptionSignEnabled: true, receptionExportGuides: true });
const fixture = process.env.CODEBUDDY_RECEPTION_FINISH_FIXTURES
    ? resolve(process.env.CODEBUDDY_RECEPTION_FINISH_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixture, { recursive: true });
const manifest = [];
const cases = [
    ['completa', base()],
    ['sem-postes', { ...base(), receptionBarriersEnabled: false }],
    ['sem-placa', { ...base(), receptionSignEnabled: false }],
    ['sem-guias', { ...base(), receptionExportGuides: false }],
    ['sem-fila', { ...base(), receptionQueueEnabled: false, receptionBarriersEnabled: false }],
    ['texto-aspas', { ...base(), receptionSignText: 'Acesso "VIP" \\ Recepção' }],
    ['texto-longo', { ...base(), receptionSignText: 'W'.repeat(48) }],
    ['placa-estreita', { ...base(), receptionSignWidth: .8 }],
    ['placa-larga', { ...base(), receptionSignWidth: 3 }],
    ['placa-alta', { ...base(), receptionSignHeight: 3 }],
    ['postes-proximos', { ...base(), receptionBarrierSpan: .5 }],
    ['fila-longa', { ...base(), depth: 14, receptionQueueDepth: 4 }],
    ['seis-balcoes', { ...base(), width: 18, counterCount: 6 }],
    ['largura-livre', { ...base(), depth: 10, receptionQueueWidth: 1.5, receptionServiceDepth: 1.5 }],
    ['balcoes-simples', { ...base(), counterDetailed: false }],
    ...[0, 90, 180, 270].flatMap(frontRotation => ['left', 'right'].map(receptionExitSide =>
        [`giro-${frontRotation}-${receptionExitSide}`, { ...base(), frontRotation, receptionExitSide }])),
];

for (const [id, c] of cases) test('recepção completa: ' + id, () => {
    const before = JSON.stringify(c);
    validate(c);
    const g = receptionGeometry(c), d = g.details;
    for (const base of d.footprints) {
        assert.ok(Math.abs(base.x) + base.width / 2 <= c.width / 2 - .5 + 1e-7);
        assert.ok(Math.abs(base.y) + base.depth / 2 <= c.depth / 2 - .5 + 1e-7);
    }
    if (c.receptionBarriersEnabled) {
        assert.ok(d.posts.length >= 4);
        for (const post of d.posts) assert.ok(Math.abs(post.x - g.flow.queue.x) - .14 >= c.receptionQueueWidth / 2 - 1e-7);
        for (const belt of d.belts) assert.ok(belt.to - belt.from <= c.receptionBarrierSpan + 1e-7);
    } else assert.equal(d.posts.length, 0);
    assert.equal(Boolean(d.sign), c.receptionSignEnabled);
    assert.deepEqual(parseProject(serializeProject(c)), c);
    const guides = c.receptionExportGuides ? [...g.zones, ...(g.flow ? [g.flow.queue, ...g.flow.corridors] : [])] : [];
    for (const target of ['blender', 'max']) {
        const script = generate({ ...c, target });
        assert.equal(script, generate({ ...parseProject(serializeProject(c)), target }));
        assert.equal(script.includes('reception_post_base'), c.receptionBarriersEnabled);
        assert.equal(script.includes('reception_sign_text'), c.receptionSignEnabled);
        assert.equal(script.includes('reception_zone'), c.receptionExportGuides);
        assert.ok(script.includes(target === 'blender' ? `angulo = ${c.frontRotation}` : `local anguloFrente = ${c.frontRotation}`));
        if (target === 'max' && c.receptionSignEnabled) assert.ok(script.includes(`text:${JSON.stringify(c.receptionSignText)}`));
        writeFileSync(join(fixture, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    assert.equal(JSON.stringify(c), before);
    manifest.push({ id, config: c, details: d, guides });
    writeFileSync(join(fixture, 'manifest.json'), JSON.stringify(manifest));
});

test('arquivos até a versão 13 recebem os opcionais desligados sem perder fila, orientação ou balcões', () => {
    for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
        const c = type === 'reception' ? { ...base(), frontRotation: 90 } : createProjectConfig(type);
        const old = { ...c };
        for (const key of Object.keys(receptionFinishDefaults)) delete old[key];
        assert.deepEqual(parseProject(JSON.stringify({ format: 'code-buddy-project', version: 13, config: old })),
            { ...c, ...receptionFinishDefaults });
    }
});

test('campos obrigatórios e materiais inválidos são rejeitados', () => {
    for (const key of Object.keys(receptionFinishDefaults)) {
        const doc = JSON.parse(serializeProject(base()));
        assert.equal(doc.version, 16);
        delete doc.config[key];
        assert.throws(() => parseProject(JSON.stringify(doc)), /ausente/);
    }
    for (const patch of [
        { receptionBarriersEnabled: 'sim' }, { receptionExportGuides: 1 }, { receptionSignEnabled: null },
        { receptionSignText: '' }, { receptionSignText: 'x'.repeat(49) }, { receptionSignText: 'duas\nlinhas' },
        { receptionBarrierMat: 'outro' }, { receptionBeltMat: 'outro' }, { receptionSignTextMat: 'outro' },
        { receptionBarrierHeight: .5 }, { receptionBarrierSpan: 2 }, { receptionSignWidth: 4 },
        { receptionSignHeight: 3, height: 2.5 }, { receptionRowY: 2 },
        { receptionQueueEnabled: false },
        // Corredores cabem, mas a base do organizador invadiria a saída.
        { counterCount: 1, counterWidth: 2.2, receptionQueueWidth: 1.04 },
    ]) {
        const c = { ...base(), ...patch }, before = JSON.stringify(c);
        assert.throws(() => validate(c), JSON.stringify(patch));
        assert.throws(() => serializeProject(c));
        assert.equal(JSON.stringify(c), before);
    }
});
