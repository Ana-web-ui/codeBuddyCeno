import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),out=mkdtempSync(join(tmpdir(),'codebuddy-activation-'));
const compiled=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--strict','--skipLibCheck','--esModuleInterop','--outDir',out,'lib/project-file.ts'],{encoding:'utf8'});
assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);
writeFileSync(join(out,'package.json'),'{"type":"commonjs"}');
const {createProjectConfig}=require(join(out,'project-types.js'));
const {validate,generate,assemblyGeometry}=require(join(out,'generator.js'));
const {unitTransform}=require(join(out,'assembly.js'));
const {activationGeometry,zonesOverlap}=require(join(out,'activation-geometry.js'));
const {activationDefaults}=require(join(out,'activation.js'));
const {parseProject,serializeProject}=require(join(out,'project-file.js'));
const base=()=>createProjectConfig('activation');
const fixture=process.env.CODEBUDDY_ACTIVATION_FIXTURES?resolve(process.env.CODEBUDDY_ACTIVATION_FIXTURES):join(out,'fixtures');
mkdirSync(fixture,{recursive:true});
const cases=[['padrao',base()],['sem-espera',{...base(),activationWaitingEnabled:false}],
 ['tres-estacoes',{...base(),width:10,touchCount:3}],
 ['espera-manual',{...base(),activationWaitingManual:true,activationWaitingX:-2.6,activationWaitingY:-1.8}],
 ['giro-livre',{...base(),width:12,depth:10,objectTransforms:{'touchScreens:0':{x:0,y:0,rotation:45}}}],
 ...['front','right','back','left'].flatMap((side,i)=>['front','right','back','left'].filter(exit=>exit!==side).map(exit=>[side+'-'+exit,{...base(),width:12,depth:10,activationEntranceSide:side,activationExitSide:exit}]))];
const manifest=[];
for(const [id,c] of cases) test('zonas, JSON e exportação: '+id,()=>{
 validate(c);const g=activationGeometry(c),before=JSON.stringify(c);
 assert.equal(g.stations.length,c.touchCount);assert.equal(g.participation.length,c.touchCount);
 const occupied=[...g.equipment,...g.participation,...(g.waiting?[g.waiting]:[])];
 for(const route of g.circulation) assert.ok(!occupied.some(z=>zonesOverlap(route,z)),id+' percurso sobre zona ocupada');
 const restored=parseProject(serializeProject(c));assert.deepEqual(restored,c);assert.equal(JSON.stringify(c),before);
 const units=assemblyGeometry(c).map(u=>({id:u.id,transform:unitTransform(c,u)}));
 for(const target of ['blender','max']) {
   assert.equal(generate({...restored,target}),generate({...c,target}));
   assert.ok(!generate({...c,target}).includes("'activation_zone'"));
   writeFileSync(join(fixture,id+(target==='blender'?'.py':'.ms')),generate({...c,target,activationExportGuides:true}));
 }
 manifest.push({id,config:c,units,zones:[...(g.waiting?[g.waiting]:[]),...g.participation,...g.circulation]});
 writeFileSync(join(fixture,'manifest.json'),JSON.stringify(manifest));
});
test('recusa sobreposições, percursos bloqueados e quantidade que não cabe, sem mutação',()=>{
 const bad=[{width:3,depth:3},{touchCount:10},{activationExitSide:'front'},
   {activationCirculationWidth:2,activationEntranceWidth:1.5},
   {activationWaitingManual:true,activationWaitingX:0,activationWaitingY:2},
   {objectTransforms:{'touchScreens:0':{x:3.6,y:2,rotation:90}}},
   {objectTransforms:{'touchScreens:0':{x:0,y:0,rotation:45}}},
   {activationWaitingEnabled:'sim'},{activationWaitingX:NaN},{activationExportGuides:2},
   {activationStationGap:-1},{activationEntranceSide:'outro'},{touchScreens:false},
   {objectTransforms:{'touchScreens:9':{x:0,y:0,rotation:0}}}];
 for(const patch of bad){const c={...base(),...patch},before=JSON.stringify(c);assert.throws(()=>validate(c));assert.equal(JSON.stringify(c),before);}
});
test('posição e rotação da participação acompanham o mesmo ajuste do totem',()=>{
 const c={...base(),width:12,depth:10,objectTransforms:{'touchScreens:0':{x:1,y:0,rotation:90}}};
 const g=activationGeometry(validate(c)),p=g.participation[0];
 assert.ok(Math.abs(p.x-(1+(c.touchBaseDepth+c.activationParticipationDepth)/2))<1e-6);
 assert.ok(Math.abs(p.y)<1e-6);assert.equal(g.stations[0].rotation,90);
});
test('versão 6 recebe zonas e preserva ajustes antigos válidos; versão 7 exige os novos campos',()=>{
 for(const type of ['stand','palco','lounge','activation']) {
   const c=createProjectConfig(type);if(type==='activation'){c.width=12;c.depth=10;c.objectTransforms={'touchScreens:0':{x:0,y:0,rotation:45}};}
   const old={...c};for(const key of Object.keys(activationDefaults))if(key!=='activationModel') delete old[key];
   const restored=parseProject(JSON.stringify({format:'code-buddy-project',version:6,config:old}));
   assert.deepEqual(restored,c);
 }
 const current=JSON.parse(serializeProject(base()));delete current.config.activationEntranceSide;
 assert.throws(()=>parseProject(JSON.stringify(current)),/ausente/);
});
