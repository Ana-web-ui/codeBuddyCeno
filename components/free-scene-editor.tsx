"use client";
import ImagePreview from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Box, MousePointer2, Move3D, Rotate3D, Scaling, Hand, BrickWall, Type, CopyPlus, Trash2, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Plus, Eye, EyeOff, Lock, Unlock, Upload, Grid2X2, Layers, Download, Save, FolderOpen, Magnet } from 'lucide-react';
import { FreeSceneHelp, freeTourStorageKey, tourSteps } from './free-scene-help';
import type { FreeHelpMode } from './free-scene-help';
import { FreeSceneViewport } from './free-scene-viewport';
import type { FreeTool, FreeViewportApi, FreePose } from './free-scene-viewport';
import { createStandBase, emptyFreeScene, freeCatalog, freeEnvironments, newFreeObject, stringifyFreeScene, parseFreeScene, sceneFilename, wallBetween, rectangleBetween, MAX_FREE_SCENE_BYTES } from '@/lib/free-scene';
import type { FreeEnvironment, FreeScene, FreeKind, FreeObject, FreeGroup, WallLink, V3 } from '@/lib/free-scene';
import { freeSelection, groupFreeObjects, ungroupFreeObjects, moveFreeObjects, removeFreeObjects, updateFreeObject } from '@/lib/free-scene-groups';
import { connectedWallIds, placeFreeWall, placeWallCopies, toggleWallLink, trimDrawnWall } from '@/lib/free-wall-contact';
import { exportFreeBlender, exportFreeBlenderCommand, exportFreeMax } from '@/lib/free-scene-exporters';
import { exportFreePackage } from '@/lib/free-scene-package';
import { resizeFreeObject } from '@/lib/free-scene-sizing';
import { readArtworkFile } from '@/lib/branding-upload';
import type { SupplierMount, ScreenOrientation } from '@/lib/supplier-products';
import { supplierProducts, getSupplierProduct, supplierObjectSize } from '@/lib/supplier-products';
import { modelGeometry, MAX_MODEL_BYTES } from '@/lib/imported-models';
import { useFreeSceneDraft } from './use-free-scene-draft';

function downloadFile(content:BlobPart,name:string,type:string) {
    const url=URL.createObjectURL(new Blob([content],{type})),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function NumberField({label,value,min=-10000,max=10000,step=.1,disabled=false,change}:{label:string;value:number;min?:number;max?:number;step?:number;disabled?:boolean;change:(n:number)=>boolean}) {
    const [editVersion,setEditVersion] = useState(0);
    return <label>{label}<input key={`${value}:${editVersion}`} aria-label={label} type="number" min={min} max={max} step={step} disabled={disabled} defaultValue={Number(value.toFixed(4))}
        onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}
        onBlur={event=>{const raw=event.currentTarget.value,n=Number(raw);if(raw===String(Number(value.toFixed(4))))return;if(!raw.trim() || !Number.isFinite(n) || n<min || n>max || !change(n))event.currentTarget.value=String(Number(value.toFixed(4)));setEditVersion(previous=>previous+1);}}/></label>;
}
const toolItems=[{id:'select',label:'Selecionar (M)',Icon:MousePointer2},{id:'move',label:'Mover (V)',Icon:Move3D},{id:'rotate',label:'Girar (G)',Icon:Rotate3D},{id:'scale',label:'Redimensionar (S)',Icon:Scaling},{id:'hand',label:'Navegar (H)',Icon:Hand},{id:'wall',label:'Desenhar parede (B)',Icon:BrickWall},{id:'rectangle',label:'Desenhar retângulo (R)',Icon:Box}] as const;
export default function FreeSceneEditor({onGuided}:{onGuided:()=>void}) {
    const [history,setHistory]=useState(()=>({past:[] as FreeScene[],present:emptyFreeScene(),future:[] as FreeScene[]}));
    const data=history.present,current=useRef(data),epoch=useRef(0);
    const copiedObject = useRef<{objects: FreeObject[]; groups: FreeGroup[]; wallLinks: WallLink[]} | null>(null);
    const [selection, setSelection] = useState<number[]>([]);
    const selectedIds = selection.filter(id => data.objects.some(object => object.id === id));
    const selectedId = selectedIds.at(-1) ?? null;
    const selectionRef = useRef(selectedIds);
    useLayoutEffect(() => { selectionRef.current = selectedIds; });
    const [tool,setTool]=useState<FreeTool>('move'),[view,setView]=useState<'3d'|'plan'>('3d');
    const [panel,setPanel]=useState<'insert'|'object'|'layers'|'scene'>('insert'),[snap,setSnap]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
    const [keepProportions, setKeepProportions] = useState(true);
    const [showStart, setShowStart] = useState(false);
    const startDialog = useRef<HTMLDialogElement>(null);
    useLayoutEffect(() => {
        const dialog = startDialog.current;
        if (showStart && dialog && !dialog.open) dialog.showModal();
        return () => { if (dialog?.open) dialog.close(); };
    }, [showStart]);

    const [showObjImport, setShowObjImport] = useState(false);
    const [objUnit,setObjUnit]=useState<'m'|'cm'|'mm'>('m'),[objAxis,setObjAxis]=useState<'z'|'y'>('z');
    const [notice,setNotice]=useState('Cena vazia. Insira uma peça ou desenhe uma parede.'),[error,setError]=useState(''),[target,setTarget]=useState<'blender'|'max'>('blender');
    const api=useRef<FreeViewportApi|null>(null),fileInput=useRef<HTMLInputElement>(null),objInput=useRef<HTMLInputElement>(null),imageInput=useRef<HTMLInputElement>(null),fileRequest=useRef(0);
    const restoreDraft = useCallback((scene: FreeScene | null) => {
        if (!scene) { setShowStart(true); return; }
        current.current = scene;
        setHistory({past: [], present: scene, future: []});
        setView(scene.view);
        setPanel('layers');
        setNotice('Seu trabalho anterior foi recuperado deste navegador.');
        requestAnimationFrame(()=>api.current?.fit());
    }, [setHistory,setNotice,setPanel,setShowStart,setView]);
    const {restoring: restoringDraft, status: draftStatus, save: saveDraft} = useFreeSceneDraft(restoreDraft);
    useLayoutEffect(()=>{current.current=data;},[data]);
    const selected=data.objects.find(o=>o.id===selectedId);
    const canEditSelection = selectedIds.length > 0 && !busy && !loading && !restoringDraft && !data.objects.some(object => selectedIds.includes(object.id) && object.locked);
    const canEdit = canEditSelection && selectedIds.length === 1;
    const selectedWallLinked = !!data.wallLinks?.some(pair=>pair.includes(selectedId ?? -1));
    const canEditShape = canEdit && !selectedWallLinked;
    const selectedGroup = data.groups?.find(group => group.objectIds.length === selectedIds.length && group.objectIds.every(id => selectedIds.includes(id)));
    const selectedProduct = getSupplierProduct(selected?.productId);
    const nextId=()=>Math.max(0,...current.current.objects.map(o=>o.id))+1;
    const commit=useCallback((input:FreeScene):boolean=>{
        if (restoringDraft) return false;
        try {
            const next: FreeScene = { ...input, objects: input.objects.map(object =>
                object.originalSize ? object : { ...object, originalSize: [...object.size] as V3 }) };

            stringifyFreeScene(next);if(JSON.stringify(next)===JSON.stringify(current.current))return true;
            epoch.current++;current.current=next;
            setHistory(previous=>({past:[...previous.past.slice(-39),previous.present],present:next,future:[]}));
            saveDraft({...next,view});setError('');return true;
        } catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar a cena.');return false;}
    },[restoringDraft,saveDraft,view]);
    const select=useCallback((id:number|null, additive = false, individual = false)=>{
        if (id === null && additive) return;
        const ids = id === null ? [] : freeSelection(current.current, id, selectionRef.current, additive, individual);
        selectionRef.current = ids;
        setSelection(ids);
        if (ids.length > 1) setTool(previous=>previous==='rotate' || previous==='scale' ? 'move' : previous);
        if(id!==null)setPanel('object');
    },[]);
    const transform=useCallback((id:number,pose:FreePose)=>{
        const scene=current.current,item=scene.objects.find(o=>o.id===id);if(!item || item.locked)return false;
        if (selectionRef.current.length > 1 && selectionRef.current.includes(id)) {
            try {
                const delta = pose.position.map((value, axis) => value - item.position[axis]) as V3;
                return commit(moveFreeObjects(scene, selectionRef.current, delta));
            } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível mover o conjunto.'); return false; }
        }
        try {return commit(updateFreeObject(scene,id,pose));}
        catch(error){setError(error instanceof Error?error.message:'Não foi possível transformar a peça.');return false;}
    },[commit]);
    const addWall=useCallback((a:V3,b:V3)=>{
        const scene=current.current,id=Math.max(0,...scene.objects.map(o=>o.id))+1;
        try{const wall=trimDrawnWall(scene,wallBetween(a,b,id));if(commit({...scene,objects:[...scene.objects,wall]})){select(id);setNotice('Parede criada. Aproxime outra parede para encaixar e ligar o ímã.');}}catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a parede.');}
    },[commit,select]);
    function addRectangle(a: V3, b: V3) {
        const scene = current.current;
        const block = rectangleBetween(a, b, nextId());

        if (commit({ ...scene, objects: [...scene.objects, block] })) {
            select(block.id);
            setTool('move');
            setNotice('Bloco criado. Ajuste a altura em Propriedades.');
        }
    }

    function activateTool(nextTool: FreeTool) {
        if ((selectedIds.length > 1 || selectedWallLinked) && (nextTool === 'rotate' || nextTool === 'scale')) {
            setNotice(selectedWallLinked?'Solte o ímã antes de girar ou redimensionar as paredes.':'Para girar ou redimensionar, selecione uma peça dentro do grupo pela Lista de peças.');
            return;
        }
        setTool(nextTool);
        if (nextTool === 'rectangle') {
            setNotice('Arraste no chão para desenhar. V ou Esc volta para Mover.');
        }
    }

    function add(kind:FreeKind, productId?:string) {
        if(busy || loading)return;let item=newFreeObject(kind,nextId(),productId);
        const [x,y]=api.current?.center() ?? [0,0,0];
        item.position=[x,y,item.position[2]];
        if (kind==='wall') item=placeFreeWall(current.current,item,true);
        if(commit({...current.current,objects:[...current.current.objects,item]})){select(item.id);setTool('move');setNotice(`${item.name} adicionado. Arraste ou ajuste as propriedades.`);}
    }
    function patch(id:number,change:Partial<FreeObject>):boolean {
        const scene=current.current,item=scene.objects.find(o=>o.id===id);if(!item)return false;
        if(item.locked && Object.keys(change).some(key=>key!=='locked' && key!=='visible')){setError('Desbloqueie a peça para editar.');return false;}
        try {return commit(updateFreeObject(scene,id,change));}
        catch(error){setError(error instanceof Error?error.message:'Não foi possível alterar a peça.');return false;}
    }
    function resizeSelected(size: V3): boolean {
        if (!selected || !canEditShape) return false;
        try {
            const resized = resizeFreeObject(selected, size);
            return patch(selected.id, { size: resized.size, position: resized.position, originalSize: resized.originalSize });
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Não foi possível alterar o tamanho.');
            return false;
        }
    }
    function scaleSelected(factor: number) {
        if (!selected) return;
        if (resizeSelected(selected.size.map(value => value * factor) as V3)) {
            setNotice(factor > 1 ? 'Peça aumentada em 10%.' : 'Peça reduzida em 10%.');
        }
    }
    function changeDimension(axis: number, value: number): boolean {
        if (!selected) return false;
        const factor = value / selected.size[axis];
        const size = selected.size.map((current, index) =>
            keepProportions ? current * factor : index === axis ? value : current) as V3;
        return resizeSelected(size);
    }
    function restoreSize() {
        if (selected && resizeSelected(selected.originalSize ?? selected.size)) {
            setNotice('Tamanho original restaurado.');
        }
    }
    function supplierLayout(change: { mount?: SupplierMount; screenOrientation?: ScreenOrientation }) {
        if (!selected || !selectedProduct?.display) return;
        const mount = change.mount ?? selected.mount ?? selectedProduct.display.defaultMount;
        const orientation = change.screenOrientation ?? selected.screenOrientation ?? 'horizontal';
        const size = supplierObjectSize(selectedProduct, mount, orientation);
        patch(selected.id, { mount, screenOrientation: orientation, size, originalSize: [...size] });
    }
    function modelSettings(item:FreeObject,settings:Partial<Pick<FreeObject,'objUnit'|'upAxis'>>):boolean {
        try{const next={...item,...settings};const g=modelGeometry({id:1,name:next.name,source:next.source,unit:next.objUnit,upAxis:next.upAxis,scale:1,x:0,y:0,z:0,rotation:0,material:'white'});const size=g.size.map(n=>Math.max(.01,n)) as V3;return patch(item.id,{...settings,size,originalSize:[...size]});}
        catch(e){setError(e instanceof Error?e.message:'Modelo inválido.');return false;}
    }
    function insertCopy(source: {objects: FreeObject[]; groups: FreeGroup[]; wallLinks: WallLink[]}) {
        if (busy || loading) return;
        const scene = current.current;
        const ids = new Map(source.objects.map((object, index) => [object.id, nextId() + index]));
        const copies = placeWallCopies(scene,source.objects.map(object => ({
            ...structuredClone(object), id: ids.get(object.id)!, name: (object.name + ' · cópia').slice(0,100),
            position: [object.position[0] + .3, object.position[1] + .3, object.position[2]] as V3, locked: false,
        })));
        const nextGroupId = Math.max(0, ...(scene.groups ?? []).map(group => group.id)) + 1;
        const groups = source.groups.map((group, index) => ({id: nextGroupId + index, name: (group.name + ' · cópia').slice(0,100), objectIds: group.objectIds.map(id => ids.get(id)!)}));
        const wallLinks = source.wallLinks.map(([a,b])=>[ids.get(a)!,ids.get(b)!] as WallLink);
        if (commit({ ...scene, objects: [...scene.objects, ...copies], groups: [...(scene.groups ?? []), ...groups],wallLinks:[...(scene.wallLinks ?? []),...wallLinks] })) {
            selectionRef.current = copies.map(object => object.id);
            setSelection(selectionRef.current);
            setPanel('object');
            setTool('move');
            setNotice('Seleção duplicada com posições relativas e grupos preservados.');
        }
    }
    function selectionSnapshot() {
        return structuredClone({objects: data.objects.filter(object => selectedIds.includes(object.id)),
            groups: (data.groups ?? []).filter(group => group.objectIds.every(id => selectedIds.includes(id))),
            wallLinks: (data.wallLinks ?? []).filter(pair=>pair.every(id=>selectedIds.includes(id)))});
    }
    function duplicate() {
        if (selectedIds.length) insertCopy(selectionSnapshot());
    }
    function copySelected() {
        if (!selected || busy || loading) return;
        copiedObject.current = selectionSnapshot();
        setNotice('Seleção copiada. Use Ctrl+V para colar uma cópia.');
    }
    function pasteCopied() {
        if (copiedObject.current) insertCopy(copiedObject.current);
    }
    function remove() {
        if(!canEditSelection)return;
        if(commit(removeFreeObjects(current.current,selectedIds))){select(null);setNotice('Seleção excluída. Use Desfazer para recuperar.');}
    }
    function groupSelection() {
        if (!canEditSelection || selectedGroup) return;
        try {
            const next = groupFreeObjects(current.current, selectedIds);
            if (commit(next)) {
                const ids = next.groups!.at(-1)!.objectIds;
                selectionRef.current = ids;
                setSelection(ids);
                setTool('move');
                setPanel('object');
                setNotice('Grupo criado. Clique em uma peça do grupo para mover o conjunto.');
            }
        } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível agrupar.'); }
    }
    function ungroupSelection() {
        if (busy || loading) return;
        if (commit(ungroupFreeObjects(current.current, selectedIds))) setNotice('Grupo desfeito. As peças mantêm suas posições.');
    }
    function wallMagnet(a: number,b: number) {
        if (busy || loading || restoringDraft) return;
        try {
            const scene=current.current;
            const linked=scene.wallLinks?.some(pair=>pair.includes(a) && pair.includes(b));
            const next=toggleWallLink(scene,a,b);
            if (!commit(next)) return;
            const primary = selectedId!==null && [a,b].includes(selectedId) ? selectedId : a;
            const connected=linked?freeSelection(next,primary,[]):connectedWallIds(next,selectionRef.current);
            const ids=[...connected.filter(id=>id!==primary),primary];
            selectionRef.current=ids;setSelection(ids);setTool('move');setPanel('object');
            setNotice(linked?'Ímã solto. Você pode afastar as paredes.':'Ímã ligado. As paredes se movem juntas.');
        } catch(error){setError(error instanceof Error?error.message:'Não foi possível alterar o ímã.');}
    }
    function travel(direction:'undo'|'redo') {
        if(busy || loading || restoringDraft)return;
        const list=direction==='undo'?history.past:history.future;if(!list.length)return;
        epoch.current++;fileRequest.current++;
        const present=direction==='undo'?list[list.length-1]:list[0];current.current=present;
        setHistory(direction==='undo'
            ? {past:history.past.slice(0,-1),present,future:[history.present,...history.future].slice(0,40)}
            : {past:[...history.past,history.present].slice(-40),present,future:history.future.slice(1)});
        saveDraft({...present,view});setError('');setNotice(direction==='undo'?'Edição desfeita.':'Edição refeita.');
    }
    function changeView(nextView: '3d' | 'plan') {
        if (restoringDraft) return;
        setView(nextView);
        saveDraft({...current.current,view:nextView});
    }
    function startScene(scene: FreeScene) {
        if (busy || loading || !commit(scene)) return;
        setShowStart(false);
        setShowObjImport(false);
        select(null);
        changeView('3d');
        setPanel('insert');
        setTool('move');
        requestAnimationFrame(()=>api.current?.fit());
        setNotice(scene.objects.length
            ? 'Stand-base criado. Você pode mover, redimensionar e excluir as peças.'
            : 'Nova cena vazia. Adicione uma peça ou desenhe na área de criação.');
    }
    function save() {try{downloadFile(stringifyFreeScene({...current.current,view}),sceneFilename(data,'json'),'application/json');setNotice('Cena livre salva em JSON, com peças, textos, artes e objetos 3D.');setError('');}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}}
    async function open(event:ChangeEvent<HTMLInputElement>) {
        const file=event.target.files?.[0];event.target.value='';if(!file)return;
        const request=++fileRequest.current,start=epoch.current;setLoading(true);setError('');
        try {
            if(!/\.json$/i.test(file.name) || file.size>MAX_FREE_SCENE_BYTES)throw new Error('Abra uma cena JSON de até 10 MB.');
            const loaded=parseFreeScene(await file.text());if(request!==fileRequest.current || start!==epoch.current)throw new Error('A cena foi alterada durante a leitura. Abra o arquivo novamente.');
            if(commit(loaded)){setShowStart(false);select(null);changeView(loaded.view);setTool('move');setPanel('layers');requestAnimationFrame(()=>api.current?.fit());setNotice('Cena livre aberta. Todas as peças foram restauradas.');}
        }catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir.');}finally{if(request===fileRequest.current)setLoading(false);}
    }
    async function uploadObj(event:ChangeEvent<HTMLInputElement>) {
        const file=event.target.files?.[0];event.target.value='';if(!file)return;
        const start=epoch.current;setLoading(true);setError('');
        try {
            if(!/\.obj$/i.test(file.name) || file.size>MAX_MODEL_BYTES)throw new Error('Escolha um OBJ de até 2 MB.');
            const source=await file.text();if(start!==epoch.current)throw new Error('A cena mudou. Importe o OBJ novamente.');
            const item=newFreeObject('obj',nextId());item.name=file.name.slice(0,100);item.source=source;item.objUnit=objUnit;item.upAxis=objAxis;const [x,y]=api.current?.center() ?? [0,0,0];item.position=[x,y,0];
            const geometry=modelGeometry({id:1,name:item.name,source,unit:objUnit,upAxis:objAxis,scale:1,x:0,y:0,z:0,rotation:0,material:'white'});item.size=geometry.size.map(n=>Math.max(.01,n)) as V3;
            if(commit({...current.current,objects:[...current.current.objects,item]})){setShowObjImport(false);select(item.id);setTool('move');requestAnimationFrame(()=>api.current?.fit());setNotice('OBJ importado. Ajuste as medidas e a orientação nas propriedades.');}
        }catch(e){setError(e instanceof Error?e.message:'Não foi possível importar.');}finally{setLoading(false);}
    }
    async function uploadArt(event:ChangeEvent<HTMLInputElement>) {
        const file=event.target.files?.[0];event.target.value='';if(!file || !selected)return;
        const start=epoch.current,id=selected.id;setLoading(true);setError('');
        try{const image=await readArtworkFile(file);if(start!==epoch.current)throw new Error('A cena mudou. Escolha a arte novamente.');if(patch(id,{image}))setNotice('Arte aplicada à frente da peça e incorporada ao JSON.');}
        catch(e){setError(e instanceof Error?e.message:'Não foi possível aplicar a arte.');}finally{setLoading(false);}
    }
    const exportDestination = target === 'blender' ? 'Blender' : '3ds Max';
    const exportExtension = target === 'blender' ? 'py' : 'ms';
    const hasArtwork = data.objects.some(item => item.image);
    const downloadLabel = hasArtwork ? 'Baixar ZIP com materiais' : `Baixar .${exportExtension} para ${exportDestination}`;

    function createExportScript(scene: FreeScene) {
        return target === 'blender' ? exportFreeBlender(scene) : exportFreeMax(scene);
    }

    async function copyExportScript() {
        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error('A cópia não está disponível neste navegador. Use o botão Baixar.');
            }
            const scene = current.current;
            const script = target === 'blender' ? exportFreeBlenderCommand(scene) : exportFreeMax(scene);
            try {
                await navigator.clipboard.writeText(script);
            } catch {
                throw new Error('O navegador não permitiu copiar. Use o botão Baixar.');
            }
            setError('');
            setNotice(target === 'blender'
                ? 'Cena completa copiada. No Console Python do Blender, cole o comando e pressione Enter.'
                : 'Script para 3ds Max copiado.');
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Não foi possível copiar o script.');
        }
    }

    function exportScene() {
        try {
            const scene = current.current;
            if (scene.objects.some(item => item.image)) {
                const archive = exportFreePackage(scene, target);
                downloadFile(new Uint8Array(archive), sceneFilename(scene, 'zip'), 'application/zip');
                setNotice('ZIP exportado com o script e a pasta materiais. Extraia tudo antes de abrir o script.');
            } else {
                const script = createExportScript(scene);
                downloadFile(script, sceneFilename(scene, exportExtension), 'text/plain');
                setNotice('Script exportado com peças independentes e texto editável.');
            }
            setError('');
        }
        catch(e){setError(e instanceof Error?e.message:'Não foi possível exportar.');}
    }
    const [helpMode, setHelpMode] = useState<FreeHelpMode>(null);
    const [tourStep, setTourStep] = useState(0);
    const helpButton = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (showStart || restoringDraft) return;
        try { if (localStorage.getItem(freeTourStorageKey)) return; } catch {}
        const frame = requestAnimationFrame(() => setHelpMode(mode => mode ?? 'welcome'));
        return () => cancelAnimationFrame(frame);
    }, [showStart,restoringDraft]);

    function rememberTour() {
        try { localStorage.setItem(freeTourStorageKey, '1'); } catch {}
    }

    function openTourStep(index: number) {
        rememberTour();
        setTourStep(index);
        setHelpMode('tour');
        const step = tourSteps[index].id;
        if (step === 'insert') setPanel('insert');
        if (step === 'environment') setPanel('scene');
    }

    function closeHelp() {
        rememberTour();
        setHelpMode(null);
        helpButton.current?.focus();
    }

    function keys(event:KeyboardEvent<HTMLDivElement>) {
        if(restoringDraft || showStart || (event.target as HTMLElement).closest('[data-free-help],input,textarea,select,[contenteditable="true"]'))return;
        const key=event.key.toLowerCase(),modifier=event.ctrlKey || event.metaKey;
        if (!loading && tool === 'rectangle' && !modifier && (key === 'v' || key === 'escape')) {
            event.preventDefault();
            api.current?.cancel();
            setTool('move');
            setNotice('Ferramenta Mover ativa.');
            return;
        }
        if (key === 'escape') {
            api.current?.cancel();
            if (!busy) select(null);
            return;
        }
        if(busy || loading)return;
        if(modifier && key==='z'){event.preventDefault();travel(event.shiftKey?'redo':'undo');}
        else if(modifier && key==='y'){event.preventDefault();travel('redo');}
        else if(modifier && key==='d'){event.preventDefault();duplicate();}
        else if(modifier && key==='g'){event.preventDefault();if(event.shiftKey)ungroupSelection();else groupSelection();}
        else if(modifier && key==='c' && selected){event.preventDefault();copySelected();}
        else if(modifier && key==='v' && copiedObject.current){event.preventDefault();pasteCopied();}
        else if(modifier && key==='s'){event.preventDefault();save();}
        else if(key==='delete' || key==='backspace'){event.preventDefault();remove();}
        else if(!modifier){const modes:Record<string,FreeTool>={m:'select',v:'move',r:'rectangle',g:'rotate',s:'scale',h:'hand',b:'wall'};if(modes[key])activateTool(modes[key]);else if(key==='t')add('text');else if(key==='0')api.current?.fit();}
    }
    const isBusy=busy || loading || restoringDraft;
    const draftMessage = {
        restoring: 'Recuperando seu trabalho…', ready: 'Salvamento automático neste navegador',
        saving: 'Salvando…', saved: 'Salvo neste navegador',
        error: 'Falha no salvamento automático. Use Salvar cena para baixar um JSON.',
        'restore-error': 'Não foi possível recuperar o rascunho. Recarregue para tentar novamente.',
    }[draftStatus];
    const draftHasError = draftStatus === 'error' || draftStatus === 'restore-error';
    function layerRow(object: FreeObject, individual = false) {
        return <div key={object.id} className={selectedIds.includes(object.id)?'selected':''}>
            <button aria-label={`Selecionar ${object.name} ${object.id}`} aria-pressed={selectedIds.includes(object.id)} disabled={isBusy}
                onClick={event=>{select(object.id,event.shiftKey,individual);setPanel('layers');}}><Layers size={15}/><span>{object.name}</span></button>
            <button aria-label={`${object.visible?'Ocultar':'Mostrar'} peça ${object.id}`} disabled={isBusy} onClick={()=>patch(object.id,{visible:!object.visible})}>{object.visible?<Eye size={14}/>:<EyeOff size={14}/>}</button>
            <button aria-label={`${object.locked?'Desbloquear':'Bloquear'} peça ${object.id}`} disabled={isBusy} onClick={()=>patch(object.id,{locked:!object.locked})}>{object.locked?<Lock size={14}/>:<Unlock size={14}/>}</button>
        </div>;
    }
    return <div className="free-editor" onKeyDown={keys} data-free-tour={helpMode === 'tour' ? tourSteps[tourStep].id : undefined}>
      <header className="free-topbar"><div className="free-brand"><Box size={23}/><strong>CenoLab<small>CENA LIVRE 3D</small></strong></div>
        <div className="free-file-actions"><button onClick={()=>{setError('');setShowStart(true);}} disabled={isBusy} title="Opções de nova cena"><Plus size={15}/><span>Novo</span></button><button data-tour-anchor="save" onClick={save} disabled={isBusy}><Save size={15}/><span>Salvar cena</span></button><button onClick={()=>fileInput.current?.click()} disabled={isBusy}><FolderOpen size={15}/><span>Abrir cena</span></button><button onClick={onGuided} disabled={isBusy} className="free-guided">Projetos guiados</button></div>
        <div className="free-export-actions">
            <button ref={helpButton} type="button" title="Ajuda e atalhos" aria-label="Ajuda e atalhos"
                aria-expanded={helpMode !== null} aria-haspopup="dialog"
                onClick={()=>{ if (helpMode) closeHelp(); else setHelpMode('menu'); }}>?</button>
            <select aria-label="Destino da exportação livre" value={target} onChange={event=>setTarget(event.target.value as 'blender'|'max')}>
                <option value="blender">Blender</option><option value="max">3ds Max</option>
            </select>
            <button type="button" className="free-copy-export" onClick={copyExportScript} disabled={isBusy}>Copiar script</button>
            <button type="button" data-tour-anchor="save" className="free-primary" onClick={exportScene} disabled={isBusy}
                title={hasArtwork ? `Inclui o arquivo .${exportExtension} para ${exportDestination} e a pasta materiais` : undefined}>
                <Download size={15}/>{downloadLabel}
            </button>
        </div>
      </header>
      {showStart && <dialog ref={startDialog} className="free-start-dialog" aria-labelledby="free-start-title"
          onCancel={event=>{event.preventDefault();if(!isBusy)setShowStart(false);}}>
          <h2 id="free-start-title">Começar com um stand-base</h2>
          <p>Escolha uma medida. A cena vem com piso, parede de fundo e balcão. Todas as peças são editáveis.</p>
          {draftStatus === 'restore-error' && <p role="alert">{draftMessage}</p>}
          <div className="free-start-options">
              <button type="button" disabled={isBusy} onClick={()=>startScene(createStandBase(3))}>
                  <strong>Stand 3 × 3 m</strong><span>9 m²</span>
              </button>
              <button type="button" disabled={isBusy} onClick={()=>startScene(createStandBase(6))}>
                  <strong>Stand 3 × 6 m</strong><span>18 m²</span>
              </button>
          </div>
          <div className="free-start-actions">
              <button type="button" disabled={isBusy} onClick={()=>startScene(emptyFreeScene())}>Criar do zero</button>
              <button type="button" disabled={isBusy} onClick={()=>fileInput.current?.click()}>Abrir cena JSON</button>
              {data.objects.length > 0 && <button type="button" disabled={isBusy} onClick={()=>setShowStart(false)}>Voltar à cena</button>}
          </div>
          {loading && <p role="status">Lendo arquivo…</p>}
          {error && <p role="alert">{error}</p>}
      </dialog>}
      {!showStart && helpMode && <FreeSceneHelp mode={helpMode} step={tourStep} onStep={openTourStep}
          onClose={closeHelp} onShortcuts={()=>setHelpMode('shortcuts')}/>}
      <div className="free-documentbar"><span><i/>{data.name}</span><span>{selectedIds.length>1 ? `${selectedGroup?.name ?? 'Seleção'} · ${selectedIds.length} peças` : selected?.name ?? `${data.objects.length} peças · metros`}</span><div className="free-view-switch" role="group" aria-label="Vista da cena"><button aria-pressed={view==='3d'} onClick={()=>changeView('3d')} disabled={isBusy}>3D</button><button data-tour-anchor="draw" aria-pressed={view==='plan'} onClick={()=>changeView('plan')} disabled={isBusy}>Planta</button></div></div>
      <main className="free-workspace">
        <nav className="free-tools" aria-label="Ferramentas da cena livre">
          {toolItems.map(({id,label,Icon})=><button key={id} data-tour-anchor={id==='move' ? 'move' : id==='rotate' || id==='scale' ? 'adjust' : id==='rectangle' || id==='wall' ? 'draw' : undefined} title={label} aria-label={label} aria-pressed={tool===id} disabled={isBusy || ((selectedIds.length>1 || selectedWallLinked) && (id==='rotate' || id==='scale'))} onClick={()=>activateTool(id)}><Icon size={19}/></button>)}
          <button title="Adicionar texto (T)" aria-label="Adicionar texto" disabled={isBusy} onClick={()=>add('text')}><Type size={20}/></button><span/>
          <button title="Agrupar (Ctrl+G)" aria-label="Agrupar seleção" disabled={!canEditSelection || selectedIds.length<2 || !!selectedGroup} onClick={groupSelection}><Layers size={19}/></button>
          <button title="Duplicar (Ctrl+D ou Ctrl+C e Ctrl+V)" aria-label="Duplicar peça" disabled={!selected || isBusy} onClick={duplicate}><CopyPlus size={19}/></button><button title="Excluir (Delete)" aria-label="Excluir peça" disabled={!canEditSelection} onClick={remove}><Trash2 size={18}/></button><span/>
          <button title="Desfazer (Ctrl+Z)" aria-label="Desfazer cena" disabled={!history.past.length || isBusy} onClick={()=>travel('undo')}><Undo2 size={19}/></button><button title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer cena" disabled={!history.future.length || isBusy} onClick={()=>travel('redo')}><Redo2 size={19}/></button><span/>
          <button aria-label="Aproximar cena" title="Aproximar" disabled={isBusy} onClick={()=>api.current?.zoom(1.25)}><ZoomIn size={19}/></button><button aria-label="Afastar cena" title="Afastar" disabled={isBusy} onClick={()=>api.current?.zoom(.8)}><ZoomOut size={19}/></button><button aria-label="Enquadrar cena" title="Enquadrar todas as peças (0)" disabled={isBusy} onClick={()=>api.current?.fit()}><Maximize size={18}/></button>
        </nav>
        <section className="free-stage" aria-label="Editor da cena livre">
          <FreeSceneViewport data={data} selectedId={selectedId} selectedIds={selectedIds} tool={tool} view={view} snap={snap} apiRef={api} onSelectAction={select} onTransformAction={transform} onWallAction={addWall} onRectangleAction={addRectangle} onWallLinkAction={wallMagnet} onBusyAction={setBusy}/>
          <div className="free-canvas-controls"><label><input type="checkbox" checked={data.grid} disabled={isBusy} onChange={event=>commit({...data,grid:event.target.checked})}/><Grid2X2 size={13}/>Grade</label><label><input type="checkbox" checked={snap} disabled={isBusy} onChange={event=>setSnap(event.target.checked)}/>Encaixar 10 cm / 15°</label><span data-tour-anchor="magnets" title="Aproxime paredes para encaixar. Clique no ímã do encontro para ligar ou soltar."><Magnet size={13}/>Paredes · ímã 10 cm</span></div>
          <div className="free-stage-help">{tool==='rectangle'?'Arraste no chão de um canto ao outro. V ou Esc volta para Mover.':tool==='wall'?'Arraste no chão para desenhar a parede. Esc cancela.':view==='plan'?'Planta: mova no plano ou use os eixos. Role para aproximar.':'3D: arraste o fundo para orbitar · botão direito para navegar · role para aproximar'}</div>
        </section>
        <aside className="free-inspector" aria-label="Criação e propriedades da cena livre">
          <nav className="free-panel-tabs" aria-label="Painel da cena livre">{([{id:'insert',label:'Adicionar'},{id:'object',label:'Propriedades'},{id:'layers',label:'Lista de peças'},{id:'scene',label:'Ambiente e grade'}] as const).map(item=><button key={item.id} aria-pressed={panel===item.id} onClick={()=>setPanel(item.id)}>{item.label}</button>)}</nav>
          {panel==='insert' && <div className="free-panel"><h2>Construa sua cena</h2><p>Nenhuma peça vem pronta. Insira uma de cada vez e edite como quiser.</p><div className="free-catalog">{freeCatalog.map(item=><button key={item.kind} data-tour-anchor={item.kind==='box' ? 'insert' : undefined} onClick={()=>add(item.kind)} disabled={isBusy}><span>{item.kind==='text'?<Type size={18}/>:item.kind==='wall'?<BrickWall size={18}/>:<Box size={18}/>}</span>{item.label}<Plus size={13}/></button>)}</div><button className="free-secondary" onClick={()=>{setTool('wall');setNotice('Arraste no chão para desenhar uma parede.');}} disabled={isBusy}><BrickWall size={16}/>Desenhar parede com o mouse</button>
              <h3>Peças de fornecedores</h3>
              {Array.from(new Set(supplierProducts.map(product=>product.supplier))).map(supplier=>
                  <section key={supplier} aria-label={'Peças de ' + supplier}>
                      <h3>{supplier}</h3>
                      <div className="free-catalog free-supplier-catalog">
                          {supplierProducts.filter(product=>product.supplier===supplier).map(product=>
                              <button key={product.id} onClick={()=>add('supplierTotem',product.id)} disabled={isBusy}
                                title={(product.display ? 'Tela ' : 'Totem ') + product.supplier + ' ' + product.model}>
                                  <Box size={18}/><span>{product.display ? 'Tela' : 'Totem'} {product.model}</span>
                              </button>)}
                      </div>
                  </section>)}
              <button type="button" className="free-secondary" aria-expanded={showObjImport}
                aria-controls="free-obj-import" onClick={()=>setShowObjImport(open=>!open)} disabled={isBusy}>
                  <Upload size={16}/>Importar objeto OBJ
              </button>
              <section id="free-obj-import" aria-label="Configuração da importação OBJ" hidden={!showObjImport}>
                  <div className="free-obj-options">
                      <label>Unidade do modelo
                          <select value={objUnit} disabled={isBusy} onChange={event=>setObjUnit(event.target.value as FreeObject['objUnit'])}>
                              <option value="m">Metros</option><option value="cm">Centímetros</option><option value="mm">Milímetros</option>
                          </select>
                      </label>
                      <label>Eixo vertical
                          <select value={objAxis} disabled={isBusy} onChange={event=>setObjAxis(event.target.value as FreeObject['upAxis'])}>
                              <option value="z">Z</option><option value="y">Y</option>
                          </select>
                      </label>
                  </div>
                  <p className="free-small">Se o tamanho ou a orientação ficarem incorretos, você pode ajustá-los em Propriedades após importar.</p>
                  <p className="free-small">OBJ de até 2 MB, sem MTL. Até cinco modelos personalizados por cena.</p>
                  <button type="button" className="free-secondary" onClick={()=>objInput.current?.click()} disabled={isBusy}>
                      <FolderOpen size={16}/>Escolher arquivo OBJ
                  </button>
              </section>
          </div>}
          {panel==='object' && <div className="free-panel">
            {selectedIds.length>1 ? <>
                <h2>{selectedGroup?.name ?? `${selectedIds.length} peças selecionadas`}</h2>
                {selectedGroup && <label className="free-field">Nome do grupo<input aria-label="Nome do grupo" value={selectedGroup.name} maxLength={100} disabled={isBusy}
                    onChange={event=>{const name=event.target.value;if(name.trim())commit({...data,groups:data.groups!.map(group=>group.id===selectedGroup.id?{...group,name}:group)});}}/></label>}
                <p>Use as setas ou arraste uma peça com V para mover o conjunto. Shift + clique adiciona ou remove peças da seleção.</p>
                <div className="free-object-actions">
                    <button disabled={!canEditSelection || !!selectedGroup} onClick={groupSelection}>Agrupar · Ctrl+G</button>
                    <button disabled={isBusy || !data.groups?.some(group=>group.objectIds.some(id=>selectedIds.includes(id)))} onClick={ungroupSelection}>Desagrupar</button>
                </div>
                <h3>Posição do conjunto · m</h3>
                <div className="free-vector">{(['X','Y','Z'] as const).map((axis,i)=><NumberField key={axis} label={`Posição do conjunto ${axis}`} value={selected!.position[i]} disabled={!canEditSelection}
                    change={value=>{const delta:V3=[0,0,0];delta[i]=value-selected!.position[i];return commit(moveFreeObjects(current.current,selectedIds,delta));}}/>)}</div>
                <p className="free-small">{selectedWallLinked?'Solte o ímã para alterar medidas ou rotação das paredes.':'Para editar medidas ou girar uma peça, selecione-a dentro do grupo na Lista de peças.'}</p>
                {!canEditSelection && <p>Desbloqueie todas as peças do conjunto para movê-lo.</p>}
                <div className="free-object-actions"><button disabled={isBusy} onClick={duplicate}>Duplicar conjunto</button><button disabled={!canEditSelection} onClick={remove}>Excluir conjunto</button></div>
            </> : selected ? <><h2>{selected.name}</h2><label className="free-field">Nome<input aria-label="Nome da peça" value={selected.name} maxLength={100} disabled={!canEdit} onChange={event=>patch(selected.id,{name:event.target.value})}/></label>
              {selectedProduct && <div className="free-field">
                  <p>Fornecedor <strong>{selectedProduct.supplier}</strong></p>
                  <p>Modelo <strong>{selectedProduct.model}</strong></p>
                  {selectedProduct.display ? <>
                      <p className="free-small">Gabinete sem suporte (L × A × P) {([0,2,1] as const).map(axis=>
                          (selectedProduct.display!.size[axis]*100).toLocaleString('pt-BR',{maximumFractionDigits:1})).join(' × ')} cm</p>
                      <label className="free-field">Instalação
                          <select aria-label="Instalação da tela" className="mt-2 block w-full rounded border border-slate-600 bg-slate-900 p-2 text-slate-100" disabled={!canEdit}
                            value={selected.mount ?? selectedProduct.display.defaultMount}
                            onChange={event=>supplierLayout({mount:event.target.value as SupplierMount})}>
                              <option value="pedestal">Com pedestal</option>
                              <option value="wall">Na parede</option>
                          </select>
                      </label>
                      <label className="free-field">Orientação da tela
                          <select aria-label="Orientação da tela" className="mt-2 block w-full rounded border border-slate-600 bg-slate-900 p-2 text-slate-100" disabled={!canEdit}
                            value={selected.screenOrientation ?? 'horizontal'}
                            onChange={event=>supplierLayout({screenOrientation:event.target.value as ScreenOrientation})}>
                              <option value="horizontal">Horizontal (deitada)</option>
                              <option value="vertical">Vertical (em pé)</option>
                          </select>
                      </label>
                      <p className="free-small">{(selected.mount ?? selectedProduct.display.defaultMount)==='wall'
                          ? 'Ajuste Posição Z para escolher a altura na parede. A parede é uma peça separada.'
                          : 'Tela inclinada no pedestal para interação.'}</p>
                      <p className="free-small">Gabinete conforme o fornecedor. Pedestal, suporte e área útil da tela aproximados. Ao trocar as opções, as medidas voltam ao padrão do modelo.</p>
                  </> : <p className="free-small">Totem integrado vertical. Tela e rodízios aproximados. A arte é aplicada na tela.</p>}
              </div>}
              <div className="free-state-row"><button aria-pressed={selected.visible} disabled={isBusy} onClick={()=>patch(selected.id,{visible:!selected.visible})}>{selected.visible?<Eye size={15}/>:<EyeOff size={15}/>} {selected.visible?'Visível':'Oculta'}</button><button aria-pressed={selected.locked} disabled={isBusy} onClick={()=>patch(selected.id,{locked:!selected.locked})}>{selected.locked?<Lock size={15}/>:<Unlock size={15}/>} {selected.locked?'Bloqueada':'Livre'}</button></div>
              {selectedWallLinked && <p className="free-small">Ímã ligado. Solte o ímã para alterar medidas ou rotação desta parede.</p>}
              <h3>{selectedProduct?.display ? "Medidas com suporte · m" : "Medidas · m"}</h3>
              <div className="free-size-actions">
                  <button type="button" disabled={!canEditShape || selected.size.some(value=>value*.9<.01)}
                    onClick={()=>scaleSelected(.9)} aria-label="Diminuir peça em 10%">− Menor</button>
                  <button type="button" disabled={!canEditShape || selected.size.some(value=>value*1.1>1000)}
                    onClick={()=>scaleSelected(1.1)} aria-label="Aumentar peça em 10%">+ Maior</button>
              </div>
              <p className="free-small">Cada clique muda o tamanho em 10%.</p>
              <label className="free-size-lock">
                  <input type="checkbox" checked={keepProportions} disabled={!canEditShape}
                    onChange={event=>setKeepProportions(event.target.checked)}/>
                  Manter proporções ao editar medidas
              </label>
              <div className="free-vector">{(['Largura','Profundidade','Altura'] as const).map((label,i)=><NumberField key={label} label={label} value={selected.size[i]} min={.01} max={1000} disabled={!canEditShape} change={n=>changeDimension(i,n)}/>)}</div>
              <button type="button" className="free-secondary" disabled={!canEditShape} onClick={restoreSize}
                title="Volta ao tamanho de inserção ou de abertura da peça nesta cena">Restaurar tamanho original</button>
              <h3>Posição · m</h3><div className="free-vector">{(['X','Y','Z'] as const).map((axis,i)=><NumberField key={axis} label={`Posição ${axis}`} value={selected.position[i]} disabled={!canEdit} change={n=>{const position=[...selected.position] as V3;position[i]=n;return patch(selected.id,{position});}}/>)}</div>
              <h3>Rotação · graus</h3><div className="free-vector">{(['X','Y','Z'] as const).map((axis,i)=><NumberField key={axis} label={`Rotação ${axis}`} value={selected.rotation[i]} step={1} disabled={!canEditShape} change={n=>{const rotation=[...selected.rotation] as V3;rotation[i]=n;return patch(selected.id,{rotation});}}/>)}</div>
              {selected.kind==='text' && <label className="free-field">Texto<textarea aria-label="Conteúdo do texto" maxLength={1000} rows={4} value={selected.text} disabled={!canEdit} onChange={event=>patch(selected.id,{text:event.target.value})}/></label>}
              {['shelf','showcase'].includes(selected.kind) && <NumberField label="Prateleiras internas" value={selected.shelves} min={0} max={10} step={1} disabled={!canEdit} change={n=>patch(selected.id,{shelves:n})}/>}
              {selected.kind==='obj' && <div className="free-obj-options"><label>Unidade<select aria-label="Unidade do objeto importado" disabled={!canEdit} value={selected.objUnit} onChange={event=>modelSettings(selected,{objUnit:event.target.value as 'm'|'cm'|'mm'})}><option value="m">Metros</option><option value="cm">Centímetros</option><option value="mm">Milímetros</option></select></label><label>Eixo vertical<select aria-label="Eixo vertical do objeto importado" disabled={!canEdit} value={selected.upAxis} onChange={event=>modelSettings(selected,{upAxis:event.target.value as 'z'|'y'})}><option value="z">Z</option><option value="y">Y</option></select></label></div>}
              <h3>Acabamento</h3><label className="free-color">Cor<input aria-label="Cor da peça" type="color" value={selected.color} disabled={!canEdit} onChange={event=>patch(selected.id,{color:event.target.value})}/><span>{selected.color.toUpperCase()}</span></label>
              <div className="free-vector two"><NumberField label="Rugosidade" value={selected.roughness} min={0} max={1} step={.05} disabled={!canEdit} change={n=>patch(selected.id,{roughness:n})}/><NumberField label="Opacidade" value={selected.opacity} min={.05} max={1} step={.05} disabled={!canEdit} change={n=>patch(selected.id,{opacity:n})}/></div>
              {!['text','obj'].includes(selected.kind) && <><button className="free-secondary" onClick={()=>imageInput.current?.click()} disabled={!canEdit}><Upload size={15}/>{selected.image?'Trocar arte frontal':'Aplicar arte / logo'}</button>{selected.image && <div className="free-art-preview"><ImagePreview src={selected.image} alt="Arte frontal da peça" width={320} height={180} unoptimized/><button onClick={()=>patch(selected.id,{image:''})} disabled={!canEdit}>Remover arte</button></div>}</>}
              <div className="free-object-actions"><button onClick={duplicate} disabled={isBusy}><CopyPlus size={15}/>Duplicar</button><button onClick={remove} disabled={!canEdit}><Trash2 size={15}/>Excluir</button></div>
            </>:<><h2>Selecione uma peça</h2><p>Clique na cena ou abra a Lista de peças. Cada peça tem propriedades independentes.</p><button className="free-secondary" onClick={()=>setPanel('insert')}>Adicionar peça</button></>}
            {(data.wallLinks ?? []).filter(pair=>pair.some(id=>selectedIds.includes(id))).map(([a,b])=><button key={`${a}:${b}`} className="free-secondary" disabled={isBusy} aria-pressed="true" onClick={()=>wallMagnet(a,b)}><Magnet size={15}/>Soltar ímã · {data.objects.find(object=>object.id===a)?.name} {a} + {data.objects.find(object=>object.id===b)?.name} {b}</button>)}
          </div>}
          {panel==='layers' && <div className="free-panel"><h2>Objetos · {data.objects.length}</h2>
            <p className="free-small">Shift + clique seleciona várias peças. Expanda um grupo para editar suas peças individualmente.</p>
            <div className="free-object-actions"><button disabled={!canEditSelection || selectedIds.length<2 || !!selectedGroup} onClick={groupSelection}>Agrupar</button><button disabled={isBusy || !data.groups?.some(group=>group.objectIds.some(id=>selectedIds.includes(id)))} onClick={ungroupSelection}>Desagrupar</button></div>
            {(data.groups ?? []).map(group=><details key={group.id} className="free-piece-group">
                <summary>{group.name} · {group.objectIds.length} peças</summary>
                <button className="free-secondary" disabled={isBusy} onClick={event=>{select(group.objectIds.find(id=>data.objects.find(object=>object.id===id)?.visible) ?? group.objectIds[0],event.shiftKey);setPanel('layers');}}>Selecionar {group.name}</button>
                <div className="free-object-list">{data.objects.filter(object=>group.objectIds.includes(object.id)).map(object=>layerRow(object,true))}</div>
            </details>)}
            {!data.objects.length && <p>A cena está vazia. Comece inserindo uma peça.</p>}
            <div className="free-object-list">{[...data.objects].reverse().filter(object=>!data.groups?.some(group=>group.objectIds.includes(object.id))).map(object=>layerRow(object))}</div>
          </div>}
          {panel==='scene' && <div className="free-panel"><h2>Ambiente e grade</h2>
              <label className="free-field">
                  Cenário
                  <select className="mt-2 block w-full rounded border border-slate-600 bg-slate-900 p-2 text-slate-100" data-tour-anchor="environment" aria-label="Cenário" value={data.environment ?? 'white'} disabled={isBusy}
                    onChange={event=>commit({...data,environment:event.target.value as FreeEnvironment})}>
                      {Object.entries(freeEnvironments).map(([id,label])=><option key={id} value={id}>{label}</option>)}
                  </select>
              </label>
              <label className="free-field">Nome da cena<input aria-label="Nome da cena" maxLength={100} value={data.name} disabled={isBusy} onChange={event=>commit({...data,name:event.target.value})}/></label><NumberField label="Tamanho da grade (m)" value={data.gridSize} min={2} max={200} step={1} disabled={isBusy} change={n=>commit({...data,gridSize:n})}/><p>A grade é uma referência. Você pode criar e mover peças além dela e permitir sobreposições.</p><p>Cada execução do script cria uma nova coleção ou camada, preservando as cenas anteriores.</p><button className="free-secondary" onClick={onGuided} disabled={isBusy}>Abrir projetos guiados anteriores</button></div>}
        </aside>
      </main>
      <footer className="free-status"><span role={error?'alert':'status'} aria-live="polite" className={error?'has-error':''}>{error || (loading?'Lendo arquivo…':notice)}</span><span role={draftHasError?'alert':'status'} aria-label="Salvamento automático" aria-live="polite" data-autosave-state={draftHasError?'error':draftStatus} className={draftHasError?'has-error':''}>{draftMessage}</span><span>{data.objects.length}/200 peças · X / Y / Z</span></footer>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={open}/><input ref={objInput} type="file" accept=".obj" hidden onChange={uploadObj}/><input ref={imageInput} type="file" accept="image/png,image/jpeg" hidden onChange={uploadArt}/>
    </div>;
}
