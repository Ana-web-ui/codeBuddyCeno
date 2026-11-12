import type { Config } from '@/lib/generator';

export function DemoControls({c,update}:{c:Config;update:<K extends keyof Config>(key:K,value:Config[K])=>void}) {
    const fields=[
        ['demoBenchWidth','Largura da bancada',.6,5],['demoBenchDepth','Profundidade da bancada',.4,2],['demoBenchHeight','Altura da bancada',.5,1.5],
        ['demoProductWidth','Largura do produto',.05,3],['demoProductDepth','Profundidade do produto',.05,3],['demoProductHeight','Altura do produto',.05,2],
        ['demoProductX','Produto: deslocamento X no tampo',-3,3],['demoProductY','Produto: deslocamento Y no tampo',-2,2],
        ['demoPresenterWidth','Largura da área do demonstrador',.6,3],['demoPresenterDepth','Profundidade da área do demonstrador',.6,3],
        ['demoPresenterGap','Vão entre demonstrador e bancada',.1,2],['demoAudienceGap','Vão entre público e bancada',.2,3],
    ] as const;
    return <div aria-label="Bancada e produto da demonstração">
      <h3>Bancada e produto</h3>
      <p className="tab-help">Um volume de referência representa o produto. A base fica apoiada no tampo, mantendo 5 cm livres das bordas. X e Y do produto são relativos à bancada. Os materiais ficam na aba Materiais.</p>
      <div className="param-grid">{fields.map(([key,label,min,max])=><label className="field" key={key}>{label}<div className="unit-input">
        <input type="number" inputMode="decimal" min={min} max={max} step="0.05" value={Number.isNaN(c[key])?'':c[key]} onChange={e=>update(key,e.target.value===''?NaN:Number(e.target.value))}/><span>m</span>
      </div></label>)}</div>
    </div>;
}
