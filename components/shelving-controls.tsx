'use client';

import type { Config } from '@/lib/generator';
import { shelvingSpace } from '@/lib/shelving';
import { Checkbox } from '@/components/ui/checkbox';

export function ShelvingControls({ c, updateAction }: {
    c: Config;
    updateAction: <K extends keyof Config>(key: K, value: Config[K]) => void;
}) {
    const space = shelvingSpace(c);
    return <div className="parameter-section" aria-label="Acabamento das estantes">
        <h3>Acabamento das estantes</h3>
        <label className="element"><span>Estrutura e prateleiras separadas</span>
            <Checkbox checked={c.shelfDetailed} onCheckedChange={value => updateAction('shelfDetailed', value === true)}
                aria-label="Estante com acabamento detalhado"/>
        </label>
        {c.shelfDetailed && <>
            {([
                ['shelfBackEnabled', 'Adicionar fundo à estante'],
                ['shelfBaseEnabled', 'Adicionar rodapé recuado à estante'],
            ] as const).map(([key, label]) => <label className="element" key={key}><span>{label}</span>
                <Checkbox checked={c[key]} onCheckedChange={value => updateAction(key, value === true)} aria-label={label}/>
            </label>)}
            {([
                ['shelfBoardThickness', 'Espessura das placas', .015, .08, .005],
                ['shelfBackThickness', 'Espessura do fundo', .006, .05, .001],
                ['shelfBaseHeight', 'Altura do rodapé da estante', .04, .2, .01],
                ['shelfBaseInset', 'Recuo do rodapé da estante', 0, .1, .01],
            ] as const).filter(([key]) => key === 'shelfBackThickness' ? c.shelfBackEnabled
                : key === 'shelfBaseHeight' || key === 'shelfBaseInset' ? c.shelfBaseEnabled : true)
                .map(([key, label, min, max, step]) => <label className="field" key={key}><span>{label} (m)</span>
                    <input type="number" min={min} max={max} step={step} value={Number.isFinite(c[key]) ? c[key] : ''}
                        onChange={event => updateAction(key, event.target.valueAsNumber)}/>
                </label>)}
            <p className="tab-help">Vão livre entre placas: {Number.isFinite(space.gap) && space.gap >= 0
                ? space.gap.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' m' : 'confira as medidas'}.
                Escolha os materiais da estrutura, prateleiras, fundo e rodapé na aba Materiais.
                A quantidade de prateleiras internas continua nos parâmetros da estante.</p>
        </>}
        {!c.shelfDetailed && <p className="tab-help">Construção simples, preservando os projetos anteriores.</p>}
    </div>;
}
