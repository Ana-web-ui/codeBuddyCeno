import type { Config } from '@/lib/generator';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';

export function SamplingControls({c,update}:{c:Config;update:<K extends keyof Config>(key:K,value:Config[K])=>void}) {
    const fields=[
        ['samplingCounterWidth','Largura do balcão de entrega',.6,5],['samplingCounterDepth','Profundidade do balcão de entrega',.4,2],['samplingCounterHeight','Altura do balcão de entrega',.6,1.3],
        ['samplingSupportWidth','Largura do apoio de preparo',.6,4],['samplingSupportDepth','Profundidade do apoio de preparo',.4,2],['samplingSupportHeight','Altura do apoio de preparo',.6,1.3],
        ['samplingTeamWidth','Largura da área da equipe',.6,3],['samplingTeamDepth','Profundidade da área da equipe',.6,3],
        ['samplingTeamGap','Vão entre equipe e balcão',.1,1],['samplingSupportGap','Vão entre equipe e apoio',.1,1],['samplingCustomerGap','Vão entre visitante e balcão',.2,2],
        ['samplingSampleCount','Amostras de referência',0,24],['samplingSampleWidth','Largura de cada amostra',.03,.5],['samplingSampleDepth','Profundidade de cada amostra',.03,.5],['samplingSampleHeight','Altura de cada amostra',.03,.6],
        ['samplingWasteWidth','Largura do descarte',.2,.8],['samplingWasteDepth','Profundidade do descarte',.2,.8],['samplingWasteHeight','Altura do descarte',.3,1],
    ] as const;
    return <div aria-label="Entrega, preparo e armazenamento de amostras">
      <h3>Entrega, preparo e armazenamento</h3>
      <p className="tab-help">A equipe fica entre o balcão de entrega e o apoio de preparo. O armazenamento ocupa a parte inferior do apoio. As amostras são volumes de referência, com 5 cm de margem no tampo; a quantidade representa apenas os objetos desenhados.</p>
      <label className="element"><span>Armário de armazenamento sob o apoio</span><input type="checkbox" checked={c.samplingStorageEnabled} onChange={e=>update('samplingStorageEnabled',e.target.checked)}/></label>
      <label className="element"><span>Incluir descarte lateral</span><input type="checkbox" checked={c.samplingWasteEnabled} onChange={e=>update('samplingWasteEnabled',e.target.checked)}/></label>
      {c.samplingWasteEnabled&&<div className="field"><span>Lado do descarte</span>
        <Select value={c.samplingWasteSide} onValueChange={v=>update('samplingWasteSide',v as Config['samplingWasteSide'])}>
          <SelectTrigger aria-label="Lado do descarte" className="full-select"><SelectValue/></SelectTrigger>
          <SelectContent><SelectItem value="left">Esquerda da estação</SelectItem><SelectItem value="right">Direita da estação</SelectItem></SelectContent>
        </Select>
      </div>}
      <div className="param-grid">{fields.filter(([key])=>!key.startsWith('samplingWaste')||c.samplingWasteEnabled).map(([key,label,min,max])=><label className="field" key={key}>{label}<div className="unit-input">
        <input type="number" inputMode={key==='samplingSampleCount'?'numeric':'decimal'} min={min} max={max} step={key==='samplingSampleCount'?1:.01} value={Number.isNaN(c[key])?'':c[key]} onChange={e=>update(key,e.target.value===''?NaN:Number(e.target.value))}/><span>{key==='samplingSampleCount'?'un':'m'}</span>
      </div></label>)}</div>
    </div>;
}
