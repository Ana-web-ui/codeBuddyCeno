import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync,mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const out=mkdtempSync(join(tmpdir(),'codebuddy-lounge-'));
const result=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022',
    '--module','commonjs','--moduleResolution','node','--strict','--skipLibCheck','--esModuleInterop',
    '--outDir',out,'lib/project-file.ts'],{encoding:'utf8'});
assert.equal(result.status,0,result.stdout+result.stderr);
writeFileSync(join(out,'package.json'),'{"type":"commonjs"}');
const {createProjectConfig}=require(join(out,'project-types.js'));
const {validate,generate,assemblyGeometry}=require(join(out,'generator.js'));
const {placedMembers,unitTransform}=require(join(out,'assembly.js'));
const {serializeProject,parseProject}=require(join(out,'project-file.js'));
const {coffeeTableParts}=require(join(out,'coffee-table-exporters.js'));
const fixtures=process.env.CODEBUDDY_LOUNGE_FIXTURES?resolve(process.env.CODEBUDDY_LOUNGE_FIXTURES):join(out,'fixtures');
mkdirSync(fixtures,{recursive:true});
const base=()=>createProjectConfig('lounge');
const cases=[
    ['padrao',base()],
    ['tres-conjuntos',{...base(),coffeeTableCount:3}],
    ['quatro-poltronas',{...base(),coffeeTableCount:1,puffs:false,loungeArmchairsPerTable:4}],
    ['quatro-puffs',{...base(),coffeeTableCount:1,armchairs:false,loungePuffsPerTable:4}],
    ['misto',{...base(),coffeeTableCount:1,loungeArmchairsPerTable:1,loungePuffsPerTable:3}],
    ['pequeno',{...base(),width:6,depth:5,coffeeTableCount:1}],
    ['avulsos',{...base(),loungeMode:'free'}],
    ['sem-mesas',{...base(),loungeMode:'free',coffeeTables:false}],
    ['bistro',{...base(),bistroTables:true,bistroTableCount:1,stools:true,stoolDistribution:'bistro',stoolsPerBistro:2}],
    ['tapete',{...base(),roundRugs:true,rugCount:1,rugDiameter:2}],
    ['materiais',{...base(),floorMat:'concrete',coffeeTableMat:'metal',armchairMat:'brand',puffMat:'wood',coffeeTableTopThickness:0.09}],
    ...[15,45,90,-90].map(rotation=>['ajustado-'+rotation,{...base(),coffeeTableCount:1,
        objectTransforms:{'coffeeTables:0':{x:0,y:0,rotation}}}]),
    ['bistro-ajustado',{...base(),coffeeTables:false,armchairs:false,puffs:false,loungeMode:'free',
        bistroTables:true,bistroTableCount:1,stools:true,stoolDistribution:'bistro',stoolsPerBistro:3,
        objectTransforms:{'bistroTables:0':{x:0,y:0,rotation:45}}}],
];
const manifest=[];
for(const [id,config] of cases) test('JSON e exportação Lounge: '+id,()=>{
    validate(config);
    const before=JSON.stringify(config);
    const json=serializeProject(config);
    writeFileSync(join(fixtures,id+'.json'),json);
    const restored=parseProject(readFileSync(join(fixtures,id+'.json'),'utf8'));
    assert.deepEqual(restored,config);
    assert.equal(JSON.stringify(config),before);
    for(const target of ['blender','max']) assert.equal(generate({...restored,target}),generate({...config,target}));
    const units=assemblyGeometry(restored).map(unit=>({id:unit.id,label:unit.label,transform:unitTransform(restored,unit),members:placedMembers(restored,unit)}));
    const script=generate({...restored,target:'blender'});
    assert.match(script,/code_buddy_role.*assembly_unit/);
    for(const unit of units) assert.ok(script.includes("'"+unit.id+"'"));
    writeFileSync(join(fixtures,id+'.py'),script);
    writeFileSync(join(fixtures,id+'.ms'),generate({...restored,target:'max'}));
    manifest.push({id,config:restored,units});
    writeFileSync(join(fixtures,'manifest.json'),JSON.stringify(manifest,null,2));
});
test('mesa de centro respeita tampo e quatro pés',()=>{
    const c={...base(),coffeeTableTopThickness:0.09};
    const parts=coffeeTableParts(c);
    assert.equal(parts.length,5);
    assert.equal(parts[0].size[2],0.09);
    assert.ok(parts.slice(1).every(p=>p.size[2]===c.coffeeTableHeight-0.09));
});
test('JSON inválido não introduz elementos ocultos nem ajustes fora da montagem',()=>{
    for(const change of [{led:true},{back:true},{stage:true},{pedestals:true},
        {objectTransforms:{'coffeeTables:0':{x:30,y:0,rotation:0}}},
        {objectTransforms:{'coffeeTables:99':{x:0,y:0,rotation:0}}},
        {loungeArmchairsPerTable:4,loungePuffsPerTable:4},
        {coffeeTableCount:100},{coffeeTableTopThickness:null}]) {
        assert.throws(()=>parseProject(JSON.stringify({config:{...base(),...change}})));
    }
});
