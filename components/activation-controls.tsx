'use client';
import { SamplingControls } from '@/components/sampling-controls';
import { DemoControls } from '@/components/demo-controls';
import { useState } from 'react';
import { activationModels } from '@/lib/activation';
import type { Config } from '@/lib/generator';
import { activationGeometry } from '@/lib/activation-geometry';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ActivationControls({c,update,apply}:{c:Config;update:<K extends keyof Config>(key:K,value:Config[K])=>void;apply:(next:Config)=>void}) {
    const [draft,setDraft]=useState<{config:Config;x:string;y:string}|null>(null);
    let position={x:c.activationWaitingX,y:c.activationWaitingY};
    try {position=activationGeometry(c)?.waiting??position;}catch{/* Permite corrigir parâmetros incompletos. */}
    const x=draft?.config===c?draft.x:position.x.toFixed(3),y=draft?.config===c?draft.y:position.y.toFixed(3);
    const fields=[
        ['activationPhotoPersonDistance','Pessoa até backdrop (centros)',.5,5],
        ['activationPhotoCameraDistance','Câmera até pessoa (centros)',.5,8],
        ['activationPhotoCameraWidth','Largura da área do fotógrafo',.5,3],
        ['activationPhotoCameraDepth','Profundidade da área do fotógrafo',.5,3],
        ['activationPhotoCameraHeight','Altura da câmera sobre o piso',.5,2.5],
        ['activationEdgeMargin','Margem das bordas',0,2],
        ['activationWaitingWidth','Largura da espera',.5,15],['activationWaitingDepth','Profundidade da espera',.5,15],
        ['activationParticipationWidth','Largura por participante',.5,5],['activationParticipationDepth','Profundidade por participante',.5,5],
        ['activationStationGap','Folga entre estações completas',0,5],
        ['activationCirculationWidth','Largura da circulação',.6,5],['activationEntranceWidth','Largura da entrada',.6,5],['activationExitWidth','Largura da saída',.6,5],
    ] as const;
    return <div className="parameter-section" aria-label="Zonas da ativação">
      <h3>Zonas da ativação · {activationModels.find(model=>model.value===c.activationModel)?.label}</h3>
      <p className="tab-help">{c.activationModel === 'sampling' ? 'Entrega de amostras à frente, equipe ao centro e preparo e armazenamento atrás. Descarte lateral opcional.' : c.activationModel === 'demo' ? 'Uma bancada com produto, demonstrador atrás e público à frente. A circulação atende as duas zonas pela lateral.' : c.activationModel === 'photo' ? 'Um backdrop com posição da pessoa, câmera e faixa reservada à captura. A circulação chega pela lateral, sem atravessar a foto.' : 'Distribuição inicial em fileira.'} Espera em amarelo, participação em verde e circulação em azul. As medidas são parâmetros de estudo da montagem.</p>
      {c.activationModel === 'demo' && <DemoControls c={c} update={update}/> }
      {c.activationModel === 'sampling' && <SamplingControls c={c} update={update}/> }
      <div className="param-grid">
        {(['activationEntranceSide','activationExitSide'] as const).map(key=><div className="field" key={key}><span>{key==='activationEntranceSide'?'Lado da entrada':'Lado da saída'}</span>
          <Select value={c[key]} onValueChange={value=>update(key,value as Config[typeof key])}>
            <SelectTrigger className="full-select" aria-label={key==='activationEntranceSide'?'Lado da entrada':'Lado da saída'}><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="front">Frente (−Y)</SelectItem><SelectItem value="back">Fundo (+Y)</SelectItem><SelectItem value="left">Esquerda (−X)</SelectItem><SelectItem value="right">Direita (+X)</SelectItem></SelectContent>
          </Select>
        </div>)}
        {fields.filter(([key])=>(c.activationWaitingEnabled||!key.startsWith('activationWaiting')) && (!key.startsWith('activationPhoto')||c.activationModel==='photo') && (key!=='activationStationGap'||c.activationModel==='touch')).map(([key,label,min,max])=><label className="field" key={key}>{c.activationModel === 'sampling' && key === 'activationParticipationWidth' ? 'Largura da área de experimentação' : c.activationModel === 'sampling' && key === 'activationParticipationDepth' ? 'Profundidade da área de experimentação' : c.activationModel === 'demo' && key === 'activationParticipationWidth' ? 'Largura da área do público' : c.activationModel === 'demo' && key === 'activationParticipationDepth' ? 'Profundidade da área do público' : label}<div className="unit-input">
          <input type="number" min={min} max={max} step="0.1" value={Number.isNaN(c[key])?'':c[key]} onChange={e=>update(key,e.target.value===''?NaN:Number(e.target.value))}/><span>m</span>
        </div></label>)}
      </div>
      <label className="element"><span>Incluir zona de espera</span><input type="checkbox" checked={c.activationWaitingEnabled} onChange={e=>update('activationWaitingEnabled',e.target.checked)}/></label>
      {c.activationWaitingEnabled&&<>
        <p className="tab-help">Espera: {c.activationWaitingManual?'posição manual':'posição automática próxima à entrada'}. X e Y usam o centro da área como origem.</p>
        <div className="param-grid">
          <label className="field">X da espera (m)<input type="number" step="0.1" value={x} onChange={e=>setDraft({config:c,x:e.target.value,y})}/></label>
          <label className="field">Y da espera (m)<input type="number" step="0.1" value={y} onChange={e=>setDraft({config:c,x,y:e.target.value})}/></label>
        </div>
        <button type="button" className="generate-button" onClick={()=>apply({...c,activationWaitingManual:true,activationWaitingX:x.trim()?Number(x):NaN,activationWaitingY:y.trim()?Number(y):NaN})}>Aplicar posição da espera</button>
        <button type="button" className="generate-button" onClick={()=>apply({...c,activationWaitingManual:false})}>Restaurar espera automática</button>
      </>}
      <label className="element"><span>Exportar zonas como referências sem render</span><input type="checkbox" checked={c.activationExportGuides} onChange={e=>update('activationExportGuides',e.target.checked)}/></label>
      <p className="tab-help">{c.activationModel === 'sampling' ? 'Selecione o balcão de entrega para mover e girar toda a estação. Equipe, visitantes e descarte têm acessos próprios pela circulação. As peças de armazenamento e preparo são referências para detalhar no Blender ou no Max.' : c.activationModel === 'demo' ? 'Selecione a bancada na planta para mover ou girar bancada, produto e zonas juntos. Público e demonstrador têm acessos laterais; o percurso não atravessa a estação.' : c.activationModel === 'photo' ? 'Selecione o espaço para fotos na planta para mover ou girar backdrop, pessoa e câmera juntos. A câmera de foto é uma referência independente da câmera geral do render. Ajuste o enquadramento no Blender ou no Max.' : 'Selecione uma estação na planta para mover o totem junto com a área de participação. O participante fica à frente da tela.'} Em rotações livres, a reserva de espaço usa uma envoltória conservadora. Um ajuste que bloqueie a circulação é recusado.</p>
    </div>;
}
