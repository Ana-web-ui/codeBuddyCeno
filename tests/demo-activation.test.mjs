import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),out=mkdtempSync(join(tmpdir(),'codebuddy-demo-'));
const compiled=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--strict','--skipLibCheck','--esModuleInterop','--outDir',out,'lib/project-file.ts'],{encoding:'utf8'});
assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);writeFileSync(join(out,'package.json'),'{"type":"commonjs"}');
const {createProjectConfig,createActivationModelConfig}=require(join(out,'project-types.js'));
const {validate,generate,assemblyGeometry}=require(join(out,'generator.js'));
const {activationGeometry,zonesOverlap}=require(join(out,'activation-geometry.js'));
const {demoDefaults}=require(join(out,'activation.js'));
const {demoParts}=require(join(out,'demo-exporters.js'));
const {parseProject,serializeProject}=require(join(out,'project-file.js'));
const {unitTransform}=require(join(out,'assembly.js'));
const base=()=>createActivationModelConfig(createProjectConfig('activation'),'demo');
const fixture=process.env.CODEBUDDY_DEMO_FIXTURES?resolve(process.env.CODEBUDDY_DEMO_FIXTURES):join(out,'fixtures');
mkdirSync(fixture,{recursive:true});const manifest=[];
const sides=['front','right','back','left'];
const cases=[['padrao',base()],['sem-espera',{...base(),activationWaitingEnabled:false}],
 ['sem-guias',{...base(),activationExportGuides:false}],
 ['produto-deslocado',{...base(),demoProductX:.5,demoProductY:.15}],
 ['produto-no-limite',{...base(),demoProductWidth:1.98,demoProductDepth:.78}],
 ['materiais',{...base(),demoBenchMat:'wood',demoProductMat:'metal'}],
 ['medidas',{...base(),width:14,depth:14,demoBenchWidth:3,demoBenchDepth:1.2,demoBenchHeight:1.2,demoProductHeight:.8,demoPresenterGap:.5,demoAudienceGap:1}],
 ['espera-manual',{...base(),activationWaitingManual:true,activationWaitingX:-3.8,activationWaitingY:-3.2}],
 ...[0,45,90,-90].map(rotation=>['ajuste-'+rotation,{...base(),width:14,depth:14,objectTransforms:{'demoStations:0':{x:0,y:0,rotation}},demoProductX:.3,demoProductY:-.1}]),
 ...sides.flatMap(side=>sides.filter(exit=>exit!==side).map(exit=>[side+'-'+exit,{...base(),activationEntranceSide:side,activationExitSide:exit}]))];
for(const [id,c] of cases) test('Demonstração de produto: '+id,()=>{
 validate(c);const before=JSON.stringify(c),g=activationGeometry(c),d=g.demo;
 assert.ok(d);assert.equal(g.stations.length,1);assert.equal(g.stations[0].id,'demoStations:0');assert.equal(g.photo,null);
 assert.equal(c.touchScreens,false);assert.equal(c.backdrops,false);assert.equal(c.counter,false);
 const a=d.rotation*Math.PI/180;
 assert.ok(Math.abs(d.product.x-(g.stations[0].x+c.demoProductX*Math.cos(a)-c.demoProductY*Math.sin(a)))<1e-6);
 assert.ok(Math.abs(d.product.y-(g.stations[0].y+c.demoProductX*Math.sin(a)+c.demoProductY*Math.cos(a)))<1e-6);
 assert.ok(Math.abs(d.product.z-d.product.height/2-(.1+c.demoBenchHeight))<1e-6);
 const forward={x:Math.sin(a),y:-Math.cos(a)},s=g.stations[0];
 assert.ok((d.presenter.x-s.x)*forward.x+(d.presenter.y-s.y)*forward.y<0);
 assert.ok((d.audience.x-s.x)*forward.x+(d.audience.y-s.y)*forward.y>0);
 for(const z of g.circulation){assert.ok(!zonesOverlap(z,d.reserved));if(g.waiting)assert.ok(!zonesOverlap(z,g.waiting));}
 const restored=parseProject(serializeProject(c));assert.deepEqual(restored,c);assert.equal(JSON.stringify(c),before);
 const zones=[...(g.waiting?[g.waiting]:[]),...g.participation,d.presenter,d.reserved,...g.circulation];
 for(const target of ['blender','max']){
   const script=generate({...c,target});assert.equal(script,generate({...restored,target}));
   for(const role of ['demo_bench_body','demo_bench_top','demo_product'])assert.ok(script.includes(role));
   assert.ok(!script.includes('photo_camera'));
   if(target==='max') {assert.ok(script.includes('raizDemo'));if(c.activationExportGuides)assert.ok(script.includes('(getUserProp obj "CodeBuddy") == nomeGeracao'));}
   writeFileSync(join(fixture,id+(target==='blender'?'.py':'.ms')),script);
 }
 const units=assemblyGeometry(c).map(u=>({id:u.id,transform:unitTransform(c,u)}));assert.equal(units.length,1);
 manifest.push({id,config:c,demo:d,units,zones:c.activationExportGuides?zones:[]});
 writeFileSync(join(fixture,'manifest.json'),JSON.stringify(manifest));
});
test('o tampo avança 4 cm e o produto fica apoiado nele, sem mutar os parâmetros',()=>{
 const c=base(),parts=demoParts(c,2,3);assert.equal(parts.length,3);
 assert.deepEqual(parts[1].size,[2.08,.88,.06]);
 assert.equal(parts[2].center[2]-parts[2].size[2]/2,.1+c.demoBenchHeight);
});
test('bloqueia produto fora do tampo, altura total, zonas sobrepostas e objetos ocultos',()=>{
 for(const patch of [{demoProductWidth:2},{demoProductDepth:.8},{demoProductX:.8},{demoProductY:.3},
   {demoBenchHeight:1.5,demoProductHeight:2,height:3},
   {demoProductWidth:NaN},{demoProductHeight:0},{demoPresenterGap:-.1},{demoAudienceGap:0},
   {demoBenchMat:'outro'},{demoProductMat:null},{touchScreens:true},{counter:true},{backdrops:true},
   {width:3,depth:3},{activationWaitingManual:true,activationWaitingX:0,activationWaitingY:1},
   {objectTransforms:{'demoStations:0':{x:4,y:4,rotation:90}}},
   {objectTransforms:{'touchScreens:0':{x:0,y:0,rotation:0}}}]) {
   const c={...base(),...patch},before=JSON.stringify(c);assert.throws(()=>validate(c));assert.equal(JSON.stringify(c),before);
 }
});
test('troca entre os três modelos conserva dados gerais e limpa peças e ajustes incompatíveis',()=>{
 let c={...base(),name:'TV1 produto',target:'max',color:'#123456',floorMat:'wood',objectTransforms:{'demoStations:0':{x:0,y:0,rotation:45}}};
 for(const model of ['photo','touch','demo']) {
   const next=createActivationModelConfig(c,model);validate(next);
   assert.deepEqual(next.objectTransforms,{});for(const key of ['name','target','color','floorMat'])assert.equal(next[key],c[key]);c=next;
 }
});
test('JSON versão 8 migra todos os tipos e modelos existentes sem perder ajustes',()=>{
 const sources=['stand','palco','lounge','activation'].map(createProjectConfig);
 sources.push(createActivationModelConfig(createProjectConfig('activation'),'photo'));
 for(const c of sources){
   if(c.projectType==='activation'&&c.activationModel==='touch'){c.width=12;c.depth=10;c.objectTransforms={'touchScreens:0':{x:0,y:0,rotation:45}};}
   if(c.activationModel==='photo'){c.width=12;c.depth=12;c.objectTransforms={'backdrops:0':{x:0,y:1,rotation:45}};}
   const old={...c};for(const key of Object.keys(demoDefaults))delete old[key];
   assert.deepEqual(parseProject(JSON.stringify({format:'code-buddy-project',version:8,config:old})),c);
 }
 const current=JSON.parse(serializeProject(base()));assert.equal(current.version,16);delete current.config.demoProductWidth;
 assert.throws(()=>parseProject(JSON.stringify(current)),/ausente/);
});
