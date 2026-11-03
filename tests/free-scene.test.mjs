import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-structure-move-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/free-scene-exporters.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');

const {emptyFreeScene,newFreeObject,freeCatalog,wallBetween,validateFreeScene,stringifyFreeScene,parseFreeScene,MAX_FREE_SCENE_BYTES}=require(join(out,'free-scene.js'));
const {freeParts}=require(join(out,'free-scene-geometry.js'));
const {exportFreeBlender,exportFreeMax}=require(join(out,'free-scene-exporters.js'));
const fixtures=process.env.CODEBUDDY_FREE_FIXTURES?resolve(process.env.CODEBUDDY_FREE_FIXTURES):join(out,'fixtures');mkdirSync(fixtures,{recursive:true});
const logo='data:image/png;base64,'+readFileSync('tests/fixtures/branding-logo.png').toString('base64');
const obj='o Produto\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nv 0 0 1\nv 1 0 1\nv 1 1 1\nv 0 1 1\nf 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 2 3 7 6\nf 3 4 8 7\nf 4 1 5 8';
const cases=freeCatalog.map(({kind})=>[kind,newFreeObject(kind,1)]);
cases.push(['obj',{...newFreeObject('obj',1),source:obj}],['arte',{...newFreeObject('wall',1),image:logo}],
 ['transformacao-xyz',{...newFreeObject('counter',1),position:[2,-3,1.5],rotation:[17,29,35],size:[3,.9,1.3]}],
 ['oculto-bloqueado',{...newFreeObject('chair',1),visible:false,locked:true}],
 ['texto-seguro',{...newFreeObject('text',1),text:'TV1\n"Marca" \'\\ ; __import__("os")',position:[1,2,.5],rotation:[10,-20,30]}]);
const manifest=[];
for(const [id,item] of cases)test('cena livre: '+id,()=>{
 const scene={...emptyFreeScene(),objects:[item]};const before=JSON.stringify(scene);validateFreeScene(scene);
 assert.deepEqual(parseFreeScene(stringifyFreeScene(scene)),scene);
 const parts=freeParts(item);assert.ok(parts.length);assert.ok(parts.every(p=>p.size.every(n=>Number.isFinite(n)&&n>0)));
 const py=exportFreeBlender(scene),ms=exportFreeMax(scene);assert.ok(py.includes('free:'));assert.ok(ms.includes('free:1'));
 assert.equal(py,exportFreeBlender(parseFreeScene(stringifyFreeScene(scene))));
 writeFileSync(join(fixtures,id+'.py'),py);writeFileSync(join(fixtures,id+'.ms'),ms);
 manifest.push({id,scene,parts});writeFileSync(join(fixtures,'manifest.json'),JSON.stringify(manifest));assert.equal(JSON.stringify(scene),before);
});
test('cena inicia vazia; sobreposições e posições fora da grade são aceitas',()=>{
 const scene=emptyFreeScene();assert.equal(scene.objects.length,0);validateFreeScene(scene);
 const a={...newFreeObject('wall',1),position:[100,-100,-2]};
 validateFreeScene({...scene,objects:[a,{...a,id:2}]});
});
test('parede desenhada preserva comprimento, centro e orientação dos pontos',()=>{
 const wall=wallBetween([0,0,0],[3,4,0],1);assert.equal(wall.size[0],5);assert.deepEqual(wall.position,[1.5,2,0]);
 assert.ok(Math.abs(wall.rotation[2]-53.13010235415598)<1e-7);assert.throws(()=>wallBetween([0,0,0],[.01,0,0],1));
});
test('rejeita configurações corrompidas, IDs repetidos e arquivos fora do formato',()=>{
 const a=newFreeObject('wall',1),base=emptyFreeScene();
 for(const patch of [{size:[0,1,1]},{rotation:[NaN,0,0]},{position:[Infinity,0,0]},{color:'red'},{kind:'script'}, {text:23},{shelves:2.5},{opacity:0},{source:'alert(1)'},{extra:true}])assert.throws(()=>validateFreeScene({...base,objects:[{...a,...patch}]}));
 assert.throws(()=>validateFreeScene({...base,objects:[a,a]}));
 assert.throws(()=>parseFreeScene(JSON.stringify({format:'code-buddy-free-scene',version:2,scene:base})));
 assert.throws(()=>parseFreeScene(JSON.stringify({format:'code-buddy-project',version:21,config:{}})),/guiados/);
 assert.throws(()=>parseFreeScene(' '.repeat(MAX_FREE_SCENE_BYTES+1)));
});
test('limites de peças e imagens continuam validados',()=>{
 const base=emptyFreeScene();assert.throws(()=>validateFreeScene({...base,objects:Array.from({length:201},(_,i)=>newFreeObject('box',i+1))}));
 assert.throws(()=>validateFreeScene({...base,objects:[{...newFreeObject('wall',1),image:'https://exemplo.com/arte.png'}]}));
});
