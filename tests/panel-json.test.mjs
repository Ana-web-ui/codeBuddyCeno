import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const out = mkdtempSync(join(tmpdir(), 'codebuddy-panel-json-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out,
    'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { panelDefaults } = require(join(out, 'panel.js'));
const { parseProject, serializeProject } = require(join(out, 'project-file.js'));
const envelope = (config, version) => JSON.stringify({ format: 'code-buddy-project', version, config });

test('versões 1 a 14 recebem campos dos painéis sem modificar os cinco tipos de projeto', () => {
    for (const type of ['stand', 'palco', 'lounge', 'activation', 'reception']) {
        const c = { ...createProjectConfig(type), name: 'Projeto anterior', color: '#a13287' };
        const old = { ...c };
        for (const key of Object.keys(panelDefaults)) delete old[key];
        for (let version = 1; version <= 14; version++) {
            assert.deepEqual(parseProject(envelope(old, version)), c);
        }
        assert.deepEqual(parseProject(JSON.stringify(old)), c);
        assert.deepEqual(parseProject(JSON.stringify({ config: old })), c);
    }
});

test('salva versão 16 e preserva todos os ajustes do painel ao reabrir', () => {
    const c = { ...createProjectConfig('stand'), back: false, led: false, counter: false, spots: false,
        backdrops: true, backdropDetailed: true, backdropFrameEnabled: true,
        backdropFrameWidth: .08, backdropFrameDepth: .05, backdropFrameMat: 'wood',
        backdropStructureMat: 'metal', backdropBaseMat: 'concrete' };
    const before = JSON.stringify(c), text = serializeProject(c);
    assert.equal(JSON.parse(text).version, 19);
    assert.deepEqual(parseProject(text), c);
    assert.equal(JSON.stringify(c), before);
});

test('migração preenche somente os campos ausentes e preserva os presentes', () => {
    const old = { ...createProjectConfig('stand') };
    for (const key of Object.keys(panelDefaults)) delete old[key];
    Object.assign(old, { backdropDetailed: true, backdropFrameWidth: .12, backdropFrameMat: 'brand' });
    assert.deepEqual(parseProject(envelope(old, 14)), { ...createProjectConfig('stand'), ...old });
});

test('versão 15 exige os novos campos; migrações não escondem dados inválidos', () => {
    for (const key of Object.keys(panelDefaults)) {
        const c = { ...createProjectConfig('stand') };
        delete c[key];
        assert.throws(() => parseProject(envelope(c, 15)), /ausente/);
    }
    for (const version of [14, 15]) {
        for (const patch of [{ backdropDetailed: 'false' }, { backdropFrameEnabled: null },
            { backdropFrameWidth: 0 }, { backdropFrameDepth: '0.03' },
            { backdropFrameMat: 'outro' }, { backdropStructureMat: 'outro' }, { backdropBaseMat: 'outro' }]) {
            assert.throws(() => parseProject(envelope({ ...createProjectConfig('stand'), ...patch }, version)));
        }
    }
});

test('continua rejeitando versões futuras e campos desconhecidos', () => {
    assert.throws(() => parseProject(envelope(createProjectConfig('stand'), 20)), /versão/);
    assert.throws(() => parseProject(envelope({ ...createProjectConfig('stand'), campoInventado: true }, 15)), /desconhecidos/);
});
