"use client";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { freeParts } from '@/lib/free-scene-geometry';
import type { FreeScene, FreeObject, V3 } from '@/lib/free-scene';
export type FreeTool='select'|'move'|'rotate'|'scale'|'hand'|'wall'|'rectangle';
export type FreePose={position:V3;rotation:V3;size:V3};
export type FreeViewportApi={fit:()=>void;zoom:(factor:number)=>void;center:()=>V3;cancel:()=>void};
type Props={data:FreeScene;selectedId:number|null;tool:FreeTool;view:'3d'|'plan';snap:boolean;
    apiRef:MutableRefObject<FreeViewportApi|null>;onSelectAction:(id:number|null)=>void;
    onTransformAction:(id:number,pose:FreePose)=>boolean;onWallAction:(a:V3,b:V3)=>void;onRectangleAction:(a:V3,b:V3)=>void;onBusyAction:(busy:boolean)=>void};
function disposeTree(root:THREE.Object3D) {
    root.traverse(obj=>{ if(obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose(); const materials=Array.isArray(obj.material)?obj.material:[obj.material];
        for(const material of materials) {const map=(material as THREE.MeshBasicMaterial).map;if(map && !map.userData.freeShared)map.dispose();material.dispose();}
    }});
}
function textTexture(text:string,color:string):THREE.CanvasTexture {
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;
    const lines=(text || ' ').split('\n');ctx.font='128px Arial';
    const width=Math.max(1,...lines.map(line=>ctx.measureText(line).width)),factor=Math.min(1,1020/width,508/(lines.length*160));
    const font=128*factor,lineHeight=160*factor;
    canvas.width=Math.max(4,Math.ceil(width*factor)+4);canvas.height=Math.max(4,Math.ceil(lineHeight*lines.length)+4);
    ctx.font=`${font}px Arial`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
    lines.forEach((line,i)=>ctx.fillText(line,canvas.width/2,2+(i+.5)*lineHeight));
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function buildObject(o:FreeObject,textures:Map<string,THREE.Texture>):THREE.Group {
    const root=new THREE.Group();root.name=o.name;root.userData.freeId=o.id;root.userData.config=o;
    root.rotation.order='ZYX';root.position.fromArray(o.position);root.rotation.set(...o.rotation.map(THREE.MathUtils.degToRad) as V3,'ZYX');root.visible=o.visible;
    if(!o.visible)return root;
    for(const part of freeParts(o)) {
        let geometry:THREE.BufferGeometry;
        if(part.shape==='cylinder')geometry=new THREE.CylinderGeometry(.5,.5,1,32).rotateX(Math.PI/2);
        else if(part.shape==='image' || part.shape==='text')geometry=new THREE.PlaneGeometry(part.size[0],part.size[2]).rotateX(Math.PI/2);
        else if(part.shape==='mesh') {
            geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(part.vertices!.flat(),3));geometry.setIndex(part.faces!.flat());geometry.computeVertexNormals();
        } else geometry=new THREE.BoxGeometry(...part.size);
        let material:THREE.Material;
        if(part.shape==='text') material=new THREE.MeshBasicMaterial({map:textTexture(part.text!,part.color),transparent:true,opacity:part.opacity,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
        else if(part.shape==='image') {
            let map=textures.get(part.image!);
            if(!map){map=new THREE.TextureLoader().load(part.image!);map.colorSpace=THREE.SRGBColorSpace;map.userData.freeShared=true;textures.set(part.image!,map);}
            material=new THREE.MeshBasicMaterial({map,transparent:true,opacity:part.opacity,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
        } else material=new THREE.MeshStandardMaterial({color:part.color,roughness:o.roughness,transparent:part.opacity<1,opacity:part.opacity,side:THREE.DoubleSide,depthWrite:part.opacity>=1});
        const mesh=new THREE.Mesh(geometry,material);mesh.name=part.name;mesh.position.fromArray(part.center);
        if(part.shape==='cylinder')mesh.scale.fromArray(part.size);
        root.add(mesh);
    }
    return root;
}
export function FreeSceneViewport(props:Props) {
    const host=useRef<HTMLDivElement>(null),latest=useRef(props),runtime=useRef<{sync:()=>void}|null>(null);
    const [error,setError]=useState('');
    useLayoutEffect(()=>{latest.current=props;runtime.current?.sync();},[props]);
    useEffect(()=>{
        const container=host.current!;let renderer:THREE.WebGLRenderer;
        try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); }
        catch {const notification=requestAnimationFrame(()=>setError('O navegador não disponibilizou WebGL para a cena 3D. Ative a aceleração gráfica e recarregue esta página.'));return ()=>cancelAnimationFrame(notification);}
        renderer.setClearColor('#ffffff');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Cena 3D livre: selecione e transforme objetos');container.appendChild(renderer.domElement);
        const scene=new THREE.Scene(),objects=new THREE.Group();scene.add(objects);
        scene.add(new THREE.HemisphereLight(0xffffff,0xa3afc3,2.2));
        const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(5,-8,12);scene.add(light);
        const fill=new THREE.DirectionalLight(0xffffff,1.2);fill.position.set(-8,4,6);scene.add(fill);
        const perspective=new THREE.PerspectiveCamera(42,1,.01,500000);perspective.up.set(0,0,1);perspective.position.set(10,-12,10);
        const plan=new THREE.OrthographicCamera(-10,10,10,-10,.01,500000);plan.up.set(0,1,0);plan.position.set(0,0,25);
        let camera:THREE.PerspectiveCamera|THREE.OrthographicCamera=perspective;
        let controls:OrbitControls<THREE.PerspectiveCamera|THREE.OrthographicCamera>=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.update();
        const transform=new TransformControls(camera,renderer.domElement);transform.setSize(.85);scene.add(transform.getHelper());
        const selection=new THREE.Box3Helper(new THREE.Box3(),0x5268df);selection.visible=false;scene.add(selection);
        const draft=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x657be5,transparent:true,opacity:.35}));draft.visible=false;scene.add(draft);
        const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
        let grid:THREE.GridHelper|null=null,gridSize=0,currentView:'3d'|'plan'='3d';let lastW=0,lastH=0,disposed=false;
        const nodes=new Map<number,THREE.Group>(),textures=new Map<string,THREE.Texture>();
        let direct:{id:number;start:THREE.Vector3;position:V3}|null=null;
        let wallStart:THREE.Vector3|null=null,wallEnd:THREE.Vector3|null=null;
        let down:{x:number;y:number;gizmo:boolean}|null=null;
        let busy=false,ignoreGizmoCommit=false;
        const markBusy=(value:boolean)=>{busy=value;latest.current.onBusyAction(value);};
        function resize() {
            const w=container.clientWidth,h=container.clientHeight;if(!w || !h || (w===lastW && h===lastH))return;
            lastW=w;lastH=h;renderer.setSize(w,h,false);perspective.aspect=w/h;perspective.updateProjectionMatrix();
            const span=(plan.top-plan.bottom)/2 || 10;plan.left=-span*w/h;plan.right=span*w/h;plan.updateProjectionMatrix();
        }
        function configure() {
            const p=latest.current;
            controls.enableRotate=p.view==='3d';controls.minDistance=.1;controls.maxDistance=200000;controls.minZoom=.02;controls.maxZoom=100;
            controls.enabled=p.tool!=='wall' && !busy;
            controls.mouseButtons.LEFT=p.tool==='hand'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;
            controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;
            transform.setMode(p.tool==='rotate'?'rotate':p.tool==='scale'?'scale':'translate');
            transform.setSpace('world');transform.setTranslationSnap(p.snap?.1:null);transform.setRotationSnap(p.snap?Math.PI/12:null);transform.setScaleSnap(null);
            transform.showX=p.view==='3d' || p.tool!=='rotate';transform.showY=transform.showX;transform.showZ=p.view==='3d' || p.tool==='rotate';
            const selected=p.selectedId===null?null:nodes.get(p.selectedId),data=selected?.userData.config as FreeObject|undefined;
            const showManipulator = ['select', 'move', 'rotate', 'scale'].includes(p.tool);

if (selected && data?.visible && !data.locked && showManipulator) {
    if (transform.object !== selected) {
        transform.attach(selected);
    }
} else {
    transform.detach();
}
            selection.visible=!!selected && !!data?.visible;if(selected && selection.visible)selection.box.setFromObject(selected);
        }
        function sync() {
            const p=latest.current;
            if(p.view!==currentView) {
                const target=controls.target.clone();controls.dispose();camera=p.view==='3d'?perspective:plan;
                if(p.view==='plan'){plan.left=-plan.top*lastW/Math.max(lastH,1);plan.right=-plan.left;plan.updateProjectionMatrix();plan.position.set(target.x,target.y,target.z+100);plan.lookAt(target);}
                controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.copy(target);controls.update();
                transform.camera=camera;currentView=p.view;
            }
            const ids=new Set(p.data.objects.map(o=>o.id));
            for(const [id,node] of nodes)if(!ids.has(id)){if(transform.object===node)transform.detach();objects.remove(node);disposeTree(node);nodes.delete(id);}
            for(const o of p.data.objects) {
                const old=nodes.get(o.id);if(old?.userData.config===o)continue;
                if(old){if(transform.object===old)transform.detach();objects.remove(old);disposeTree(old);}
                const node=buildObject(o,textures);objects.add(node);nodes.set(o.id,node);
            }
            if(gridSize!==p.data.gridSize || !grid){if(grid){scene.remove(grid);disposeTree(grid);}grid=new THREE.GridHelper(p.data.gridSize,Math.min(100,Math.round(p.data.gridSize)),0xc6cdd9,0xe7eaf0);grid.rotation.x=Math.PI/2;grid.position.z=-.003;scene.add(grid);gridSize=p.data.gridSize;}
            const usedImages=new Set(p.data.objects.filter(o=>o.visible).map(o=>o.image));
            for(const [image,texture] of textures)if(!usedImages.has(image)){texture.dispose();textures.delete(image);}
            grid.visible=p.data.grid;scene.updateMatrixWorld();configure();resize();
        }
        function setRay(event:PointerEvent) {
            const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
        }
        function ground(event:PointerEvent,z=0) {
            setRay(event);const hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),-z),new THREE.Vector3());
            if(hit && latest.current.snap){hit.x=Math.round(hit.x*10)/10;hit.y=Math.round(hit.y*10)/10;}return hit;
        }
        function hitObject(event:PointerEvent):THREE.Group|null {
            setRay(event);const hit=ray.intersectObjects([...nodes.values()].filter(node=>node.visible),true)[0];if(!hit)return null;
            let obj:THREE.Object3D=hit.object;while(obj.parent && obj.parent!==objects)obj=obj.parent;
            return obj.parent===objects?obj as THREE.Group:null;
        }
        function resetNode(node:THREE.Group) {const o=node.userData.config as FreeObject;node.position.fromArray(o.position);node.rotation.set(...o.rotation.map(THREE.MathUtils.degToRad) as V3,'ZYX');node.scale.set(1,1,1);}
        function commitNode(node:THREE.Group) {
            const o=node.userData.config as FreeObject;
            const pose:FreePose={position:node.position.toArray() as V3,rotation:[node.rotation.x,node.rotation.y,node.rotation.z].map(THREE.MathUtils.radToDeg) as V3,size:o.size.map((v,i)=>v*node.scale.toArray()[i]) as V3};
            if(!latest.current.onTransformAction(o.id,pose))resetNode(node);
        }
        function pointerDown(event:PointerEvent) {
            if(event.button!==0)return;renderer.domElement.focus();down={x:event.clientX,y:event.clientY,gizmo:!!transform.axis && !!transform.object};
            const p=latest.current;
            if(p.tool==='wall' || p.tool==='rectangle') {const point=ground(event);if(!point)return;wallStart=point;wallEnd=point.clone();controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);markBusy(true);event.preventDefault();return;}
            if(down.gizmo)return;
            const node=hitObject(event);
            if(node && p.tool==='move' && !(node.userData.config as FreeObject).locked){
                const point=ground(event,node.position.z);if(!point)return;
                p.onSelectAction(node.userData.freeId);direct={id:node.userData.freeId,start:point,position:node.position.toArray() as V3};
                controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);markBusy(true);event.preventDefault();
            }
        }
        function pointerMove(event:PointerEvent) {
            if (wallStart) {
                const point = ground(event);
                if (point) {
                    wallEnd = point;
                    const dx = point.x - wallStart.x;
                    const dy = point.y - wallStart.y;
                    const centerX = (point.x + wallStart.x) / 2;
                    const centerY = (point.y + wallStart.y) / 2;

                    if (latest.current.tool === 'rectangle') {
                        const width = Math.abs(dx);
                        const depth = Math.abs(dy);
                        draft.visible = width >= 0.05 && depth >= 0.05;
                        draft.scale.set(width, depth, 1);
                        draft.position.set(centerX, centerY, 0.5);
                        draft.rotation.z = 0;
                    } else {
                        const length = Math.hypot(dx, dy);
                        draft.visible = length > 0.01;
                        draft.scale.set(Math.max(0.001, length), 0.12, 3);
                        draft.position.set(centerX, centerY, 1.5);
                        draft.rotation.z = Math.atan2(dy, dx);
                    }
                }
            }
            if(direct){const node=nodes.get(direct.id),point=ground(event,direct.position[2]);if(node && point){node.position.set(direct.position[0]+point.x-direct.start.x,direct.position[1]+point.y-direct.start.y,direct.position[2]);}}
        }
        function pointerUp(event:PointerEvent) {
            if(event.button!==0)return;
            const hadWall=!!wallStart,hadDirect=!!direct;
            if (wallStart && wallEnd) {
                const a = wallStart.toArray() as V3;
                const b = (ground(event) ?? wallEnd).toArray() as V3;
                wallStart = null;
                wallEnd = null;
                draft.visible = false;
                markBusy(false);

                const dx = b[0] - a[0];
                const dy = b[1] - a[1];
                if (latest.current.tool === 'rectangle') {
                    if (Math.abs(dx) >= 0.05 && Math.abs(dy) >= 0.05) {
                        latest.current.onRectangleAction(a, b);
                    }
                } else if (Math.hypot(dx, dy) >= 0.05) {
                    latest.current.onWallAction(a, b);
                }
            }
            if(direct){const node=nodes.get(direct.id);direct=null;markBusy(false);if(node)commitNode(node);}
            if(!hadWall && !hadDirect && down && !down.gizmo && Math.hypot(event.clientX-down.x,event.clientY-down.y)<4 && latest.current.tool!=='hand')latest.current.onSelectAction(hitObject(event)?.userData.freeId ?? null);
            if((hadWall || hadDirect) && renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);
            down=null;configure();
        }
        function cancel() {
            if(direct){const node=nodes.get(direct.id);if(node)resetNode(node);direct=null;}
            wallStart=null;wallEnd=null;draft.visible=false;down=null;
            if(transform.dragging){ignoreGizmoCommit=true;transform.reset();transform.pointerUp(null);ignoreGizmoCommit=false;}
            markBusy(false);configure();
        }
        function fit() {
            const box=new THREE.Box3();for(const node of nodes.values())if(node.visible)box.expandByObject(node);
            const center=box.isEmpty()?new THREE.Vector3():box.getCenter(new THREE.Vector3());
            const size=box.isEmpty()?new THREE.Vector3(8,8,4):box.getSize(new THREE.Vector3());
            const span=Math.max(size.x,size.y,size.z,3),aspect=lastW/Math.max(lastH,1);
            perspective.position.copy(center).add(new THREE.Vector3(1,-1,.8).normalize().multiplyScalar(span*2.3));
            plan.position.set(center.x,center.y,center.z+span*3+20);plan.top=Math.max(size.y,size.x/aspect,3)*.7;plan.bottom=-plan.top;plan.left=-plan.top*aspect;plan.right=plan.top*aspect;plan.zoom=1;plan.updateProjectionMatrix();
            controls.target.copy(center);controls.update();
        }
        function zoom(factor:number){if(camera===plan){plan.zoom=THREE.MathUtils.clamp(plan.zoom*factor,.02,100);plan.updateProjectionMatrix();}else{perspective.position.sub(controls.target).multiplyScalar(1/factor).add(controls.target);}controls.update();}
        const onDrag=(event:{value:unknown})=>{markBusy(!!event.value);controls.enabled=!event.value && latest.current.tool!=='wall';};
        const onGizmoUp=()=>{if(transform.object && !ignoreGizmoCommit)commitNode(transform.object as THREE.Group);};
        transform.addEventListener('dragging-changed',onDrag);transform.addEventListener('mouseUp',onGizmoUp);
        const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape' && busy && latest.current.tool!=='rectangle'){event.preventDefault();event.stopPropagation();cancel();}};
        const canvas=renderer.domElement;
        canvas.addEventListener('pointerdown',pointerDown,true);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);
        canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('keydown',onKey);
        const observer=new ResizeObserver(resize);observer.observe(container);
        const api={fit,zoom,center:()=>[controls.target.x,controls.target.y,0] as V3,cancel};latest.current.apiRef.current=api;runtime.current={sync};sync();
        renderer.setAnimationLoop(()=>{if(disposed || !container.clientWidth || !container.clientHeight)return;controls.update();scene.updateMatrixWorld();const selected=latest.current.selectedId===null?null:nodes.get(latest.current.selectedId);if(selected && selection.visible)selection.box.setFromObject(selected);renderer.render(scene,camera);});
        return ()=>{disposed=true;runtime.current=null;latest.current.apiRef.current=null;observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();transform.dispose();canvas.removeEventListener('pointerdown',pointerDown,true);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('keydown',onKey);disposeTree(scene);for(const texture of textures.values())texture.dispose();textures.clear();renderer.dispose();renderer.forceContextLoss();canvas.remove();};
    },[]);
    return <div ref={host} className={`free-viewport tool-${props.tool}`} role="application" aria-label="Área de criação 3D" data-view={props.view}>
        {error && <p role="alert" className="free-webgl-error">{error}</p>}
        {!error && props.data.objects.length===0 && <div className="free-blank-hint"><strong>Comece do zero.</strong><span>Desenhe uma parede ou escolha uma peça para inserir.</span></div>}
    </div>;
}
