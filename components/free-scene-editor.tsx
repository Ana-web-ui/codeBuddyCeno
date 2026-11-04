"use client";
import ImagePreview from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Box, MousePointer2, Move3D, Rotate3D, Scaling, Hand, BrickWall, Type, CopyPlus, Trash2, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Plus, Eye, EyeOff, Lock, Unlock, Upload, Grid2X2, Layers, Download, Save, FolderOpen } from 'lucide-react';
import { FreeSceneHelp, freeTourStorageKey, tourSteps } from './free-scene-help';
import type { FreeHelpMode } from './free-scene-help';
import { FreeSceneViewport } from './free-scene-viewport';
import type { FreeTool, FreeViewportApi, FreePose } from './free-scene-viewport';
import { createStandBase, emptyFreeScene, freeCatalog, freeEnvironments, newFreeObject, stringifyFreeScene, parseFreeScene, sceneFilename, wallBetween, rectangleBetween, MAX_FREE_SCENE_BYTES } from '@/lib/free-scene';
import type { FreeEnvironment, FreeScene, FreeKind, FreeObject, V3 } from '@/lib/free-scene';
import { exportFreeBlender, exportFreeMax } from '@/lib/free-scene-exporters';
import { exportFreePackage } from '@/lib/free-scene-package';
import { readArtworkFile } from '@/lib/branding-upload';
import { modelGeometry, MAX_MODEL_BYTES } from '@/lib/imported-models';

function downloadFile(content:BlobPart,name:string,type:string) {
    const url=URL.createObjectURL(new Blob([content],{type})),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function NumberField({label,value,min=-10000,max=10000,step=.1,disabled=false,change}:{label:string;value:number;min?:number;max?:number;step?:number;disabled?:boolean;change:(n:number)=>boolean}) {
    return <label>{label}<input key={String(value)} aria-label={label} type="number" min={min} max={max} step={step} disabled={disabled} defaultValue={Number(value.toFixed(4))}
        onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}
        onBlur={event=>{const raw=event.currentTarget.value,n=Number(raw);if(raw===String(Number(value.toFixed(4))))return;if(!raw.trim() || !Number.isFinite(n) || n<min || n>max || !change(n))event.currentTarget.value=String(Number(value.toFixed(4)));}}/></label>;
}
const toolItems=[{id:'select',label:'Selecionar (M)',Icon:MousePointer2},{id:'move',label:'Mover (V)',Icon:Move3D},{id:'rotate',label:'Girar (G)',Icon:Rotate3D},{id:'scale',label:'Redimensionar (S)',Icon:Scaling},{id:'hand',label:'Navegar (H)',Icon:Hand},{id:'wall',label:'Desenhar parede (B)',Icon:BrickWall},{id:'rectangle',label:'Desenhar retângulo (R)',Icon:Box}] as const;
export default function FreeSceneEditor({onGuided}:{onGuided:()=>void}) {
    const [history,setHistory]=useState(()=>({past:[] as FreeScene[],present:emptyFreeScene(),future:[] as FreeScene[]}));
    const data=history.present,current=useRef(data),epoch=useRef(0);
    const [selectedId,setSelectedId]=useState<number|null>(null),[tool,setTool]=useState<FreeTool>('move'),[view,setView]=useState<'3d'|'plan'>('3d');
    const [panel,setPanel]=useState<'insert'|'object'|'layers'|'scene'>('insert'),[snap,setSnap]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
    const [showStart, setShowStart] = useState(true);
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
    useLayoutEffect(()=>{current.current=data;},[data]);
    const selected=data.objects.find(o=>o.id===selectedId),canEdit=!!selected && !selected.locked && !busy && !loading;
    const nextId=()=>Math.max(0,...current.current.objects.map(o=>o.id))+1;
    const commit=useCallback((next:FreeScene):boolean=>{
        try {
            stringifyFreeScene(next);if(JSON.stringify(next)===JSON.stringify(current.current))return true;
            epoch.current++;current.current=next;
            setHistory(previous=>({past:[...previous.past.slice(-39),previous.present],present:next,future:[]}));setError('');return true;
        } catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar a cena.');return false;}
    },[]);
    const select=useCallback((id:number|null)=>{setSelectedId(id);if(id!==null)setPanel('object');},[]);
    const transform=useCallback((id:number,pose:FreePose)=>{
        const scene=current.current,item=scene.objects.find(o=>o.id===id);if(!item || item.locked)return false;
        const next={...item,...pose};return commit({...scene,objects:scene.objects.map(o=>o.id===id?next:o)});
    },[commit]);
    const addWall=useCallback((a:V3,b:V3)=>{
        const scene=current.current,id=Math.max(0,...scene.objects.map(o=>o.id))+1;
        try{const wall=wallBetween(a,b,id);if(commit({...scene,objects:[...scene.objects,wall]})){select(id);setNotice('Parede criada. Continue desenhando ou use Mover e Girar.');}}catch(e){setError(e instanceof Error?e.message:'Não foi possível criar a parede.');}
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
        setTool(nextTool);
        if (nextTool === 'rectangle') {
            setNotice('Arraste no chão para desenhar. V ou Esc volta para Mover.');
        }
    }

    function add(kind:FreeKind) {
        if(busy || loading)return;const item=newFreeObject(kind,nextId());
        const [x,y]=api.current?.center() ?? [0,0,0];
        item.position=[x,y,item.position[2]];
        if(commit({...current.current,objects:[...current.current.objects,item]})){select(item.id);setTool('move');setNotice(`${item.name} adicionado. Arraste ou ajuste as propriedades.`);}
    }
    function patch(id:number,change:Partial<FreeObject>):boolean {
        const scene=current.current,item=scene.objects.find(o=>o.id===id);if(!item)return false;
        if(item.locked && Object.keys(change).some(key=>key!=='locked' && key!=='visible')){setError('Desbloqueie a peça para editar.');return false;}
        return commit({...scene,objects:scene.objects.map(o=>o.id===id?{...o,...change}:o)});
    }
    function modelSettings(item:FreeObject,settings:Partial<Pick<FreeObject,'objUnit'|'upAxis'>>):boolean {
        try{const next={...item,...settings};const g=modelGeometry({id:1,name:next.name,source:next.source,unit:next.objUnit,upAxis:next.upAxis,scale:1,x:0,y:0,z:0,rotation:0,material:'white'});return patch(item.id,{...settings,size:g.size.map(n=>Math.max(.01,n)) as V3});}
        catch(e){setError(e instanceof Error?e.message:'Modelo inválido.');return false;}
    }
    function duplicate() {
        if(!selected || busy || loading)return;
        const copy:FreeObject={...selected,id:nextId(),name:(selected.name+' · cópia').slice(0,100),position:[selected.position[0]+Math.max(.3,selected.size[0]*.25),selected.position[1]+.3,selected.position[2]],rotation:[...selected.rotation],size:[...selected.size],locked:false};
        if(commit({...current.current,objects:[...current.current.objects,copy]})){select(copy.id);setTool('move');setNotice('Peça duplicada. A cópia tem propriedades independentes.');}
    }
    function remove() {
        if(!selected || selected.locked || busy || loading)return;
        if(commit({...current.current,objects:current.current.objects.filter(o=>o.id!==selected.id)})){select(null);setNotice('Peça excluída. Use Desfazer para recuperar.');}
    }
    function travel(direction:'undo'|'redo') {
        if(busy || loading)return;epoch.current++;fileRequest.current++;
        setHistory(previous=>{
            const list=direction==='undo'?previous.past:previous.future;if(!list.length)return previous;
            const present=direction==='undo'?list[list.length-1]:list[0];current.current=present;
            return direction==='undo'?{past:previous.past.slice(0,-1),present,future:[previous.present,...previous.future].slice(0,40)}:{past:[...previous.past,previous.present].slice(-40),present,future:previous.future.slice(1)};
        });setError('');setNotice(direction==='undo'?'Edição desfeita.':'Edição refeita.');
    }
    function startScene(scene: FreeScene) {
        if (busy || loading || !commit(scene)) return;
        setShowStart(false);
        setShowObjImport(false);
        select(null);
        setView('3d');
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
            if(commit(loaded)){setShowStart(false);select(null);setView(loaded.view);setTool('move');setPanel('layers');requestAnimationFrame(()=>api.current?.fit());setNotice('Cena livre aberta. Todas as peças foram restauradas.');}
        }catch(e){setError(e instanceof Error?e.message:'Não foi possível abrir.');}finally{if(request===fileRequest.current)setLoading(false);}
    }
    async function uploadObj(event:ChangeEvent<HTMLInputElement>) {
        const file=event.target.files?.[0];event.target.value='';if(!file)return;
        const start=epoch.current;setLoading(true);setError('');
        try {
            if(!/\.obj$/i.test(file.name) || file.size>MAX_MODEL_BYTES)throw new Error('Escolha um OBJ de até 2 MB.');
            const source=await file.text();if(start!==epoch.current)throw new Error('A cena mudou. Importe o OBJ novamente.');
            const item=newFreeObject('obj',nextId());item.name=file.name.slice(0,100);item.source=source;item.objUnit=objUnit;item.upAxis=objAxis;item.position=api.current?.center() ?? [0,0,0];
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
            const script = createExportScript(current.current);
            try {
                await navigator.clipboard.writeText(script);
            } catch {
                throw new Error('O navegador não permitiu copiar. Use o botão Baixar.');
            }
            setError('');
            setNotice(`Script para ${exportDestination} copiado.`);
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
        if (showStart) return;
        try { if (localStorage.getItem(freeTourStorageKey)) return; } catch {}
        const frame = requestAnimationFrame(() => setHelpMode(mode => mode ?? 'welcome'));
        return () => cancelAnimationFrame(frame);
    }, [showStart]);

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
        if(showStart || (event.target as HTMLElement).closest('[data-free-help],input,textarea,select,[contenteditable="true"]'))return;
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
        else if(modifier && key==='s'){event.preventDefault();save();}
        else if(key==='delete' || key==='backspace'){event.preventDefault();remove();}
        else if(!modifier){const modes:Record<string,FreeTool>={m:'select',v:'move',r:'rectangle',g:'rotate',s:'scale',h:'hand',b:'wall'};if(modes[key])activateTool(modes[key]);else if(key==='t')add('text');else if(key==='0')api.current?.fit();}
    }
    const isBusy=busy || loading;
    return <div className="free-editor" onKeyDown={keys} data-free-tour={helpMode === 'tour' ? tourSteps[tourStep].id : undefined}>
      <header className="free-topbar"><div className="free-brand"><Box size={23}/><strong>codebuddy<small>CENA LIVRE 3D</small></strong></div>
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
      <div className="free-documentbar"><span><i/>{data.name}</span><span>{selected?.name ?? `${data.objects.length} peças · metros`}</span><div className="free-view-switch" role="group" aria-label="Vista da cena"><button aria-pressed={view==='3d'} onClick={()=>setView('3d')} disabled={isBusy}>3D</button><button data-tour-anchor="draw" aria-pressed={view==='plan'} onClick={()=>setView('plan')} disabled={isBusy}>Planta</button></div></div>
      <main className="free-workspace">
        <nav className="free-tools" aria-label="Ferramentas da cena livre">
          {toolItems.map(({id,label,Icon})=><button key={id} data-tour-anchor={id==='move' ? 'move' : id==='rotate' || id==='scale' ? 'adjust' : id==='rectangle' || id==='wall' ? 'draw' : undefined} title={label} aria-label={label} aria-pressed={tool===id} disabled={isBusy} onClick={()=>activateTool(id)}><Icon size={19}/></button>)}
          <button title="Adicionar texto (T)" aria-label="Adicionar texto" disabled={isBusy} onClick={()=>add('text')}><Type size={20}/></button><span/>
          <button title="Duplicar (Ctrl+D)" aria-label="Duplicar peça" disabled={!selected || isBusy} onClick={duplicate}><CopyPlus size={19}/></button><button title="Excluir (Delete)" aria-label="Excluir peça" disabled={!canEdit} onClick={remove}><Trash2 size={18}/></button><span/>
          <button title="Desfazer (Ctrl+Z)" aria-label="Desfazer cena" disabled={!history.past.length || isBusy} onClick={()=>travel('undo')}><Undo2 size={19}/></button><button title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer cena" disabled={!history.future.length || isBusy} onClick={()=>travel('redo')}><Redo2 size={19}/></button><span/>
          <button aria-label="Aproximar cena" title="Aproximar" disabled={isBusy} onClick={()=>api.current?.zoom(1.25)}><ZoomIn size={19}/></button><button aria-label="Afastar cena" title="Afastar" disabled={isBusy} onClick={()=>api.current?.zoom(.8)}><ZoomOut size={19}/></button><button aria-label="Enquadrar cena" title="Enquadrar todas as peças (0)" disabled={isBusy} onClick={()=>api.current?.fit()}><Maximize size={18}/></button>
        </nav>
        <section className="free-stage" aria-label="Editor da cena livre">
          <FreeSceneViewport data={data} selectedId={selectedId} tool={tool} view={view} snap={snap} apiRef={api} onSelectAction={select} onTransformAction={transform} onWallAction={addWall} onRectangleAction={addRectangle} onBusyAction={setBusy}/>
          <div className="free-canvas-controls"><label><input type="checkbox" checked={data.grid} disabled={isBusy} onChange={event=>commit({...data,grid:event.target.checked})}/><Grid2X2 size={13}/>Grade</label><label><input type="checkbox" checked={snap} disabled={isBusy} onChange={event=>setSnap(event.target.checked)}/>Encaixar 10 cm / 15°</label></div>
          <div className="free-stage-help">{tool==='rectangle'?'Arraste no chão de um canto ao outro. V ou Esc volta para Mover.':tool==='wall'?'Arraste no chão para desenhar a parede. Esc cancela.':view==='plan'?'Planta: mova no plano ou use os eixos. Role para aproximar.':'3D: arraste o fundo para orbitar · botão direito para navegar · role para aproximar'}</div>
        </section>
        <aside className="free-inspector" aria-label="Criação e propriedades da cena livre">
          <nav className="free-panel-tabs" aria-label="Painel da cena livre">{([{id:'insert',label:'Adicionar'},{id:'object',label:'Propriedades'},{id:'layers',label:'Lista de peças'},{id:'scene',label:'Ambiente e grade'}] as const).map(item=><button key={item.id} aria-pressed={panel===item.id} onClick={()=>setPanel(item.id)}>{item.label}</button>)}</nav>
          {panel==='insert' && <div className="free-panel"><h2>Construa sua cena</h2><p>Nenhuma peça vem pronta. Insira uma de cada vez e edite como quiser.</p><div className="free-catalog">{freeCatalog.map(item=><button key={item.kind} data-tour-anchor={item.kind==='box' ? 'insert' : undefined} onClick={()=>add(item.kind)} disabled={isBusy}><span>{item.kind==='text'?<Type size={18}/>:item.kind==='wall'?<BrickWall size={18}/>:<Box size={18}/>}</span>{item.label}<Plus size={13}/></button>)}</div><button className="free-secondary" onClick={()=>{setTool('wall');setNotice('Arraste no chão para desenhar uma parede.');}} disabled={isBusy}><BrickWall size={16}/>Desenhar parede com o mouse</button>
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
            {selected ? <><h2>{selected.name}</h2><label className="free-field">Nome<input aria-label="Nome da peça" value={selected.name} maxLength={100} disabled={!canEdit} onChange={event=>patch(selected.id,{name:event.target.value})}/></label>
              <div className="free-state-row"><button aria-pressed={selected.visible} disabled={isBusy} onClick={()=>patch(selected.id,{visible:!selected.visible})}>{selected.visible?<Eye size={15}/>:<EyeOff size={15}/>} {selected.visible?'Visível':'Oculta'}</button><button aria-pressed={selected.locked} disabled={isBusy} onClick={()=>patch(selected.id,{locked:!selected.locked})}>{selected.locked?<Lock size={15}/>:<Unlock size={15}/>} {selected.locked?'Bloqueada':'Livre'}</button></div>
              <h3>Posição · m</h3><div className="free-vector">{(['X','Y','Z'] as const).map((axis,i)=><NumberField key={axis} label={`Posição ${axis}`} value={selected.position[i]} disabled={!canEdit} change={n=>{const position=[...selected.position] as V3;position[i]=n;return patch(selected.id,{position});}}/>)}</div>
              <h3>Rotação · graus</h3><div className="free-vector">{(['X','Y','Z'] as const).map((axis,i)=><NumberField key={axis} label={`Rotação ${axis}`} value={selected.rotation[i]} step={1} disabled={!canEdit} change={n=>{const rotation=[...selected.rotation] as V3;rotation[i]=n;return patch(selected.id,{rotation});}}/>)}</div>
              <h3>Medidas · m</h3><div className="free-vector">{(['Largura','Profundidade','Altura'] as const).map((label,i)=><NumberField key={label} label={label} value={selected.size[i]} min={.01} max={1000} disabled={!canEdit} change={n=>{const size=[...selected.size] as V3;size[i]=n;return patch(selected.id,{size});}}/>)}</div>
              {selected.kind==='text' && <label className="free-field">Texto<textarea aria-label="Conteúdo do texto" maxLength={1000} rows={4} value={selected.text} disabled={!canEdit} onChange={event=>patch(selected.id,{text:event.target.value})}/></label>}
              {['shelf','showcase'].includes(selected.kind) && <NumberField label="Prateleiras internas" value={selected.shelves} min={0} max={10} step={1} disabled={!canEdit} change={n=>patch(selected.id,{shelves:n})}/>}
              {selected.kind==='obj' && <div className="free-obj-options"><label>Unidade<select aria-label="Unidade do objeto importado" disabled={!canEdit} value={selected.objUnit} onChange={event=>modelSettings(selected,{objUnit:event.target.value as 'm'|'cm'|'mm'})}><option value="m">Metros</option><option value="cm">Centímetros</option><option value="mm">Milímetros</option></select></label><label>Eixo vertical<select aria-label="Eixo vertical do objeto importado" disabled={!canEdit} value={selected.upAxis} onChange={event=>modelSettings(selected,{upAxis:event.target.value as 'z'|'y'})}><option value="z">Z</option><option value="y">Y</option></select></label></div>}
              <h3>Acabamento</h3><label className="free-color">Cor<input aria-label="Cor da peça" type="color" value={selected.color} disabled={!canEdit} onChange={event=>patch(selected.id,{color:event.target.value})}/><span>{selected.color.toUpperCase()}</span></label>
              <div className="free-vector two"><NumberField label="Rugosidade" value={selected.roughness} min={0} max={1} step={.05} disabled={!canEdit} change={n=>patch(selected.id,{roughness:n})}/><NumberField label="Opacidade" value={selected.opacity} min={.05} max={1} step={.05} disabled={!canEdit} change={n=>patch(selected.id,{opacity:n})}/></div>
              {!['text','obj'].includes(selected.kind) && <><button className="free-secondary" onClick={()=>imageInput.current?.click()} disabled={!canEdit}><Upload size={15}/>{selected.image?'Trocar arte frontal':'Aplicar arte / logo'}</button>{selected.image && <div className="free-art-preview"><ImagePreview src={selected.image} alt="Arte frontal da peça" width={320} height={180} unoptimized/><button onClick={()=>patch(selected.id,{image:''})} disabled={!canEdit}>Remover arte</button></div>}</>}
              <div className="free-object-actions"><button onClick={duplicate} disabled={isBusy}><CopyPlus size={15}/>Duplicar</button><button onClick={remove} disabled={!canEdit}><Trash2 size={15}/>Excluir</button></div>
            </>:<><h2>Selecione uma peça</h2><p>Clique na cena ou abra a Lista de peças. Cada peça tem propriedades independentes.</p><button className="free-secondary" onClick={()=>setPanel('insert')}>Adicionar peça</button></>}
          </div>}
          {panel==='layers' && <div className="free-panel"><h2>Objetos · {data.objects.length}</h2>{!data.objects.length && <p>A cena está vazia. Comece inserindo uma peça.</p>}<div className="free-object-list">{[...data.objects].reverse().map(o=><div key={o.id} className={selectedId===o.id?'selected':''}><button aria-label={`Selecionar ${o.name} ${o.id}`} onClick={()=>select(o.id)}><Layers size={15}/><span>{o.name}</span></button><button title={o.visible?'Ocultar':'Mostrar'} aria-label={`${o.visible?'Ocultar':'Mostrar'} peça ${o.id}`} disabled={isBusy} onClick={()=>patch(o.id,{visible:!o.visible})}>{o.visible?<Eye size={14}/>:<EyeOff size={14}/>}</button><button title={o.locked?'Desbloquear':'Bloquear'} aria-label={`${o.locked?'Desbloquear':'Bloquear'} peça ${o.id}`} disabled={isBusy} onClick={()=>patch(o.id,{locked:!o.locked})}>{o.locked?<Lock size={14}/>:<Unlock size={14}/>}</button></div>)}</div></div>}
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
      <footer className="free-status"><span role={error?'alert':'status'} aria-live="polite" className={error?'has-error':''}>{error || (loading?'Lendo arquivo…':notice)}</span><span>{data.objects.length}/200 peças · X / Y / Z</span></footer>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={open}/><input ref={objInput} type="file" accept=".obj" hidden onChange={uploadObj}/><input ref={imageInput} type="file" accept="image/png,image/jpeg" hidden onChange={uploadArt}/>
    </div>;
}
