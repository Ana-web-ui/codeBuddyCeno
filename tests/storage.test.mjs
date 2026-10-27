import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
const require=createRequire(import.meta.url), ts=require('typescript');
const output=mkdtempSync(join(tmpdir(),'codebuddy-storage-'));
const result=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),
    '--target','ES2022','--module','commonjs','--moduleResolution','node','--strict',
    '--skipLibCheck','--esModuleInterop','--outDir',output,'lib/project-file.ts'],{encoding:'utf8'});
assert.equal(result.status,0,result.stdout+result.stderr);
writeFileSync(join(output,'package.json'),'{"type":"commonjs"}');
const {defaults,findStoragePosition,validate,assemblyGeometry}=require(join(output,'generator.js'));
const {storageGeometry,storageRectsOverlap}=require(join(output,'storage.js'));
const {serializeProject,parseProject}=require(join(output,'project-file.js'));
function positioned(overrides={}) {
    const c={...structuredClone(defaults),...overrides,storageEnabled:true,objectTransforms:{}};
    return {...c,...findStoragePosition(c)};
}
for(const side of ['front','back','left','right']) {
    test(`depósito: ${side}, duas dobradiças, dois sentidos e quatro orientações`,()=>{
        for(const hinge of ['left','right']) for(const opening of ['inward','outward']) for(const rotation of [0,90,180,270]) {
            const c=positioned({storageDoorSide:side,storageDoorHinge:hinge,storageDoorOpening:opening,frontRotation:rotation});
            validate(c);
            assert.deepEqual(parseProject(serializeProject(c)),c);
            const {door}=storageGeometry(c);
            const a={x:door.closedEnd.x-door.hinge.x,y:door.closedEnd.y-door.hinge.y};
            const b={x:door.openEnd.x-door.hinge.x,y:door.openEnd.y-door.hinge.y};
            assert.ok(Math.abs(Math.hypot(a.x,a.y)-c.storageDoorWidth)<1e-8);
            assert.ok(Math.abs(Math.hypot(b.x,b.y)-c.storageDoorWidth)<1e-8);
            assert.ok(Math.abs(a.x*b.x+a.y*b.y)<1e-8);
        }
    });
}
test('móveis automáticos e ajustes respeitam o depósito e o acesso',()=>{
    const c=positioned({pedestals:true,pedestalCount:3});
    validate(c);
    const geometry=storageGeometry(c);
    for(const unit of assemblyGeometry(c)) for(const member of unit.members) {
        const rect={centerX:member.x,centerY:member.y,width:member.width,depth:member.depth};
        assert.equal(storageRectsOverlap(rect,geometry.footprint),false);
        assert.equal(storageRectsOverlap(rect,geometry.access),false);
    }
    assert.throws(()=>validate({...c,objectTransforms:{'pedestals:0':{x:c.storageX,y:c.storageY,rotation:0}}}),/reservada/);
});
test('dimensões, limites e falta de espaço são rejeitados',()=>{
    const c=positioned();
    assert.throws(()=>validate({...c,storageX:30}),/ultrapassa/);
    assert.throws(()=>validate({...c,storageDoorWidth:1.5,storageWidth:1}),/porta/);
    assert.throws(()=>findStoragePosition({...c,storageWidth:10,storageDepth:10}),/não cabe/);
    assert.equal(storageGeometry({...defaults,storageEnabled:false}),null);
});
test('ativação real da interface é atômica: falhas não substituem o projeto',()=>{
    const source=readFileSync(resolve('app/page.tsx'),'utf8');
    const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let fn;
    function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='placeStorage')fn=n; ts.forEachChild(n,visit);}
    visit(ast); assert.ok(fn);
    let state=structuredClone(defaults), error='';
    const ctx=vm.createContext({Error,c:state,findStoragePosition,validate,setC:c=>{state=c;},
        setSelectedId:()=>{},setError:e=>{error=e;},setAssemblyError:()=>{},setNotice:()=>{}});
    vm.runInContext(ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
    ctx.placeStorage(); assert.equal(error,''); assert.equal(state.storageEnabled,true); validate(state);
    const unchanged=state;
    ctx.c={...state,storageWidth:10,storageDepth:10};
    ctx.placeStorage(); assert.match(error,/não cabe/); assert.equal(state,unchanged);
});
test('JSON versão 3 recebe depósito desligado sem perder orientação e móveis',()=>{
    const c={...structuredClone(defaults),frontRotation:90,pedestals:true,pedestalCount:1,
        objectTransforms:{'pedestals:0':{x:1,y:0,rotation:30}}};
    const legacy=Object.fromEntries(Object.entries(c).filter(([key])=>!key.startsWith('storage')));
    const restored=parseProject(JSON.stringify({format:'code-buddy-project',version:3,config:legacy}));
    assert.equal(restored.storageEnabled,false);
    assert.equal(restored.frontRotation,90);
    assert.deepEqual(restored.objectTransforms,c.objectTransforms);
});
