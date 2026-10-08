'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Layers, Download, Copy, Check, Code2, Ruler, Monitor, LampDesk, PanelTop, RectangleVertical, Square, Sparkles } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Config, defaults, generate, geometry, filename, validate } from '@/lib/generator';

const elements = [
  { key: 'led', title: 'Painel de LED', text: 'Tela central com moldura', icon: Monitor },
  { key: 'counter', title: 'Balcão', text: 'Recepção com tampo branco', icon: PanelTop },
  { key: 'stage', title: 'Palco', text: 'Plataforma de 30 cm', icon: Layers },
  { key: 'totem', title: 'Totem', text: 'Elemento vertical de marca', icon: RectangleVertical },
  { key: 'spots', title: 'Spots laterais', text: 'Dois trilhos com luz quente', icon: LampDesk },
] as const;
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
    <rect x={x} y={y} width={w} height={h} fill="#1b2338" stroke="#687695" strokeDasharray="5 5"/>
    {c.back&&<rect x={x} y={y} width={w} height={Math.max(5,.15*s)} fill="#b0bed6"/>}
    {c.left&&<rect x={x} y={y} width={Math.max(5,.15*s)} height={h} fill="#b0bed6"/>}
    {c.right&&<rect x={x+w-Math.max(5,.15*s)} y={y} width={Math.max(5,.15*s)} height={h} fill="#b0bed6"/>}
    {c.led&&<g><rect x={px(-g.ledW/2)} y={py(c.depth/2-.35)-4} width={g.ledW*s} height="8" rx="2" fill={c.color}/><text x="300" y={y+32} textAnchor="middle" fill="#cdd7ec" fontSize="13">LED</text></g>}
    {c.stage&&<g><rect x={px(-g.stageW/2)} y={py(g.stageY+g.stageD/2)} width={g.stageW*s} height={g.stageD*s} rx="2" fill="#343e55" stroke="#78859d"/><text x="300" y={py(g.stageY)+5} textAnchor="middle" fill="#d0daee" fontSize="13">Palco</text></g>}
    {c.counter&&<g><rect x={px(g.counterX-g.counterW/2)} y={py(g.counterY+.365)} width={(g.counterW+.08)*s} height={.73*s} rx="3" fill={c.color}/><text x={px(g.counterX)} y={py(g.counterY)+5} textAnchor="middle" fill="white" fontSize="12">Balcão</text></g>}
    {c.totem&&<g><rect x={px(g.totemX-.35)} y={py(g.totemY+.225)} width={.7*s} height={.45*s} rx="2" fill={c.color}/><text x={px(g.totemX)} y={py(g.totemY)+27} textAnchor="middle" fill="#cdd7ec" fontSize="12">Totem</text></g>}
    {c.spots&&[-1,1].map(sign=><g key={sign}><path d={`M ${px(sign*(c.width/2-.35))} ${py(c.depth/2-.25)} V ${py(-c.depth/2+.25)}`} stroke="#b49a67" strokeWidth="2"/>{[-.27,0,.27].map(a=><circle key={a} cx={px(sign*(c.width/2-.35))} cy={py(c.depth*a)} r="4" fill="#f0ca85"/>)}</g>)}
    <text x="300" y={y+h+35} textAnchor="middle" fill="#8392ae" fontSize="13" letterSpacing="3">FRENTE / ENTRADA</text>
  </svg>;
}
export default function Home() {
  const [c,setC]=useState<Config>(defaults); const [tab,setTab]=useState('plan'); const [output,setOutput]=useState<{code:string;config:Config}|null>(null); const [error,setError]=useState(''); const [copied,setCopied]=useState(false); const [notice,setNotice]=useState(''); const current=useRef(c); current.current=c;
  const valid = (()=>{try{validate(c);return true;}catch{return false;}})();
  const display = valid ? c : defaults;
  const dirty=output && JSON.stringify(output.config)!==JSON.stringify(c);
  const update=<K extends keyof Config>(key:K,value:Config[K])=>{setC(prev=>({...prev,[key]:value}));setError('');setNotice('');};
  const build=()=>{try {const code=generate(c);setOutput({code,config:{...c}});setTab('code');setError('');setNotice('Script gerado. Você já pode baixar o arquivo.');}catch(e){setError((e as Error).message);}};
  function download(){if(!output||dirty)return;const blob=new Blob([output.code],{type:'text/x-python;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename(output.config);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Arquivo baixado. Abra no editor de texto do Blender.');}
  async function copy(){if(!output||dirty)return;try{await navigator.clipboard.writeText(output.code);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('Não foi possível copiar. Use o botão Baixar .py.');}}
  useEffect(()=>{
    const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown, options:unknown)=>Promise<void>|void}}).modelContext;
    if(!context?.registerTool)return; const controller=new AbortController();
    try {Promise.resolve(context.registerTool({name:'generate_blender_script',title:'Gerar script Blender',description:'Gera o script Blender usando a configuração visível atual e exibe o resultado.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{if(!input || typeof input!=='object'||Array.isArray(input)||Object.keys(input).length) throw new Error('Use um objeto vazio.'); const cfg={...current.current};const code=generate(cfg);setOutput({code,config:cfg});setTab('code');return {filename:filename(cfg),code};}}, {signal:controller.signal})).catch(()=>{});}catch{}
    return ()=>controller.abort();
  },[]);
  return <div className="app-shell">
    <header className="topbar"><a href="/" className="brand"><span className="brand-mark"><Box size={24}/></span><span>code<span className="brand-light">buddy</span><small>CENOGRAFIA</small></span></a><div className="topbar-right"><span className="version">V1 · Blender</span><span className="group-name">GRUPO <b>TV1</b></span></div></header>
    <main><div className="page-heading"><div><div className="eyebrow">SEU ESTÚDIO DE CENOGRAFIA</div><h1>Da ideia ao primeiro stand<span>.</span></h1><p>Defina as medidas. Escolha os elementos. Leve para o Blender.</p></div><div className="format"><Code2 size={20}/><span>SAÍDA DO PROJETO<strong>Python para Blender</strong></span></div></div>
    <div className="workspace"><section className="config-panel" aria-label="Configuração do stand"><div className="section-title"><span className="step">01</span><h2>Configure seu stand</h2></div>
      <label className="field">Nome do projeto<input value={c.name} maxLength={80} onChange={e=>update('name',e.target.value)} placeholder="Ex.: Stand KitKat"/></label>
      <div className="dimensions">{([{key:'width',label:'Largura',min:3,max:30},{key:'depth',label:'Profundidade',min:3,max:30},{key:'height',label:'Altura',min:2,max:8}] as const).map(f=><label className="field" key={f.key}>{f.label}<div className="unit-input"><input type="number" inputMode="decimal" min={f.min} max={f.max} step="0.1" value={Number.isNaN(c[f.key])?'':c[f.key]} onChange={e=>update(f.key,e.target.value===''?NaN:Number(e.target.value))}/><span>m</span></div></label>)}</div>
      <div className="area-summary"><Ruler size={16}/><span>Área do stand</span><strong>{valid?num(c.width*c.depth):'—'} <small>m²</small></strong></div>
      <div className="subheading"><h3>Paredes</h3><span>A frente fica aberta</span></div>
      <div className="wall-options">{([{key:'left',label:'Esquerda'},{key:'back',label:'Fundo'},{key:'right',label:'Direita'}] as const).map(f=><label className={'wall-choice '+(c[f.key]?'chosen':'')} key={f.key}><Checkbox checked={c[f.key]} onCheckedChange={v=>update(f.key,v===true)} aria-label={`Parede ${f.label.toLowerCase()}`}/>{f.label}</label>)}</div>
      <div className="subheading elements-heading"><h3>Elementos</h3><span>Selecione o que entra</span></div>
      <div className="element-list">{elements.map(f=><label className={'element '+(c[f.key]?'selected':'')} key={f.key}><span className="element-icon"><f.icon size={19}/></span><span className="element-text"><strong>{f.title}</strong><small>{f.text}</small></span><Checkbox checked={c[f.key]} onCheckedChange={v=>update(f.key,v===true)} aria-label={f.title}/></label>)}</div>
      <div className="color-row"><label htmlFor="brand-color">Cor de destaque<small>Aplicada ao LED e aos elementos</small></label><div className="color-control"><input id="brand-color" type="color" value={c.color} onChange={e=>update('color',e.target.value)}/><span>{c.color.toUpperCase()}</span></div></div>
      <button className="generate-button" onClick={build}><Sparkles size={18}/>Gerar script Blender</button><p className="generation-note">Piso, câmera frontal e luz ambiente incluídos.</p>{error&&<p role="alert" className="error">{error}</p>}
    </section>
    <section className="result-panel" aria-label="Visualização e script"><Tabs value={tab} onValueChange={setTab}><div className="result-header"><TabsList className="view-tabs"><TabsTrigger value="plan"><Square size={16}/>Planta</TabsTrigger><TabsTrigger value="code"><Code2 size={17}/>Script Python</TabsTrigger></TabsList><span className="plan-scale">{valid?`${num(c.width)} × ${num(c.depth)} m`:'Confira as medidas'}</span></div>
      <TabsContent value="plan"><div className="plan-title"><span>VISTA SUPERIOR</span><small>Planta esquemática · sem perspectiva</small></div><div className="drawing">{valid ? <Plan c={display}/> : <div className="empty"><Ruler size={32}/><p>Confira as medidas para visualizar a planta.<br/>Largura e profundidade: 3 a 30 m.<br/>Altura: 2 a 8 m.</p></div>}</div><div className="legend"><span><i className="legend-wall"/>Parede</span><span><i style={{background:c.color}}/>Elementos</span><span><i className="legend-light"/>Spots</span></div><div className="model-info"><div><span>ÁREA TOTAL</span><strong>{valid?num(c.width*c.depth):'—'} <small>m²</small></strong></div><div><span>ALTURA</span><strong>{valid?num(c.height):'—'} <small>m</small></strong></div><div><span>RENDER</span><strong>Cycles <small>64 samples</small></strong></div></div></TabsContent>
      <TabsContent value="code"><div className="code-toolbar"><span>{output?filename(output.config):'Seu script aparecerá aqui'}</span><div><button onClick={copy} disabled={!output||!!dirty} aria-label="Copiar script">{copied?<Check size={16}/>:<Copy size={16}/>} {copied?'Copiado':'Copiar'}</button><button onClick={download} disabled={!output||!!dirty}><Download size={16}/>Baixar .py</button></div></div>{dirty&&<div className="stale" role="status">Você alterou o stand. Clique em “Gerar script Blender” para atualizar o arquivo.</div>}{output?<pre className="code"><code>{output.code}</code></pre>:<div className="empty"><Code2 size={38}/><h3>Seu stand, em Python.</h3><p>Escolha os elementos ao lado e clique em<br/>“Gerar script Blender”.</p></div>}</TabsContent>
    </Tabs><p className="notice" role="status" aria-live="polite">{notice}</p>
      <div className="blender-guide"><div className="guide-icon"><Box size={22}/></div><div><h3>Como abrir no Blender</h3><ol><li><b>1</b>Comece com uma cena vazia e entre em <strong>Scripting</strong>.</li><li><b>2</b>Em <strong>Open</strong>, abra o arquivo .py baixado.</li><li><b>3</b>Clique em <strong>Run Script</strong>. Use <strong>F12</strong> para renderizar.</li></ol></div></div>
      <div className="scope-note"><span className="step small-step">i</span><p>Esta versão cria um modelo conceitual. Texturas, artes e detalhes de acabamento podem ser ajustados no Blender.</p></div>
    </section></div><footer><span>CODE BUDDY / CENOGRAFIA</span><span>Uma base para a sua próxima ideia.</span></footer></main>
  </div>;
}
