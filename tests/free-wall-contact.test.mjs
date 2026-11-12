import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require=createRequire(import.meta.url),out=mkdtempSync(join(tmpdir(),'cenolab-wall-'));
const compiled=spawnSync(process.execPath,[require.resolve('typescript/bin/tsc'),'--target','ES2022','--module','commonjs','--moduleResolution','node','--strict','--skipLibCheck','--esModuleInterop','--outDir',out,'lib/free-scene.ts','lib/free-scene-groups.ts','lib/free-wall-contact.ts'],{encoding:'utf8'});
assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);
writeFileSync(join(out,'package.json'),'{"type":"commonjs"}');
const {emptyFreeScene,newFreeObject,stringifyFreeScene,parseFreeScene,validateFreeScene}=require(join(out,'free-scene.js'));
const {constrainWallMotion,wallsOverlap,placeFreeWall,placeWallCopies,toggleWallLink,wallMagnetContacts,connectedWallIds,trimDrawnWall}=require(join(out,'free-wall-contact.js'));
const {moveFreeObjects,removeFreeObjects,updateFreeObject,freeSelection}=require(join(out,'free-scene-groups.js'));
const wall=(id,x,y,angle=0,z=0)=>({...newFreeObject('wall',id),position:[x,y,z],rotation:[0,0,angle]});
const scene=(...objects)=>({...emptyFreeScene(),objects});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('movimento rápido para no contato e não atravessa uma parede fina',()=>{
 const source=scene(wall(1,0,0),wall(2,0,2));
 const moved=moveFreeObjects(source,[2],[0,-20,0]);
 near(moved.objects[1].position[1],.12);
 assert.equal(wallsOverlap(...moved.objects),false);
 assert.equal(constrainWallMotion(source,[2],[0,-20,0]).blocked,true);
 const crossing=moveFreeObjects(scene(wall(1,2,0,90),wall(2,-3,0,90)),[2],[100,0,0]);
 near(crossing.objects[1].position[0],1.88);
 const stacked=moveFreeObjects(scene(wall(1,0,0),wall(2,0,0,0,5)),[2],[0,0,-10]);
 near(stacked.objects[1].position[2],3);
});

test('encaixe reto e em L atrai a 10 cm e permite afastar após soltar',()=>{
 const straight=moveFreeObjects(scene(wall(1,0,0),wall(2,3.4,0)),[2],[-.32,0,0]);
 near(straight.objects[1].position[0],3);
 assert.equal(wallMagnetContacts(straight,[2]).length,1);
 const away=moveFreeObjects(straight,[2],[.05,0,0]);
 near(away.objects[1].position[0],3.05);
 const corner=moveFreeObjects(scene(wall(1,0,0),wall(2,1.44,3.5,90)),[2],[0,-1.87,0]);
 near(corner.objects[1].position[1],1.56);
 const contact=wallMagnetContacts(corner,[2])[0];
 assert.ok(contact);
 near(contact.point[0],1.44);near(contact.point[1],.06);
 assert.equal(wallsOverlap(...corner.objects),false);
});

test('colisão acompanha paredes giradas e ignora paredes ocultas',()=>{
 const normal=[-Math.SQRT1_2,Math.SQRT1_2,0];
 const rotated=scene(wall(1,0,0,45),wall(2,normal[0],normal[1],45));
 const moved=moveFreeObjects(rotated,[2],normal.map(value=>-2*value));
 near(moved.objects[1].position[0],normal[0]*.12);
 near(moved.objects[1].position[1],normal[1]*.12);
 const axisLocked=constrainWallMotion(rotated,[2],[1.2,0,0]);
 near(axisLocked.delta[0],1.2);near(axisLocked.delta[1],0);
 const hidden=scene({...wall(1,0,0),visible:false},wall(2,0,2));
 near(moveFreeObjects(hidden,[2],[0,-10,0]).objects[1].position[1],-8);
 const tilted={...wall(3,0,0),rotation:[90,0,0]};
 assert.equal(wallsOverlap(tilted,wall(4,0,-1,0,1)),false);
});

test('ímãs em cadeia movem juntos, bloqueiam como conjunto e desativam separadamente',()=>{
 let linked=scene(wall(1,0,0),wall(2,1.44,1.56,90),wall(3,1.44,4.56,90));
 linked=toggleWallLink(toggleWallLink(linked,1,2),2,3);
 assert.deepEqual(connectedWallIds(linked,[1]),[1,2,3]);
 assert.deepEqual(freeSelection(linked,1,[]),[2,3,1]);
 const moved=moveFreeObjects(linked,[1],[5,2,0]);
 moved.objects.forEach((object,i)=>assert.deepEqual(object.position,linked.objects[i].position.map((value,axis)=>value+[5,2,0][axis])));
 assert.equal(wallMagnetContacts(moved,[1]).filter(contact=>contact.linked).length,2);
 const released=toggleWallLink(linked,1,2);
 assert.deepEqual(connectedWallIds(released,[1]),[1]);
 const separated=moveFreeObjects(released,[1],[-.5,0,0]);
 assert.deepEqual(separated.objects[1].position,linked.objects[1].position);
 assert.throws(()=>moveFreeObjects({...linked,objects:linked.objects.map(object=>object.id===3?{...object,locked:true}:object)},[1],[1,0,0]),/Desbloqueie/);
 assert.throws(()=>updateFreeObject(linked,1,{size:[5,.12,3]}),/Solte/);
 assert.throws(()=>updateFreeObject(linked,1,{rotation:[0,0,20]}),/Solte/);
 assert.equal(removeFreeObjects(linked,[2]).wallLinks.length,0);
 assert.deepEqual(parseFreeScene(stringifyFreeScene(moved)),moved);
 if(process.env.CENOLAB_WALL_FIXTURE)writeFileSync(process.env.CENOLAB_WALL_FIXTURE,stringifyFreeScene(scene(wall(1,0,0),wall(2,3.4,0))));
});

test('conjunto conectado para inteiro antes de uma parede externa',()=>{
 const linked=toggleWallLink(scene(wall(1,0,0),wall(2,3,0),wall(3,8,0)),1,2);
 const moved=moveFreeObjects(linked,[1],[20,0,0]);
 near(moved.objects[0].position[0],2);near(moved.objects[1].position[0],5);near(moved.objects[2].position[0],8);
 assert.equal(wallsOverlap(moved.objects[1],moved.objects[2]),false);
});

test('ímã leva também as peças agrupadas com a parede conectada',()=>{
 const original={...scene(wall(1,0,0),wall(2,3,0),{...newFreeObject('box',3),position:[3,0,1]}),groups:[{id:1,name:'Parede com peça',objectIds:[2,3]}]};
 const linked=toggleWallLink(original,1,2);
 assert.deepEqual(freeSelection(linked,1,[]),[2,3,1]);
 const moved=moveFreeObjects(linked,[1],[1,0,0]);
 near(moved.objects[0].position[0],1);near(moved.objects[1].position[0],4);near(moved.objects[2].position[0],4);
 const individual=moveFreeObjects(original,[2],[1,0,0]);
 near(individual.objects[2].position[0],3);
});

test('inserção, desenho, campos e cópias evitam sobreposição',()=>{
 const original=scene(wall(1,0,0));
 assert.throws(()=>placeFreeWall(original,wall(2,0,0),false),/atravessa/);
 const inserted=placeFreeWall(original,wall(2,0,0),true);
 assert.equal(wallsOverlap(original.objects[0],inserted),false);
 near(inserted.position[0],3);
 const fixed=scene(wall(1,0,0),wall(2,4,0));
 assert.throws(()=>updateFreeObject(fixed,1,{size:[8,.12,3]}),/atravessar/);
 const typed=updateFreeObject(fixed,1,{position:[5,0,0]});
 near(typed.objects[0].position[0],1);
 const copies=placeWallCopies(original,[wall(2,.3,.3,45),{...newFreeObject('text',3),position:[.3,.3,2]}]);
 near(copies[0].position[0]-copies[1].position[0],0);
 assert.equal(wallsOverlap(original.objects[0],copies[0]),false);
 const drawn=trimDrawnWall(original,{...wall(2,0,1,90),size:[8,.12,3]});
 assert.equal(wallsOverlap(original.objects[0],drawn),false);
 assert.ok(drawn.size[0]<8);
});

test('arquivos antigos continuam válidos e conexões corrompidas são rejeitadas',()=>{
 const original=scene(wall(1,0,0),wall(2,3,0),newFreeObject('box',3));
 validateFreeScene(original);
 for(const wallLinks of [null,{},[[1,1]],[[1,9]],[[1,3]],[[1,2],[2,1]],[[1,2,3]]])assert.throws(()=>validateFreeScene({...original,wallLinks}));
 assert.throws(()=>toggleWallLink(scene(wall(1,0,0),wall(2,5,0)),1,2),/Encoste/);
 const old=scene(wall(1,0,0),wall(2,0,0));
 assert.deepEqual(parseFreeScene(stringifyFreeScene(old)),old);
 assert.equal(wallsOverlap(...moveFreeObjects(old,[2],[0,2,0]).objects),false);
});
