import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url), out = mkdtempSync(join(tmpdir(), 'codebuddy-structure-move-'));
const compiled = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', out, 'lib/free-scene-exporters.ts', 'lib/free-scene-sizing.ts'], { encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');

const {emptyFreeScene,newFreeObject,freeCatalog,wallBetween,validateFreeScene,stringifyFreeScene,parseFreeScene,MAX_FREE_SCENE_BYTES}=require(join(out,'free-scene.js'));
const {freeParts}=require(join(out,'free-scene-geometry.js'));
const {resizeFreeObject}=require(join(out,'free-scene-sizing.js'));
const {supplierProducts,supplierObjectSize}=require(join(out,'supplier-products.js'));
const {exportFreeBlender,exportFreeMax}=require(join(out,'free-scene-exporters.js'));
const fixtures=process.env.CODEBUDDY_FREE_FIXTURES?resolve(process.env.CODEBUDDY_FREE_FIXTURES):join(out,'fixtures');mkdirSync(fixtures,{recursive:true});
const logo='data:image/png;base64,'+readFileSync('tests/fixtures/branding-logo.png').toString('base64');
const obj='o Produto\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nv 0 0 1\nv 1 0 1\nv 1 1 1\nv 0 1 1\nf 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 2 3 7 6\nf 3 4 8 7\nf 4 1 5 8';
const cases=freeCatalog.map(({kind})=>[kind,newFreeObject(kind,1)]);
cases.push(['touk',newFreeObject('supplierTotem',1,'touk-wt55v-slim')],['touk-arte',{...newFreeObject('supplierTotem',1,'touk-wt55v-slim'),image:logo}],['obj',{...newFreeObject('obj',1),source:obj}],['arte',{...newFreeObject('wall',1),image:logo}],
 ['transformacao-xyz',{...newFreeObject('counter',1),position:[2,-3,1.5],rotation:[17,29,35],size:[3,.9,1.3]}],
 ['oculto-bloqueado',{...newFreeObject('chair',1),visible:false,locked:true}],
 ['texto-seguro',{...newFreeObject('text',1),text:'TV1\n"Marca" \'\\ ; __import__("os")',position:[1,2,.5],rotation:[10,-20,30]}]);
for (const product of supplierProducts.filter(product=>product.display)) {
 for (const mount of ['pedestal','wall']) for (const screenOrientation of ['horizontal','vertical']) {
  const item={...newFreeObject('supplierTotem',1,product.id),mount,screenOrientation,size:supplierObjectSize(product,mount,screenOrientation)};
  cases.push([product.id+'-'+mount+'-'+screenOrientation,item]);
  cases.push([product.id+'-'+mount+'-'+screenOrientation+'-arte',{...item,image:logo}]);
 }
}
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


test('novas peças e OBJ têm a base no chão; JSON preserva alturas ajustadas',()=>{
 for (const item of [...freeCatalog.map(({kind})=>newFreeObject(kind,1)), {...newFreeObject('obj',1),source:obj}]) {
  const minimum=Math.min(...freeParts(item).map(part=>{
   const localBottom=part.shape==='mesh'
    ? Math.min(...part.vertices.map(vertex=>vertex[2]))
    : -part.size[2]/2;
   return item.position[2]+part.center[2]+localBottom;
  }));
  assert.ok(Math.abs(minimum)<1e-6,item.kind+' tem base em '+minimum);
 }
 const raised={...newFreeObject('led',1),position:[2,3,4]};
 assert.deepEqual(parseFreeScene(stringifyFreeScene({...emptyFreeScene(),objects:[raised]})).objects[0].position,[2,3,4]);
});


test('totem de fornecedor mantém identidade após renomear, copiar e reabrir',()=>{
 const item=newFreeObject('supplierTotem',1,'touk-wt55v-slim');
 assert.deepEqual(item.size,[.93,.5,1.93]);
 assert.deepEqual(item.position,[0,0,0]);
 const renamed={...item,name:'Atendimento TV1',rotation:[0,0,45]};
 const copy={...structuredClone(renamed),id:2};
 const scene=parseFreeScene(stringifyFreeScene({...emptyFreeScene(),objects:[renamed,copy]}));
 assert.equal(scene.objects[0].productId,'touk-wt55v-slim');
 assert.equal(scene.objects[1].productId,'touk-wt55v-slim');
 const parts=freeParts(item);
 const minimum=[0,1,2].map(axis=>Math.min(...parts.map(p=>p.center[axis]-p.size[axis]/2)));
 const maximum=[0,1,2].map(axis=>Math.max(...parts.map(p=>p.center[axis]+p.size[axis]/2)));
 assert.ok(Math.abs(minimum[2])<1e-8);
 assert.ok(maximum.every((v,i)=>Math.abs(v-minimum[i]-item.size[i])<1e-8));
 const py=exportFreeBlender(scene),ms=exportFreeMax(scene);
 assert.ok(py.includes("raiz['code_buddy_supplier']"));
 assert.ok(ms.includes('setUserProp raiz "code_buddy_supplier" "Touk"'));
 assert.ok(ms.includes('setUserProp raiz "code_buddy_model" "WT55V Vertical Slim"'));
 const art=freeParts({...item,image:logo}).filter(part=>part.shape==='image');
 assert.equal(art.length,1);
 assert.equal(art[0].name,'Arte_Tela');
 assert.throws(()=>newFreeObject('supplierTotem',1,'modelo-inexistente'));
 for(const change of [{productId:undefined},{productId:'outro-modelo'},{productId:3}])
  assert.throws(()=>validateFreeScene({...emptyFreeScene(),objects:[{...item,...change}]}));
 assert.throws(()=>validateFreeScene({...emptyFreeScene(),objects:[{...newFreeObject('box',1),productId:item.productId}]}));
});


test('WT21S e WT55S preservam instalação e orientação e respeitam o volume escolhido',()=>{
 for (const product of supplierProducts.filter(product=>product.display)) {
  for (const mount of ['pedestal','wall']) for (const screenOrientation of ['horizontal','vertical']) {
   const item={...newFreeObject('supplierTotem',1,product.id),mount,screenOrientation,size:supplierObjectSize(product,mount,screenOrientation)};
   const reopened=parseFreeScene(stringifyFreeScene({...emptyFreeScene(),objects:[item]})).objects[0];
   assert.deepEqual(reopened,item);
   const parts=freeParts(item);
   const bounds=[0,1,2].map(axis=>{
    const coordinates=parts.flatMap(part=>part.vertices
     ? part.vertices.map(vertex=>vertex[axis]+part.center[axis])
     : [part.center[axis]-part.size[axis]/2,part.center[axis]+part.size[axis]/2]);
    return [Math.min(...coordinates),Math.max(...coordinates)];
   });
   assert.ok(Math.abs(bounds[2][0])<1e-8);
   bounds.forEach(([min,max],axis)=>assert.ok(Math.abs(max-min-item.size[axis])<1e-6,product.id+' '+mount+' '+screenOrientation+' axis '+axis));
   assert.equal(parts.some(part=>part.name==='Base_Pedestal'),mount==='pedestal');
   assert.equal(parts.some(part=>part.name==='Suporte_Parede'),mount==='wall');
   const scaled={...item,size:item.size.map((n,i)=>n*[1.1,.8,1.4][i])};
   const vertices=freeParts(scaled).find(part=>part.name==='Gabinete').vertices;
   const original=parts.find(part=>part.name==='Gabinete').vertices;
   vertices.forEach((v,j)=>v.forEach((n,i)=>assert.ok(Math.abs(n-original[j][i]*[1.1,.8,1.4][i])<1e-8)));
   const ms=exportFreeMax({...emptyFreeScene(),objects:[item]});
   assert.ok(ms.includes('code_buddy_mount'));
   assert.ok(ms.includes('code_buddy_screen_orientation'));
  }
  const item=newFreeObject('supplierTotem',1,product.id);
  for (const change of [{mount:'table'},{screenOrientation:'diagonal'},{mount:undefined},{screenOrientation:2}])
   assert.throws(()=>validateFreeScene({...emptyFreeScene(),objects:[{...item,...change}]}));
 }
 const slim=newFreeObject('supplierTotem',1,'touk-wt55v-slim');
 assert.throws(()=>validateFreeScene({...emptyFreeScene(),objects:[{...slim,mount:'wall'}]}));
 const slimReopened=parseFreeScene(stringifyFreeScene({...emptyFreeScene(),objects:[slim]}));
 assert.equal(slimReopened.objects[0].mount,undefined);
});


test('redimensionamento preserva o apoio do LED e o tamanho original no JSON',()=>{
 const led=newFreeObject('led',1);
 const original=structuredClone(led);
 const large=resizeFreeObject(led,led.size.map(value=>value*1.1));
 assert.deepEqual(led,original);
 assert.deepEqual(large.originalSize,led.size);
 assert.ok(Math.abs(large.position[2]+large.size[2]*.35)<1e-8);
 const small=resizeFreeObject(large,large.size.map(value=>value*.9));
 assert.deepEqual(small.originalSize,led.size);
 const reopened=parseFreeScene(stringifyFreeScene({...emptyFreeScene(),objects:[small]})).objects[0];
 assert.deepEqual(reopened.originalSize,led.size);
 const restored=resizeFreeObject(reopened,reopened.originalSize);
 restored.size.forEach((value,i)=>assert.ok(Math.abs(value-led.size[i])<1e-8));
 assert.ok(Math.abs(restored.position[2]-led.position[2])<1e-8);
 assert.deepEqual(restored.rotation,led.rotation);
});

test('tamanho original opcional aceita JSON antigo e rejeita valores inválidos',()=>{
 const item=newFreeObject('box',1);
 assert.equal(parseFreeScene(stringifyFreeScene({...emptyFreeScene(),objects:[item]})).objects[0].originalSize,undefined);
 for (const originalSize of [[0,1,1],[1,NaN,1],[1,1,1001],[1,2],null,'1,1,1'])
  assert.throws(()=>validateFreeScene({...emptyFreeScene(),objects:[{...item,originalSize}]}));
 for (const size of [[0,1,1],[1,Infinity,1],[1,1,1001]])
  assert.throws(()=>resizeFreeObject(item,size));
});

test('aumentar e restaurar conserva a altura de apoio das peças e a identidade Touk',()=>{
 for (const item of [
  {...newFreeObject('counter',1),position:[2,3,1.5]},
  newFreeObject('supplierTotem',1,'touk-wt21s'),
  newFreeObject('supplierTotem',1,'touk-wt55s'),
  {...newFreeObject('obj',1),source:obj,position:[1,2,3]},
 ]) {
  const resized=resizeFreeObject(item,item.size.map(value=>value*1.1));
  assert.equal(resized.position[2],item.position[2]);
  assert.equal(resized.productId,item.productId);
  assert.equal(resized.source,item.source);
  const restored=resizeFreeObject(resized,resized.originalSize);
  assert.deepEqual(restored.size,item.size);
  assert.deepEqual(restored.position,item.position);
 }
 const wall={...newFreeObject('wall',1),rotation:[30,0,0]};
 const resized=resizeFreeObject(wall,wall.size.map(value=>value*2));
 const bottom=-Math.sin(Math.PI/6)*wall.size[1]/2;
 assert.ok(Math.abs(resized.position[2]-(-bottom))<1e-8);
});
