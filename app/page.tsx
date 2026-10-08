'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Layers, Download, Copy, Check, Code2, Ruler, Monitor, LampDesk, PanelTop, RectangleVertical, Square, Sparkles } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MaterialKind, Target, materials, Config, defaults, generate, geometry, filename, validate } from '@/lib/generator';

const elements = [
  { key: 'led', title: 'Painel de LED', text: 'Tela central com moldura', icon: Monitor },
  { key: 'counter', title: 'Balcão', text: 'Recepção com tampo branco', icon: PanelTop },
  { key: 'stage', title: 'Palco', text: 'Plataforma com altura ajustável', icon: Layers },
  { key: 'totem', title: 'Totem', text: 'Elemento vertical de marca', icon: RectangleVertical },
  { key: 'spots', title: 'Spots laterais', text: 'Dois trilhos com luz quente', icon: LampDesk },
] as const;
type NumberKey = { [K in keyof Config]: Config[K] extends number ? K : never }[keyof Config];
type ParameterField={key:NumberKey;label:string;unit?:string;min?:number;max?:number};
const parameterFields:Record<'led'|'counter'|'stage'|'totem'|'spots',ParameterField[]>={
 led:[{key:'ledWidth',label:'Largura'},{key:'ledHeight',label:'Altura'},{key:'ledBottom',label:'Base sobre o piso',max:8}],
 counter:[{key:'counterWidth',label:'Largura'},{key:'counterDepth',label:'Profundidade'},{key:'counterHeight',label:'Altura'},{key:'counterCount',label:'Quantidade',unit:'un',min:1,max:6}],
 stage:[{key:'stageWidth',label:'Largura'},{key:'stageDepth',label:'Profundidade'},{key:'stageHeight',label:'Altura',max:1}],
 totem:[{key:'totemWidth',label:'Largura'},{key:'totemDepth',label:'Profundidade'},{key:'totemHeight',label:'Altura'},{key:'totemCount',label:'Quantidade',unit:'un',min:1,max:6}],
 spots:[{key:'spotsCount',label:'Quantidade por lado',unit:'un',min:1,max:10}]
};
const materialFields:{key:'floorMat'|'wallMat'|'counterMat'|'stageMat'|'totemMat';label:string;enabled?:'counter'|'stage'|'totem'}[]=[{key:'floorMat',label:'Piso'},{key:'wallMat',label:'Paredes'},{key:'counterMat',label:'Corpo do balcão',enabled:'counter'},{key:'stageMat',label:'Palco',enabled:'stage'},{key:'totemMat',label:'Totem',enabled:'totem'}];
const num = (v: number) => v.toLocaleString('pt-BR', {maximumFractionDigits: 2});
function Plan({c}: {c:Config}) {
  const g = geometry(c); const s = Math.min(440/c.width,280/c.depth); const w=c.width*s, h=c.depth*s, x=(600-w)/2, y=(390-h)/2;
  const px=(v:number)=>x+w/2+v*s, py=(v:number)=>y+h/2-v*s;
  return <svg viewBox="0 0 600 430" role="img" aria-label={`Planta esquemática de um stand de ${num(c.width)} por ${num(c.depth)} metros`}>
    <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#252d40" strokeWidth=".5"/></pattern></defs>
    <rect width="600" height="430" fill="url(#grid)"/>
    <path d={`M ${x} ${y-22} H ${x+w} M ${x} ${y-29} v 14 M ${x+w} ${y-29} v 14`} stroke="#67758e" fill="none"/>
    <text x="300" y={y-33} textAnchor="middle" fill="#b6c3d7" fontSize="14">{num(c.width)} m</text>
    <path d={`M ${x+w+24} ${y} V ${y+h} M ${x+w+17} ${y} h 14 M ${x+w+17} ${y+h} h 14`} stroke="#67758e" fill="none"/>
    <text x={x+w+40} y={y+h/2} transform={`rotate(90 ${x+w+40} ${y+h/2})`} textAnchor="middle" fill="#b6c3d7" fontSize="14">{num(c.depth)} m</text>
    <rect x={x} y={y} width={w} height={h} fill={(c.floorMat==='brand'?c.color:materials.find(m=>m.value===c.floorMat)?.color)+'25'} stroke="#687695" strokeDasharray="5 5"/>
    {c.back&&<rect x={x} y={y} width={w} height={Math.max(5,.15*s)} fill={c.wallMat==='brand'?c.color:materials.find(m=>m.value===c.wallMat)?.color}/>}
    {c.left&&<rect x={x} y={y} width={Math.max(5,.15*s)} height={h} fill={c.wallMat==='brand'?c.color:materials.find(m=>m.value===c.wallMat)?.color}/>}
    {c.right&&<rect x={x+w-Math.max(5,.15*s)} y={y} width={Math.max(5,.15*s)} height={h} fill={c.wallMat==='brand'?c.color:materials.find(m=>m.value===c.wallMat)?.color}/>}
    {c.led&&<g><rect x={px(-g.ledW/2)} y={py(c.depth/2-.35)-4} width={g.ledW*s} height="8" rx="2" fill={c.color}/><text x="300" y={y+32} textAnchor="middle" fill="#cdd7ec" fontSize="13">LED</text></g>}
    {c.stage&&<g><rect x={px(-g.stageW/2)} y={py(g.stageY+g.stageD/2)} width={g.stageW*s} height={g.stageD*s} rx="2" fill={c.stageMat==='brand'?c.color:materials.find(m=>m.value===c.stageMat)?.color} stroke="#78859d"/><text x="300" y={py(g.stageY)+5} textAnchor="middle" fill="#d0daee" fontSize="13">Palco</text></g>}
    {c.counter&&g.counterXs.map((cx,i)=><g key={i}><rect x={px(cx-(g.counterW+.08)/2)} y={py(g.counterY+(c.counterDepth+.08)/2)} width={(g.counterW+.08)*s} height={(c.counterDepth+.08)*s} rx="3" fill={c.counterMat==='brand'?c.color:materials.find(m=>m.value===c.counterMat)?.color}/><text x={px(cx)} y={py(g.counterY)+5} textAnchor="middle" fill="white" fontSize="12">Balcão</text></g>)}
    {c.totem&&g.totemXs.map((tx,i)=><g key={i}><rect x={px(tx-(c.totemWidth+.15)/2)} y={py(g.totemY+(c.totemDepth+.2)/2)} width={(c.totemWidth+.15)*s} height={(c.totemDepth+.2)*s} rx="2" fill={c.totemMat==='brand'?c.color:materials.find(m=>m.value===c.totemMat)?.color}/><text x={px(tx)} y={py(g.totemY)+27} textAnchor="middle" fill="#cdd7ec" fontSize="12">Totem</text></g>)}
    {c.spots&&[-1,1].map(sign=><g key={sign}><path d={`M ${px(sign*(c.width/2-.35))} ${py(c.depth/2-.25)} V ${py(-c.depth/2+.25)}`} stroke="#b49a67" strokeWidth="2"/>{g.spotYs.map((sy,i)=><circle key={i} cx={px(sign*(c.width/2-.35))} cy={py(sy)} r="4" fill="#f0ca85"/>)}</g>)}
    <text x="300" y={y+h+35} textAnchor="middle" fill="#8392ae" fontSize="13" letterSpacing="3">FRENTE / ENTRADA</text>
  </svg>;
}
export default function Home() {
  const [c,setC]=useState<Config>(defaults); const [tab,setTab]=useState('plan'); const [output,setOutput]=useState<{code:string;config:Config}|null>(null); const [error,setError]=useState(''); const [copied,setCopied]=useState(false); const [notice,setNotice]=useState(''); const current=useRef(c); current.current=c;
  const validationMessage = (()=>{try{validate(c);return '';}catch(e){return (e as Error).message;}})();
  const valid = !validationMessage;
  const display = valid ? c : defaults;
  const dirty=output && JSON.stringify(output.config)!==JSON.stringify(c);
  const update=<K extends keyof Config>(key:K,value:Config[K])=>{setC(prev=>({...prev,[key]:value}));setError('');setNotice('');};
  const build=()=>{try {const generated=generate(c);if(typeof generated!=='string') throw new Error('Não foi possível gerar o script.'); const code=generated;setOutput({code,config:{...c}});setTab('code');setError('');setNotice('Script gerado. Você já pode baixar o arquivo.');}catch(e){setError((e as Error).message);}};
  function download(){if(!output||dirty)return;const blob=new Blob([output.code],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename(output.config);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice(output.config.target==='max'?'Arquivo .ms baixado. Execute no 3ds Max.':'Arquivo .py baixado. Abra no Blender.');}
  async function handleImage(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(!['image/png','image/jpeg'].includes(file.type)||file.size>2*1024*1024){setError('Use uma imagem JPG ou PNG de até 2 MB.');return;}
    const reader=new FileReader();reader.onerror=()=>setError('Não foi possível ler a imagem.');
    reader.onload=()=>{const data=String(reader.result);const image=new Image();image.onerror=()=>setError('O arquivo não contém uma imagem válida.');image.onload=()=>{setC(prev=>({...prev,screenImage:data,screenName:file.name}));setError('');setNotice('Textura da TV adicionada. Gere o script para incluir a imagem.');};image.src=data;};reader.readAsDataURL(file);
  }
  async function copy(){if(!output||dirty)return;try{await navigator.clipboard.writeText(output.code);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('Não foi possível copiar. Use o botão Baixar arquivo.');}}
  useEffect(()=>{
    const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown, options:unknown)=>Promise<void>|void}}).modelContext;
    if(!context?.registerTool)return; const controller=new AbortController();
      try {Promise.resolve(context.registerTool({name:'generate_stand_script',title:'Gerar script de cenografia',description:'Gera o script para Blender ou 3ds Max de acordo com as medidas, materiais e textura visíveis.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{if(!input || typeof input!=='object'||Array.isArray(input)||Object.keys(input).length) throw new Error('Use um objeto vazio.'); const cfg={...current.current}; const generated=generate(cfg); if(typeof generated!=='string') throw new Error('Não foi possível gerar o script.'); const code=generated; setOutput({code,config:cfg}); setTab('code'); return {filename:filename(cfg),code};}}, {signal:controller.signal})).catch(()=>{});}catch{}
    return ()=>controller.abort();
  },[]);
  return <div className="app-shell">
    <header className="topbar"><a href="/" className="brand"><span className="brand-mark"><Box size={24}/></span><span>code<span className="brand-light">buddy</span><small>CENOGRAFIA</small></span></a><div className="topbar-right"><span className="version">V2 · Blender + Max</span><span className="group-name">GRUPO <b>TV1</b></span></div></header>
    <main><div className="page-heading"><div><div className="eyebrow">SEU ESTÚDIO DE CENOGRAFIA</div><h1>Da ideia ao primeiro stand<span>.</span></h1><p>Defina as medidas. Escolha os elementos. Leve para o Blender ou 3ds Max.</p></div><div className="format"><Code2 size={20}/><span>SAÍDA DO PROJETO<strong>{c.target==='max'?'MaxScript para 3ds Max':'Python para Blender'}</strong></span></div></div>
    <div className="workspace"><section className="config-panel" aria-label="Configuração do stand"><div className="section-title"><span className="step">01</span><h2>Configure seu stand</h2></div>
      <label className="field engine-label"><span>Gerar para</span><Select value={c.target} onValueChange={v=>update('target',v as Target)}><SelectTrigger aria-label="Programa de destino" className="full-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="blender">Blender · Python (.py)</SelectItem><SelectItem value="max">3ds Max · MaxScript (.ms)</SelectItem></SelectContent></Select></label>
      <Tabs defaultValue="stand" className="config-tabs"><TabsList className="config-tabs-list"><TabsTrigger value="stand">Stand</TabsTrigger><TabsTrigger value="params">Parâmetros</TabsTrigger><TabsTrigger value="materials">Materiais</TabsTrigger></TabsList><TabsContent value="stand">
      <label className="field">Nome do projeto<input value={c.name} maxLength={80} onChange={e=>update('name',e.target.value)} placeholder="Ex.: Stand KitKat"/></label>
      <div className="dimensions">{([{key:'width',label:'Largura',min:3,max:30},{key:'depth',label:'Profundidade',min:3,max:30},{key:'height',label:'Altura',min:2,max:8}] as const).map(f=><label className="field" key={f.key}>{f.label}<div className="unit-input"><input type="number" inputMode="decimal" min={f.min} max={f.max} step="0.1" value={Number.isNaN(c[f.key])?'':c[f.key]} onChange={e=>update(f.key,e.target.value===''?NaN:Number(e.target.value))}/><span>m</span></div></label>)}</div>
      <div className="area-summary"><Ruler size={16}/><span>Área do stand</span><strong>{valid?num(c.width*c.depth):'—'} <small>m²</small></strong></div>
      <div className="subheading"><h3>Paredes</h3><span>A frente fica aberta</span></div>
      <div className="wall-options">{([{key:'left',label:'Esquerda'},{key:'back',label:'Fundo'},{key:'right',label:'Direita'}] as const).map(f=><label className={'wall-choice '+(c[f.key]?'chosen':'')} key={f.key}><Checkbox checked={c[f.key]} onCheckedChange={v=>update(f.key,v===true)} aria-label={`Parede ${f.label.toLowerCase()}`}/>{f.label}</label>)}</div>
      <div className="subheading elements-heading"><h3>Elementos</h3><span>Selecione o que entra</span></div>
      <div className="element-list">{elements.map(f=><label className={'element '+(c[f.key]?'selected':'')} key={f.key}><span className="element-icon"><f.icon size={19}/></span><span className="element-text"><strong>{f.title}</strong><small>{f.text}</small></span><Checkbox checked={c[f.key]} onCheckedChange={v=>update(f.key,v===true)} aria-label={f.title}/></label>)}</div>
      <div className="color-row"><label htmlFor="brand-color">Cor de destaque<small>Aplicada ao LED e aos elementos</small></label><div className="color-control"><input id="brand-color" type="color" value={c.color} onChange={e=>update('color',e.target.value)}/><span>{c.color.toUpperCase()}</span></div></div>
      </TabsContent><TabsContent value="params">
      <p className="tab-help">Medidas em metros. Os elementos seguem uma distribuição automática na planta.</p>
      {elements.filter(f=>c[f.key]).map(f=><div className="parameter-section" key={f.key}><h3><f.icon size={16}/>{f.title}</h3><div className="param-grid">{parameterFields[f.key].map(field=><label className="field" key={field.key}>{field.label}<div className="unit-input"><input type="number" inputMode={field.unit==='un'?'numeric':'decimal'} min={field.min??.1} max={field.max??30} step={field.unit==='un'?1:.05} value={Number.isNaN(c[field.key])?'':c[field.key] as number} onChange={e=>update(field.key,e.target.value===''?NaN:Number(e.target.value))}/><span>{field.unit??'m'}</span></div></label>)}</div></div>)}
      {!elements.some(f=>c[f.key])&&<p className="tab-help">Selecione um elemento na aba Stand para ajustar suas medidas.</p>}
      {c.led&&<div className="texture-section"><h3>Textura da TV / LED</h3><p>Escolha a arte que vai aparecer na tela. A imagem inteira é ajustada às medidas do LED.</p><label className="upload-label" htmlFor="tv-image">Escolher imagem JPG ou PNG<input id="tv-image" type="file" accept="image/png,image/jpeg" onChange={handleImage}/></label><small>Até 2 MB · incorporada ao script · imagem estática</small>{c.screenImage?<div className="texture-preview"><img src={c.screenImage} alt="Arte selecionada para a tela de TV"/><span>{c.screenName}</span><button onClick={()=>{setC(prev=>({...prev,screenImage:'',screenName:''}));setNotice('Imagem removida.');}}>Remover imagem</button></div>:<p className="tab-help">Sem imagem, a tela usa a cor de destaque.</p>}</div>}
      </TabsContent><TabsContent value="materials"><p className="tab-help">Escolha o acabamento de cada parte. Madeira e concreto usam textura procedural; metal e vidro recebem propriedades de superfície.</p><div className="material-fields">{materialFields.filter(f=>!f.enabled||c[f.enabled]).map(f=><div className="field material-field" key={f.key}><label htmlFor={'mat-'+f.key}>{f.label}</label><Select value={c[f.key]} onValueChange={v=>update(f.key,v as MaterialKind)}><SelectTrigger id={'mat-'+f.key} className="full-select"><SelectValue/></SelectTrigger><SelectContent>{materials.map(m=><SelectItem key={m.value} value={m.value}><span className="material-dot" style={{background:m.value==='brand'?c.color:m.color}}/>{m.label}</SelectItem>)}</SelectContent></Select></div>)}</div></TabsContent></Tabs>
      <button className="generate-button" onClick={build}><Sparkles size={18}/>Gerar {c.target==='max'?'MaxScript':'script Blender'}</button><p className="generation-note">Piso, câmera frontal e iluminação incluídos.</p>{error&&<p role="alert" className="error">{error}</p>}
    </section>
    <section className="result-panel" aria-label="Visualização e script"><Tabs value={tab} onValueChange={setTab}><div className="result-header"><TabsList className="view-tabs"><TabsTrigger value="plan"><Square size={16}/>Planta</TabsTrigger><TabsTrigger value="code"><Code2 size={17}/>{c.target==='max'?'MaxScript':'Script Python'}</TabsTrigger></TabsList><span className="plan-scale">{valid?`${num(c.width)} × ${num(c.depth)} m`:'Confira as medidas'}</span></div>
      <TabsContent value="plan"><div className="plan-title"><span>VISTA SUPERIOR</span><small>Planta esquemática · sem perspectiva</small></div><div className="drawing">{valid ? <Plan c={display}/> : <div className="empty"><Ruler size={32}/><p>{validationMessage}</p></div>}</div><div className="legend"><span><i className="legend-wall"/>Parede</span><span><i style={{background:c.color}}/>Elementos</span><span><i className="legend-light"/>Spots</span></div><div className="model-info"><div><span>ÁREA TOTAL</span><strong>{valid?num(c.width*c.depth):'—'} <small>m²</small></strong></div><div><span>ALTURA</span><strong>{valid?num(c.height):'—'} <small>m</small></strong></div><div><span>{c.target==='max'?'EXPORTAÇÃO':'RENDER'}</span><strong>{c.target==='max'?'3ds Max':'Cycles'} <small>{c.target==='max'?'.ms':'64 samples'}</small></strong></div></div></TabsContent>
      <TabsContent value="code"><div className="code-toolbar"><span>{output?filename(output.config):'Seu script aparecerá aqui'}</span><div><button onClick={copy} disabled={!output||!!dirty} aria-label="Copiar script">{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copiado':'Copiar'}</button><button onClick={download} disabled={!output||!!dirty}><Download size={16}/>Baixar {output?.config.target==='max'?'.ms':'.py'}</button></div></div>{dirty&&<div className="stale" role="status">Você alterou o stand. Clique em “Gerar script” para atualizar o arquivo.</div>}{output?<pre className="code"><code>{output.code.replace(/data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+/g,'[imagem incorporada — baixe ou copie o script completo]').replace(/local IMAGEM_TV = "[A-Za-z0-9+/=]+"/g,'local IMAGEM_TV = "[imagem incorporada — baixe ou copie o script completo]"')}</code></pre>:<div className="empty"><Code2 size={38}/><h3>Seu stand, em código.</h3><p>Escolha os elementos ao lado e clique em<br/>“Gerar script”.</p></div>}</TabsContent>
    </Tabs><p className="notice" role="status" aria-live="polite">{notice}</p>
      <div className="blender-guide"><div className="guide-icon"><Box size={22}/></div><div><h3>Como abrir no {c.target==='max'?'3ds Max':'Blender'}</h3>{c.target==='max'?<ol><li><b>1</b>Baixe o arquivo <strong>.ms</strong>.</li><li><b>2</b>Abra o 3ds Max e entre em <strong>Scripting → Run Script</strong>.</li><li><b>3</b>Escolha o arquivo. Use <strong>CB_Camera_Frontal</strong> para visualizar.</li></ol>:<ol><li><b>1</b>Comece com uma cena vazia e entre em <strong>Scripting</strong>.</li><li><b>2</b>Em <strong>Open</strong>, abra o arquivo .py baixado.</li><li><b>3</b>Clique em <strong>Run Script</strong>. Use <strong>F12</strong> para renderizar.</li></ol>}</div></div>
      <div className="scope-note"><span className="step small-step">i</span><p>Esta versão cria um modelo conceitual. Texturas, artes e detalhes de acabamento podem ser ajustados no programa escolhido. A aparência final depende do renderizador.</p></div>
    </section></div><footer><span>CODE BUDDY / CENOGRAFIA</span><span>Uma base para a sua próxima ideia.</span></footer></main>
  </div>;
}
