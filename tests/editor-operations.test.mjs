import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-structure-move-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/project-file.ts', 'lib/editor-operations.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { createProjectConfig } = require(join(out, 'project-types.js'));
const { validate, generate, assemblyGeometry } = require(join(out, 'generator.js'));
const { placedMembers } = require(join(out, 'assembly.js'));
const { serializeProject, parseProject } = require(join(out, 'project-file.js'));

const { duplicateObject, deleteCopy } = require(join(out,'editor-operations.js'));
const fixtures = process.env.CODEBUDDY_EDITOR_FIXTURES ? resolve(process.env.CODEBUDDY_EDITOR_FIXTURES) : join(out,'fixtures');
mkdirSync(fixtures,{recursive:true});
const base = () => ({ ...createProjectConfig('stand'), width:16, depth:12, back:false, led:false, spots:false, counter:false });
const image = 'data:image/png;base64,'+readFileSync('tests/fixtures/branding-logo.png').toString('base64');
const cases = [
    ['balcao', { ...base(), counter:true, counterDetailed:true, counterArtEnabled:true, counterArtImage:image, counterArtName:'Marca.png' }, 'counter:0'],
    ['led', { ...base(), led:true, screenImage:image, screenName:'Marca.png' }, 'led:0'],
    ['led-parede', { ...base(), back:true, led:true }, 'led:0'],
    ['palco', { ...base(), stage:true }, 'stage:0'],
    ['vitrine', { ...base(), showcases:true, showcaseCount:1, showcaseDetailed:true }, 'showcases:0'],
    ['prateleira', { ...base(), shelving:true, shelfCount:1, shelfDetailed:true }, 'shelving:0'],
    ['painel', { ...base(), backdrops:true, backdropCount:1, backdropDetailed:true, panelArtEnabled:true, panelArtImage:image, panelArtName:'Marca.png' }, 'backdrops:0'],
    ['mesa-com-cadeiras', { ...base(), roundTables:true, roundTableCount:1, roundTableChairs:true }, 'roundTables:0'],
    ['lounge', { ...createProjectConfig('lounge'), width:20, depth:16 }, 'coffeeTables:0'],
    ['frente-girada', { ...base(), counter:true, frontRotation:90, objectTransforms:{'counter:0':{x:-2,y:0,rotation:30}} }, 'counter:0'],
];
const manifest=[];
for (const [name,c,id] of cases) test('editor duplica e exporta: '+name,()=>{
    const before=JSON.stringify(c), oldUnits=assemblyGeometry(c);
    const result=duplicateObject(c,id), next=result.config;
    validate(next);assert.equal(next.objectCopies.length,1);
    assert.equal(JSON.stringify(c),before);
    for(const unit of oldUnits) assert.deepEqual(placedMembers(c,unit),placedMembers(next,assemblyGeometry(next).find(u=>u.id===unit.id)));
    const copy=assemblyGeometry(next).find(u=>u.id===result.id);
    assert.equal(copy.sourceId,id);assert.equal(copy.members.length,id==='led:0' ? 3 : oldUnits.find(u=>u.id===id).members.length);
    assert.deepEqual(parseProject(serializeProject(next)),next);
    const newCopy=duplicateObject(next,result.id);assert.equal(newCopy.config.objectCopies.length,2);
    assert.ok(newCopy.config.objectCopies.every(copy=>copy.sourceId===id));
    assert.deepEqual(deleteCopy(next,result.id),c);
    for(const target of ['blender','max']) {
        const script=generate({...next,target});assert.ok(script.includes('MONTAGEM INDIVIDUAL: copy:1'));
        writeFileSync(join(fixtures,name+(target==='blender'?'.py':'.ms')),script);
    }
    manifest.push({id:name,config:next,sourceId:id,copyId:result.id});writeFileSync(join(fixtures,'manifest.json'),JSON.stringify(manifest));
});
test('JSON 20 migra sem cópias e versão 21 exige seus campos',()=>{
    const old=base();delete old.objectCopies;
    const migrated=parseProject(JSON.stringify({format:'code-buddy-project',version:20,config:old}));
    assert.deepEqual(migrated.objectCopies,[]);
    assert.throws(()=>parseProject(JSON.stringify({format:'code-buddy-project',version:21,config:old})),/ausente/);
    assert.equal(JSON.parse(serializeProject(migrated)).version,21);
});
test('rejeita cópias órfãs, ciclos, IDs repetidos e posições ausentes',()=>{
    const c={...base(),counter:true};
    for(const objectCopies of [[{id:1,sourceId:'counter:99'}],[{id:1,sourceId:'copy:2'}],[{id:1,sourceId:'counter:0'},{id:1,sourceId:'counter:0'}],[{id:1,sourceId:'counter:0'}]]) {
        assert.throws(()=>validate({...c,objectCopies}));
    }
});
test('duplicação sem espaço e modelos com zonas não alteram o projeto',()=>{
    const packed={...base(),width:3,depth:3,counter:true,counterWidth:2.4,counterDepth:1.6,objectTransforms:{'counter:0':{x:0,y:0,rotation:0}}};
    validate(packed);const before=JSON.stringify(packed);
    assert.throws(()=>duplicateObject(packed,'counter:0'),/espaço livre/);assert.equal(JSON.stringify(packed),before);
    for(const c of [createProjectConfig('activation'),createProjectConfig('reception')]) {
        const before=JSON.stringify(c);assert.throws(()=>duplicateObject(c,assemblyGeometry(c)[0].id));assert.equal(JSON.stringify(c),before);
    }
});
