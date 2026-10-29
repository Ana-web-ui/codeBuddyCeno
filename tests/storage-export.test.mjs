import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const output=mkdtempSync(join(tmpdir(),'codebuddy-storage-export-'));
const compilation=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),
    '--target','ES2022','--module','commonjs','--moduleResolution','node','--strict',
    '--skipLibCheck','--esModuleInterop','--outDir',output,'lib/project-file.ts'],{encoding:'utf8'});
assert.equal(compilation.status,0,compilation.stdout+compilation.stderr);
writeFileSync(join(output,'package.json'),'{"type":"commonjs"}');
const {defaults,generate,findStoragePosition,validate}=require(join(output,'generator.js'));
const {storageParts}=require(join(output,'storage-exporters.js'));
const {serializeProject,parseProject}=require(join(output,'project-file.js'));
const fixtures=process.env.CODEBUDDY_EXPORT_FIXTURES ? resolve(process.env.CODEBUDDY_EXPORT_FIXTURES) : join(output,'fixtures');
mkdirSync(fixtures,{recursive:true});
const manifest=[];
for(const side of ['front','back','left','right']) {
    test(`exportação depósito: ${side}, dobradiças/sentidos/orientações e móveis ajustados`,()=>{
        for(const hinge of ['left','right']) for(const opening of ['inward','outward']) for(const rotation of [0,90,180,270]) {
            const id=`${side}-${hinge}-${opening}-${rotation}`;
            const base={...structuredClone(defaults),name:`Export ${id}`,storageEnabled:true,
                storageDoorSide:side,storageDoorHinge:hinge,storageDoorOpening:opening,frontRotation:rotation,
                storageWallMat:'wood',storageDoorMat:'brand',pedestals:true,pedestalCount:1};
            const config={...base,...findStoragePosition(base),objectTransforms:{'pedestals:0':{x:1,y:0,rotation:30}}};
            validate(config);
            const data=storageParts(config);
            assert.equal(data.parts.length,10);
            for(const part of data.parts) {
                assert.ok(part.size.every(n=>Number.isFinite(n)&&n>0));
                assert.ok(Math.abs(part.center[0]-config.storageX)+part.size[0]/2<=config.storageWidth/2+1e-8);
                assert.ok(Math.abs(part.center[1]-config.storageY)+part.size[1]/2<=config.storageDepth/2+1e-8);
                assert.ok(part.center[2]-part.size[2]/2>=0.1-1e-8);
                assert.ok(part.center[2]+part.size[2]/2<=0.1+config.storageHeight+1e-8);
            }
            // Paredes e batentes não podem fechar o centro do vão livre.
            const pivot=data.pivot, leaf=data.parts.find(p=>p.role==='storage_door');
            for(const part of data.parts.filter(p=>p.role!=='storage_door')) {
                const point=[leaf.center[0],leaf.center[1],0.1+config.storageDoorHeight/2];
                assert.equal(point.every((n,i)=>Math.abs(n-part.center[i])<part.size[i]/2-1e-8),false);
            }
            assert.equal(pivot[2],0.1); assert.equal(Math.abs(data.openAngle),90);
            const restored=parseProject(serializeProject(config));
            const python=generate({...restored,target:'blender'});
            const max=generate({...restored,target:'max'});
            assert.ok(python.indexOf('criar_deposito()\n')<python.lastIndexOf('aplicar_orientacao()'));
            assert.ok(max.indexOf('local raizDeposito')<max.indexOf('local anguloFrente'));
            assert.match(max,/peca\.pivot =/);
            assert.match(max,/peca\.parent = raizDeposito/);
            assert.doesNotMatch(max,/delete antigos/);
            for(const part of data.parts) assert.ok(max.includes('"'+part.name+'"'));
            writeFileSync(join(fixtures,id+'.py'),python);
            writeFileSync(join(fixtures,id+'.ms'),max);
            manifest.push({id,config,data});
        }
        writeFileSync(join(fixtures,'manifest.json'),JSON.stringify(manifest,null,2));
    });
}
test('depósito desligado não cria peças nem altera exportações com móveis',()=>{
    assert.equal(storageParts(defaults),null);
    assert.doesNotMatch(generate({...defaults,target:'blender'}),/def criar_deposito/);
    assert.doesNotMatch(generate({...defaults,target:'max'}),/local raizDeposito/);
});
