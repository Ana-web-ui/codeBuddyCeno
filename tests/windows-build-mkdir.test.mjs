import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

// Exercita a função do pacote efetivamente instalado, não uma cópia da implementação.
const require = createRequire(import.meta.url);
const nitroRequire = createRequire(require.resolve('nitro/vite'));
const source = readFileSync(resolve(dirname(nitroRequire.resolve('nf3')), '_chunks/trace.mjs'), 'utf8');
const helper = source.match(/async function mkdirWithRetry\(dir\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(helper, 'O patch do nf3 deve ser aplicado pelo pnpm antes do teste.');
assert.match(source, /p = mkdirWithRetry\(dir\);/);

function simulate(codes, windows = true) {
    let calls = 0;
    const delays = [];
    const mkdir = async (path, options) => {
        assert.equal(path, 'output/example');
        assert.deepEqual(JSON.parse(JSON.stringify(options)), { recursive: true });
        const code = codes[calls++];
        if (code) throw Object.assign(new Error(code), { code });
    };
    const run = vm.runInNewContext(`${helper}\nmkdirWithRetry`, {
        fsp: { mkdir }, isWindows: windows,
        setTimeout: (callback, delay) => { delays.push(delay); callback(); },
    });
    return { run: () => run('output/example'), calls: () => calls, delays };
}

test('cria a pasta sem espera quando não há erro', async () => {
    const mock = simulate([]);
    await mock.run();
    assert.equal(mock.calls(), 1);
    assert.deepEqual(mock.delays, []);
});
test('recupera EPERM transitório no Windows', async () => {
    const mock = simulate(['EPERM']);
    await mock.run();
    assert.equal(mock.calls(), 2);
    assert.deepEqual(mock.delays, [100]);
});
test('recupera EBUSY com esperas limitadas', async () => {
    const mock = simulate(['EBUSY', 'EBUSY']);
    await mock.run();
    assert.equal(mock.calls(), 3);
    assert.deepEqual(mock.delays, [100, 200]);
});
test('permissão persistentemente negada continua falhando', async () => {
    const mock = simulate(['EPERM', 'EPERM', 'EPERM', 'EPERM']);
    await assert.rejects(mock.run(), { code: 'EPERM' });
    assert.equal(mock.calls(), 4);
    assert.deepEqual(mock.delays, [100, 200, 400]);
});
for (const code of ['EACCES', 'ENOSPC', 'ENOENT']) {
    test(`não mascara ${code}`, async () => {
        const mock = simulate([code]);
        await assert.rejects(mock.run(), { code });
        assert.equal(mock.calls(), 1);
        assert.deepEqual(mock.delays, []);
    });
}
test('mantém o comportamento original fora do Windows', async () => {
    const mock = simulate(['EPERM'], false);
    await assert.rejects(mock.run(), { code: 'EPERM' });
    assert.equal(mock.calls(), 1);
    assert.deepEqual(mock.delays, []);
});
