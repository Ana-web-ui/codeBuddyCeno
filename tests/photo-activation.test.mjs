import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),out=mkdtempSync(join(tmpdir(),'codebuddy-photo-'));
const result=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--strict','--skipLibCheck','--esModuleInterop','--outDir',out,'lib/project-file.ts'],{encoding:'utf8'});
assert.equal(result.status,0,result.stdout+result.stderr);writeFileSync(join(out,'package.json'),'{"type":"commonjs"}');
const {createProjectConfig,createActivationModelConfig}=require(join(out,'project-types.js'));
const {validate,generate,assemblyGeometry}=require(join(out,'generator.js'));
const {activationGeometry,zonesOverlap}=require(join(out,'activation-geometry.js'));
const {photoDefaults}=require(join(out,'activation.js'));
const {parseProject,serializeProject}=require(join(out,'project-file.js'));
const {unitTransform}=require(join(out,'assembly.js'));
const base=()=>createActivationModelConfig(createProjectConfig('activation'),'photo');
const fixture=process.env.CODEBUDDY_PHOTO_FIXTURES?resolve(process.env.CODEBUDDY_PHOTO_FIXTURES):join(out,'fixtures');
mkdirSync(fixture,{recursive:true});const manifest=[];
const sides=['front','right','back','left'];
const cases=[['padrao',base()],['sem-espera',{...base(),activationWaitingEnabled:false}],
 ['sem-guias',{...base(),activationExportGuides:false}],
 ['espera-manual',{...base(),activationWaitingManual:true,activationWaitingX:-3.8,activationWaitingY:-3.2}],
 ['ajustado',{...base(),width:12,depth:12,objectTransforms:{'backdrops:0':{x:-.5,y:1,rotation:45}}}],
 ['distancias',{...base(),depth:12,activationPhotoPersonDistance:1.8,activationPhotoCameraDistance:3,activationPhotoCameraHeight:1.7}],
 ...sides.flatMap(side=>sides.filter(exit=>exit!==side).map(exit=>[side+'-'+exit,{...base(),activationEntranceSide:side,activationExitSide:exit}]))];
for(const [id,c] of cases) test('Espaço para fotos: '+id,()=>{
 validate(c);const before=JSON.stringify(c),g=activationGeometry(c),p=g.photo;
 assert.ok(p);assert.equal(g.stations.length,1);assert.equal(g.stations[0].id,'backdrops:0');
 assert.equal(c.touchScreens,false);assert.equal(c.backdrops,true);
 assert.ok(Math.abs(Math.hypot(p.person.x-g.stations[0].x,p.person.y-g.stations[0].y)-c.activationPhotoPersonDistance)<1e-6);
 assert.ok(Math.abs(Math.hypot(p.camera.x-p.person.x,p.camera.y-p.person.y)-c.activationPhotoCameraDistance)<1e-6);
 for(const z of g.circulation){assert.ok(!zonesOverlap(z,p.capture));if(g.waiting)assert.ok(!zonesOverlap(z,g.waiting));}
 const restored=parseProject(serializeProject(c));assert.deepEqual(restored,c);assert.equal(JSON.stringify(c),before);
 const zones=[...(g.waiting?[g.waiting]:[]),...g.participation,p.capture,p.camera,...g.circulation];
 for(const target of ['blender','max']){
   const script=generate({...c,target});assert.equal(script,generate({...restored,target}));
   assert.ok(script.includes('photo_camera'));assert.equal(script.includes("'activation_zone'"),target==='blender'&&c.activationExportGuides);
   writeFileSync(join(fixture,id+(target==='blender'?'.py':'.ms')),script);
 }
 const units=assemblyGeometry(c).map(u=>({id:u.id,transform:unitTransform(c,u)}));
 manifest.push({id,config:c,photo:p,units,zones:c.activationExportGuides?zones:[]});
 writeFileSync(join(fixture,'manifest.json'),JSON.stringify(manifest));
});
test('troca de modelo limpa elementos e ajustes incompatíveis e mantém dados gerais',()=>{
 const source={...base(),name:'TV1 Fotos',target:'max',color:'#ff0033',floorMat:'wood',objectTransforms:{'backdrops:0':{x:0,y:1,rotation:0}}};
 const touch=createActivationModelConfig(source,'touch');validate(touch);
 assert.equal(touch.activationModel,'touch');assert.equal(touch.touchScreens,true);assert.equal(touch.backdrops,false);assert.deepEqual(touch.objectTransforms,{});
 for(const key of ['name','target','color','floorMat'])assert.equal(touch[key],source[key]);
 const photo=createActivationModelConfig(touch,'photo');validate(photo);assert.deepEqual(photo.objectTransforms,{});
 assert.throws(()=>createActivationModelConfig(source,'outro'));
});
test('foto recusa câmera sobre pessoa, bases sobre pessoa, falta de espaço e elementos ocultos',()=>{
 for(const patch of [{activationPhotoPersonDistance:.5},{activationPhotoCameraDistance:.6},
   {activationPhotoCameraHeight:4},{activationPhotoCameraWidth:NaN},{activationPhotoCameraDepth:0},
   {width:3,depth:3},{backdropCount:2},{backdrops:false},{touchScreens:true},{counter:true},
   {objectTransforms:{'touchScreens:0':{x:0,y:0,rotation:0}}},
   {activationWaitingManual:true,activationWaitingX:0,activationWaitingY:1},
   {objectTransforms:{'backdrops:0':{x:4,y:0,rotation:90}}}]) {
   const c={...base(),...patch},before=JSON.stringify(c);assert.throws(()=>validate(c));assert.equal(JSON.stringify(c),before);
 }
});
test('JSON versão 7 migra todos os tipos preservando zonas, cores e ajustes anteriores',()=>{
 for(const type of ['stand','palco','lounge','activation']) {
   const c=createProjectConfig(type);if(type==='activation'){c.width=12;c.depth=10;c.objectTransforms={'touchScreens:0':{x:0,y:0,rotation:45}};}
   const old={...c};for(const key of Object.keys(photoDefaults))delete old[key];
   const restored=parseProject(JSON.stringify({format:'code-buddy-project',version:7,config:old}));assert.deepEqual(restored,c);
 }
 const current=JSON.parse(serializeProject(base()));assert.equal(current.version,14);delete current.config.activationPhotoCameraDistance;
 assert.throws(()=>parseProject(JSON.stringify(current)),/ausente/);
});
