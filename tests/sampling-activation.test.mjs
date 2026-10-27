import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),out=mkdtempSync(join(tmpdir(),'codebuddy-sampling-'));
const compiled=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--strict','--skipLibCheck','--esModuleInterop','--outDir',out,'lib/project-file.ts'],{encoding:'utf8'});
assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);writeFileSync(join(out,'package.json'),'{"type":"commonjs"}');
const {createProjectConfig,createActivationModelConfig}=require(join(out,'project-types.js'));
const {validate,generate,assemblyGeometry}=require(join(out,'generator.js'));
const {activationGeometry,zonesOverlap}=require(join(out,'activation-geometry.js'));
const {samplingDefaults,samplingLayout}=require(join(out,'sampling.js'));
const {samplingParts}=require(join(out,'sampling-exporters.js'));
const {parseProject,serializeProject}=require(join(out,'project-file.js'));
const {unitTransform}=require(join(out,'assembly.js'));
const base=()=>createActivationModelConfig(createProjectConfig('activation'),'sampling');
const fixture=process.env.CODEBUDDY_SAMPLING_FIXTURES?resolve(process.env.CODEBUDDY_SAMPLING_FIXTURES):join(out,'fixtures');
mkdirSync(fixture,{recursive:true});const manifest=[];
const sides=['front','right','back','left'];
const cases=[['padrao',base()],['sem-espera',{...base(),activationWaitingEnabled:false}],['sem-guias',{...base(),activationExportGuides:false}],
 ['sem-armario',{...base(),samplingStorageEnabled:false}],['sem-amostras',{...base(),samplingSampleCount:0}],
 ['duas-fileiras',{...base(),samplingSampleCount:24}],
 ['descarte-esquerda',{...base(),samplingWasteEnabled:true}],['descarte-direita',{...base(),samplingWasteEnabled:true,samplingWasteSide:'right'}],
 ['materiais',{...base(),samplingCounterMat:'wood',samplingSupportMat:'metal',samplingSampleMat:'brand'}],
 ['espera-manual',{...base(),activationWaitingManual:true,activationWaitingX:-3.7,activationWaitingY:-3.2}],
 ...[0,45,90,-90].map(rotation=>['ajuste-'+rotation,{...base(),width:14,depth:14,samplingWasteEnabled:true,objectTransforms:{'samplingStations:0':{x:0,y:0,rotation}}}]),
 ...sides.flatMap(side=>sides.filter(exit=>exit!==side).map(exit=>[side+'-'+exit,{...base(),width:12,depth:12,samplingWasteEnabled:true,activationEntranceSide:side,activationExitSide:exit}]))];
for(const [id,c] of cases) test('Experimentação e amostras: '+id,()=>{
 validate(c);const before=JSON.stringify(c),g=activationGeometry(c),s=g.sampling,local=samplingLayout(c);
 assert.ok(s);assert.equal(g.stations.length,1);assert.equal(g.stations[0].id,'samplingStations:0');assert.equal(g.photo,null);assert.equal(g.demo,null);
 assert.equal(s.samples.length,c.samplingSampleCount);
 for(const route of g.circulation){assert.ok(!zonesOverlap(route,s.reserved));if(g.waiting)assert.ok(!zonesOverlap(route,g.waiting));}
 for(const sample of local.samples){assert.ok(Math.abs(sample.x)+sample.width/2<=local.counter.width/2-.05+1e-8);assert.ok(Math.abs(sample.y)+sample.depth/2<=local.counter.depth/2-.05+1e-8);}
 for(let i=0;i<local.samples.length;i++)for(const b of local.samples.slice(i+1))assert.ok(!zonesOverlap(local.samples[i],b));
 assert.ok(local.support.y>local.team.y&&local.team.y>0&&local.audience.y<0);
 assert.ok(!zonesOverlap(local.team,local.counter));assert.ok(!zonesOverlap(local.team,local.support));
 if(local.waste)assert.equal(Math.sign(local.waste.x),c.samplingWasteSide==='left'?-1:1);
 const restored=parseProject(serializeProject(c));assert.deepEqual(restored,c);assert.equal(JSON.stringify(c),before);
 for(const target of ['blender','max']){
   const script=generate({...c,target});assert.equal(script,generate({...restored,target}));
   assert.ok(script.includes('sampling_counter'));assert.ok(script.includes('sampling_support'));
   assert.equal(script.includes('sampling_storage_door'),c.samplingStorageEnabled);
   assert.equal(script.includes('sampling_waste'),c.samplingWasteEnabled);
   if(target==='max')assert.ok(script.includes('CB_Unidade_samplingStations_0_Grupo'));
   writeFileSync(join(fixture,id+(target==='blender'?'.py':'.ms')),script);
 }
 const units=assemblyGeometry(c).map(u=>({id:u.id,transform:unitTransform(c,u)}));assert.equal(units.length,1);
 manifest.push({id,config:c,sampling:s,units,parts:samplingParts(c),zones:c.activationExportGuides?[...(g.waiting?[g.waiting]:[]),...g.participation,s.team,s.reserved,...g.circulation]:[]});
 writeFileSync(join(fixture,'manifest.json'),JSON.stringify(manifest));
});
test('recusa capacidade excedida, quantidades fracionadas, obstáculos e ajustes incompatíveis',()=>{
 for(const patch of [{samplingCounterWidth:.6,samplingCounterDepth:.4,samplingSampleCount:24,samplingSampleWidth:.5,samplingSampleDepth:.5},
   {samplingSampleCount:2.5},{samplingSampleCount:-1},{samplingSampleWidth:0},{samplingSupportDepth:NaN},
   {samplingStorageEnabled:'sim'},{samplingWasteEnabled:1},{samplingWasteSide:'back'},
   {samplingCounterMat:'outro'},{samplingSupportMat:null},{samplingSampleMat:'outro'},
   {samplingCounterDepth:.4,samplingTeamGap:.1,samplingTeamWidth:3,samplingWasteEnabled:true,samplingWasteDepth:.8},
   {width:3,depth:3},{counter:true},{touchScreens:true},{backdrops:true},
   {activationWaitingManual:true,activationWaitingX:0,activationWaitingY:1},
   {objectTransforms:{'demoStations:0':{x:0,y:0,rotation:0}}},
   {objectTransforms:{'samplingStations:0':{x:4.5,y:4,rotation:90}}}]) {
   const c={...base(),...patch},before=JSON.stringify(c);assert.throws(()=>validate(c));assert.equal(JSON.stringify(c),before);
 }
});
test('troca entre os quatro modelos mantém os dados gerais e remove ajustes incompatíveis',()=>{
 let c={...base(),name:'TV1 amostras',color:'#123456',target:'max',floorMat:'wood',objectTransforms:{'samplingStations:0':{x:0,y:0,rotation:45}}};
 for(const model of ['touch','photo','demo','sampling']){
   const next=createActivationModelConfig(c,model);validate(next);assert.deepEqual(next.objectTransforms,{});
   for(const key of ['name','color','target','floorMat'])assert.equal(next[key],c[key]);c=next;
 }
});
test('JSON versão 9 migra os tipos e modelos anteriores; versão 10 exige campos de sampling',()=>{
 const sources=['stand','palco','lounge','activation'].map(createProjectConfig);
 for(const model of ['photo','demo'])sources.push(createActivationModelConfig(createProjectConfig('activation'),model));
 for(const c of sources){
   const old={...c};for(const key of Object.keys(samplingDefaults))delete old[key];
   assert.deepEqual(parseProject(JSON.stringify({format:'code-buddy-project',version:9,config:old})),c);
 }
 const current=JSON.parse(serializeProject(base()));assert.equal(current.version,10);delete current.config.samplingStorageEnabled;
 assert.throws(()=>parseProject(JSON.stringify(current)),/ausente/);
});
