import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-counter-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig, createActivationModelConfig } = require(join(out, 'project-types.js'));
const { generate, geometry, validate } = require(join(out, 'generator.js'));
const { counterDefaults, counterParts } = require(join(out, 'counter.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const fixture = process.env.CODEBUDDY_COUNTER_FIXTURES ? resolve(process.env.CODEBUDDY_COUNTER_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixture, { recursive: true });
const manifest = [];
const base = () => createProjectConfig('reception');
const cases = [
    ['recepcao-padrao', base()],
    ['madeira-metal', { ...base(), counterCount: 1, counterWidth: 2.4, counterTopMat: 'wood', counterBaseMat: 'metal' }],
    ['tampo-espesso', { ...base(), counterTopThickness: .15, counterBaseHeight: .2 }],
    ['sem-recuo', { ...base(), counterBaseInset: 0 }],
    ['recuo-maximo', { ...base(), counterBaseInset: .1 }],
    ['pecas-finas', { ...base(), counterTopThickness: .02, counterBaseHeight: .02 }],
    ['fila-esquerda', { ...base(), receptionQueueEnabled: true, receptionExitSide: 'left' }],
    ['seis-balcoes', { ...base(), width: 18, counterCount: 6 }],
    ['legado-simples', { ...base(), counterDetailed: false }],
    ...[0, 90, 180, 270].map(frontRotation => ['stand-' + frontRotation, {
        ...createProjectConfig('stand'), standLayout: 'island', back: false, left: false, right: false,
        frontRotation, counterTopMat: 'wood', counterBaseMat: 'brand',
    }]),
];
for (const [id, c] of cases) test('balcão: ' + id, () => {
    const before = JSON.stringify(c);
    validate(c);
    const p = counterParts(c), g = geometry(c);
    const bounds = p.map(part => [part.z - part.size[2] / 2, part.z + part.size[2] / 2]).sort((a, b) => a[0] - b[0]);
    const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7);
    near(bounds[0][0], .1);
    near(bounds.at(-1)[1], .1 + c.counterHeight);
    for (let i = 1; i < bounds.length; i++) near(bounds[i - 1][1], bounds[i][0]);
    assert.equal(p.length, c.counterDetailed ? 3 : 2);
    near(p.find(part => part.role === 'counter_top').size[0], c.counterWidth + .08);
    near(p.find(part => part.role === 'counter_top').size[1], c.counterDepth + .08);
    const restored = parseProject(serializeProject(c));
    assert.deepEqual(restored, c);
    for (const target of ['blender', 'max']) {
        const script = generate({ ...c, target });
        assert.equal(script, generate({ ...restored, target }));
        if (c.counterDetailed) {
            for (const part of p) assert.ok(script.includes(part.role));
            assert.ok(script.includes('counter_unit'));
            if (target === 'max') assert.ok(script.includes('pecaBalcao.parent = raizBalcao'));
        }
        writeFileSync(join(fixture, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    manifest.push({ id, config: c, xs: g.counterXs, y: g.counterY, parts: p });
    writeFileSync(join(fixture, 'manifest.json'), JSON.stringify(manifest));
    assert.equal(JSON.stringify(c), before);
});

test('JSON anterior preserva construção simples, materiais, posições, fila e outros modelos', () => {
    const configs = ['stand', 'palco', 'lounge', 'activation', 'reception'].map(createProjectConfig);
    configs.push(createActivationModelConfig(createProjectConfig('activation'), 'sampling'));
    for (const c of configs) {
        const old = { ...c };
        for (const key of Object.keys(counterDefaults)) delete old[key];
        const restored = parseProject(JSON.stringify({ format: 'code-buddy-project', version: 12, config: old }));
        assert.deepEqual(restored, { ...c, ...counterDefaults });
        assert.deepEqual(parseProject(JSON.stringify(old)), restored);
        assert.equal(counterParts(restored).length, 2);
    }
});

test('JSON atual exige os novos campos e rejeita valores corrompidos', () => {
    for (const key of Object.keys(counterDefaults)) {
        const doc = JSON.parse(serializeProject(base()));
        assert.equal(doc.version, 20);
        delete doc.config[key];
        assert.throws(() => parseProject(JSON.stringify(doc)), /ausente/);
    }
    for (const patch of [{ counterDetailed: 'sim' }, { counterTopMat: 'outro' }, { counterBaseMat: null },
        { counterTopThickness: .01 }, { counterTopThickness: .2 }, { counterBaseHeight: -.1 },
        { counterBaseInset: .2 }, { counterHeight: .2 }, { counterDepth: .1, counterBaseInset: .04 }]) {
        const c = { ...base(), ...patch };
        assert.throws(() => validate(c));
        assert.throws(() => serializeProject(c));
    }
});
