'use client';

import type { Config } from '@/lib/generator';
import { Checkbox } from '@/components/ui/checkbox';

export function CounterControls({ c, updateAction }: {
    c: Config;
    updateAction: <K extends keyof Config>(key: K, value: Config[K]) => void;
}) {
    return <div className="parameter-section" aria-label="Acabamento dos balcões">
        <h3>Acabamento dos balcões</h3>
        <label className="element">
            <span>Corpo, tampo e rodapé separados</span>
            <Checkbox checked={c.counterDetailed}
                onCheckedChange={value => updateAction('counterDetailed', value === true)}
                aria-label="Balcão com rodapé e acabamento detalhado"/>
        </label>
        {c.counterDetailed && <>
            {([
                ['counterTopThickness', 'Espessura do tampo', .02, .15],
                ['counterBaseHeight', 'Altura do rodapé', .02, .2],
                ['counterBaseInset', 'Recuo do rodapé', 0, .1],
            ] as const).map(([key, label, min, max]) => <label className="field" key={key}>
                <span>{label} (m)</span>
                <input type="number" min={min} max={max} step="0.01"
                    value={Number.isFinite(c[key]) ? c[key] : ''}
                    onChange={event => updateAction(key, event.target.valueAsNumber)}/>
            </label>)}
            <p className="tab-help">Escolha o material do corpo, tampo e rodapé na aba Materiais.
                A altura total e o espaço ocupado pelo balcão são preservados.
                Na exportação, cada balcão reúne suas peças sob um grupo próprio.</p>
        </>}
        {!c.counterDetailed && <p className="tab-help">Construção simples, compatível com os projetos anteriores.</p>}
    </div>;
}
