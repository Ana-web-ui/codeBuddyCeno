import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-obj-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022',
    '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop',
    '--outDir', out, 'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { parseObj, modelGeometry, MAX_MODEL_BYTES } = require(join(out, 'imported-models.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const { generate, validate } = require(join(out, 'generator.js'));
const fixtures = process.env.CODEBUDDY_OBJ_FIXTURES ? resolve(process.env.CODEBUDDY_OBJ_FIXTURES) : join(out, 'fixtures');
mkdirSync(fixtures, { recursive: true });
const manifest = [];
// Duas partes, deslocadas da origem para verificar a centralização conjunta.
const source = `# Máquina de exemplo, geometria sem dependências externas
mtllib arquivo-que-nao-deve-ser-aberto.mtl
o Corpo
v 10 20 30
v 11 20 30
v 11 21 30
v 10 21 30
v 10 20 31
v 11 20 31
v 11 21 31
v 10 21 31
f 1 4 3 2
f 5 6 7 8
f 1 2 6 5
f 2 3 7 6
f 3 4 8 7
f 4 1 5 8
o Produto
v 10.2 20.2 31
v 10.8 20.2 31
v 10.5 20.8 31
v 10.5 20.5 31.6
f -4 -2 -3
f -4 -3 -1
f -3 -2 -1
f -2 -4 -1
`;
const model = (patch = {}) => ({ id: 1, name: 'Máquina de exemplo', source, unit: 'm', upAxis: 'z', scale: 1,
    x: 0, y: 0, z: 0, rotation: 0, material: 'metal', ...patch });
const scaledSource = factor => source.replace(/^v (.+)$/gm, (_, values) => 'v ' + values.split(' ').map(n => Number(n) * factor).join(' '));
const base = type => ({ ...createProjectConfig(type ?? 'stand'), importedModels: [model()] });
const cases = [
    ['padrao', base()], ['cm', { ...base(), importedModels: [model({ source: scaledSource(100), unit: 'cm' })] }],
    ['mm', { ...base(), importedModels: [model({ source: scaledSource(1000), unit: 'mm' })] }],
    ['eixo-y', { ...base(), importedModels: [model({ upAxis: 'y' })] }],
    ['elevado', { ...base(), importedModels: [model({ scale: .3, z: 1.06, x: 0, y: -1.4 })] }],
    ['deslocado', { ...base(), importedModels: [model({ x: 2, y: .5, rotation: -45, scale: .5 })] }],
    ['cinco', { ...base(), importedModels: Array.from({ length: 5 }, (_, i) => model({ id: i + 1, x: i - 2, scale: .3, material: i % 2 ? 'brand' : 'metal' })) }],
    ['nome-escapado', { ...base(), importedModels: [model({ name: 'Máquina "A" \\ produto', source: source.replace('o Corpo', 'o Corpo "x" \\ __import__(bad)') })] }],
    ...[0, 90, 180, 270].map(frontRotation => ['frente-' + frontRotation, { ...base(), frontRotation }]),
    ['giro-combinado', { ...base(), frontRotation: 90, importedModels: [model({ x: 1, y: .5, rotation: 45 })] }],
    ['montagem-ajustada', { ...base(), pedestals: true, pedestalCount: 1, objectTransforms: { 'pedestals:0': { x: 1, y: 0, rotation: 30 } } }],
    ...['palco', 'lounge', 'activation', 'reception'].map(type => [type, base(type)]),
    ['sem-modelo', { ...base(), importedModels: [] }],
];
for (const [id, config] of cases) test('OBJ: ' + id, () => {
    const before = JSON.stringify(config);
    validate(config);
    const restored = parseProject(serializeProject(config));
    assert.equal(JSON.parse(serializeProject(config)).version, 19);
    assert.deepEqual(restored, config);
    for (const target of ['blender', 'max']) {
        const script = generate({ ...config, target });
        assert.equal(script, generate({ ...restored, target }));
        for (const model of config.importedModels) {
            assert.ok(script.includes('importedModels:' + model.id));
            assert.ok(script.includes('imported_mesh'));
            assert.ok(!script.includes('arquivo-que-nao-deve-ser-aberto'));
        }
        writeFileSync(join(fixtures, id + (target === 'blender' ? '.py' : '.ms')), script);
    }
    manifest.push({ id, config, models: config.importedModels.map(m => ({ ...m, source: undefined, geometry: modelGeometry(m) })) });
    writeFileSync(join(fixtures, 'manifest.json'), JSON.stringify(manifest));
    assert.equal(JSON.stringify(config), before);
});

test('OBJ preserva as partes e ignora vértices soltos na dimensão útil', () => {
    const parsed = parseObj(source + '\nv 10000 10000 10000\n');
    assert.equal(parsed.meshes.length, 2);
    assert.equal(parsed.triangleCount, 16);
    assert.deepEqual(parsed.min, [10, 20, 30]);
    assert.deepEqual(parsed.max, [11, 21, 31.6]);
    for (const [unit, factor] of [['cm', 100], ['mm', 1000]]) {
        const size = modelGeometry(model({ unit, source: scaledSource(factor) })).size;
        assert.ok(size.every((n, i) => Math.abs(n - [1, 1, 1.6][i]) < 1e-10));
    }
    const yUp = modelGeometry(model({ upAxis: 'y' }));
    assert.ok(yUp.size.every((n, i) => Math.abs(n - [1, 1.6, 1][i]) < 1e-10));
    assert.ok(yUp.meshes[0].vertices.some(v => Math.abs(v[0] - .5) < 1e-10 && Math.abs(v[1] - .8) < 1e-10 && v[2] === 0));
    const geometry = modelGeometry(model());
    assert.ok(Math.abs(geometry.size[2] - 1.6) < 1e-10);
    assert.ok(geometry.meshes[0].vertices.some(v => v[0] === -.5 && v[1] === -.5 && v[2] === 0));
});

test('triangula uma face côncava sem preencher o recorte e conserva o winding', () => {
    const vertices = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]];
    for (const order of [[1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]]) {
        const obj = parseObj(vertices.map(p => `v ${p[0]} ${p[1]} 0`).join('\n') + '\nf ' + order.join(' '));
        const mesh = obj.meshes[0];
        const area = mesh.faces.reduce((sum, face) => {
            const [a, b, c] = face.map(i => mesh.vertices[i]);
            return sum + ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
        }, 0);
        assert.equal(Math.abs(area), 3);
        assert.equal(Math.sign(area), order[0] === 1 ? 1 : -1);
    }
});

test('recusa OBJ inválido, faces degeneradas, índices inexistentes e limites excedidos', () => {
    for (const text of ['', 'v 0 0 0', 'v NaN 0 0', 'v 0 0 Infinity', 'v 0 0 0\nf 1 2 3',
        'v 0 0 0\nv 1 0 0\nv 2 0 0\nf 1 2 3', source + '\nf 0 1 2', source + '\nf 1 2 999',
        source + '\nf 1 1 2', source + '\ncall malicious.obj', '#'.repeat(MAX_MODEL_BYTES + 1),
        'v 0 0 0\n'.repeat(20001)]) assert.throws(() => parseObj(text));
});

test('migra versões 1 a 18 nos cinco tipos e mantém os ajustes existentes', () => {
    for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
        const current = createProjectConfig(type), old = { ...current };
        delete old.importedModels;
        for (let version = 1; version <= 18; version++)
            assert.deepEqual(parseProject(JSON.stringify({ format: 'code-buddy-project', version, config: old })), current);
        assert.deepEqual(parseProject(JSON.stringify(old)), current);
    }
    const missing = { ...base() }; delete missing.importedModels;
    assert.throws(() => parseProject(JSON.stringify({ format: 'code-buddy-project', version: 19, config: missing })), /ausente/);
    assert.throws(() => parseProject(JSON.stringify({ format: 'code-buddy-project', version: 20, config: base() })), /versão/);
});

test('recusa dados corrompidos e alterações fora da área sem modificar a configuração', () => {
    for (const patch of [{ id: 0 }, { scale: 0 }, { x: 30 }, { z: -1 }, { z: 10 }, { rotation: 361 },
        { scale: 1000 }, { unit: 'in' }, { upAxis: 'x' }, { source: null }, { material: 'outro' },
        { name: '\ncomando' }, { unknown: 1 }]) {
        const c = { ...base(), importedModels: [model(patch)] }, before = JSON.stringify(c);
        assert.throws(() => serializeProject(c));
        assert.equal(JSON.stringify(c), before);
    }
    assert.throws(() => serializeProject({ ...base(), importedModels: [model(), model()] }), /repetida/);
    assert.throws(() => serializeProject({ ...base(), importedModels: Array.from({ length: 6 }, (_, i) => model({ id: i + 1 })) }));
    const clean = parseProject(serializeProject(base()));
    clean.importedModels[0].x = 1;
    assert.equal(base().importedModels[0].x, 0);
});
