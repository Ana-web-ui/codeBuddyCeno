import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const out = mkdtempSync(join(tmpdir(), 'cenolab-draft-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target','ES2022','--module','commonjs',
    '--moduleResolution','node','--strict','--skipLibCheck','--esModuleInterop','--outDir',out,'lib/free-scene-draft.ts','lib/free-scene-groups.ts'], {encoding:'utf8'});
assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);
writeFileSync(join(out,'package.json'),'{"type":"commonjs"}');
const {createFreeSceneDraft} = require(join(out,'free-scene-draft.js'));
const {emptyFreeScene,newFreeObject,stringifyFreeScene} = require(join(out,'free-scene.js'));
const {groupFreeObjects} = require(join(out,'free-scene-groups.js'));

// Model transaction completion and abortion, including a storage quota failure.
function memoryStorage() {
    const data = new Map();
    let failWrite = false;
    const database = {
        createObjectStore() {}, close() {},
        transaction(_store, mode) {
            let operation = () => {};
            const transaction = {
                error: null,
                objectStore: () => ({
                    get: key => ({result:data.get(key)}),
                    put: (value,key) => { operation = () => data.set(key,value); },
                }),
            };
            queueMicrotask(() => {
                if (mode === 'readwrite' && failWrite) {
                    transaction.error = new DOMException('Quota exceeded','QuotaExceededError');
                    transaction.onabort();
                } else { operation(); transaction.oncomplete(); }
            });
            return transaction;
        },
    };
    const factory = {open() {
        const request = {result:database};
        queueMicrotask(() => {request.onupgradeneeded();request.onsuccess();});
        return request;
    }};
    return {factory,data,fail: value => {failWrite=value;}};
}

const photo = 'data:image/png;base64,' + readFileSync('tests/fixtures/branding-logo.png').toString('base64');
const scene = groupFreeObjects({...emptyFreeScene(),name:'Rascunho de teste',view:'plan',environment:'hotel',objects:[
    {...newFreeObject('wall',1),position:[4,2,0],image:photo,color:'#c01535'},
    {...newFreeObject('led',2),position:[4,2,1.2]},
    {...newFreeObject('obj',3),name:'Produto importado',source:'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3'},
]},[1,2]);
if (process.env.CENOLAB_DRAFT_FIXTURE) writeFileSync(process.env.CENOLAB_DRAFT_FIXTURE,stringifyFreeScene(scene));

test('rascunho vazio não cria uma gravação; restaura peças, grupos, imagem, OBJ e vista',async()=>{
    const storage = memoryStorage();
    const draft = createFreeSceneDraft(storage.factory);
    assert.equal(await draft.read(),null);
    assert.equal(storage.data.size,0);
    await draft.write(scene);
    draft.close();
    assert.deepEqual(await createFreeSceneDraft(storage.factory).read(),scene);
});

test('gravações capturam a edição e a última edição válida prevalece',async()=>{
    const storage = memoryStorage();
    const draft = createFreeSceneDraft(storage.factory);
    const snapshot = structuredClone(scene);
    const pending = draft.write(snapshot);
    snapshot.name='Alterado depois da gravação';
    await pending;
    assert.equal((await draft.read()).name,scene.name);
    await Promise.all([draft.write({...scene,name:'Primeira'}),draft.write({...scene,name:'Segunda'})]);
    assert.equal((await draft.read()).name,'Segunda');
    await draft.write(emptyFreeScene());
    assert.deepEqual(await draft.read(),emptyFreeScene());
});

test('falhas e dados inválidos preservam a última gravação e podem ser recuperados',async()=>{
    const storage = memoryStorage();
    const draft = createFreeSceneDraft(storage.factory);
    await draft.write(scene);
    storage.fail(true);
    await assert.rejects(draft.write({...scene,name:'Sem espaço'}),{name:'QuotaExceededError'});
    assert.deepEqual(await draft.read(),scene);
    storage.fail(false);
    await assert.rejects(draft.write({...scene,objects:[{...scene.objects[0],position:[NaN,0,0]}]}));
    assert.deepEqual(await draft.read(),scene);
    storage.data.set('current','JSON incompleto');
    await assert.rejects(draft.read());
    assert.equal(storage.data.get('current'),'JSON incompleto');
    await draft.write(scene);
    assert.deepEqual(await draft.read(),scene);
});
