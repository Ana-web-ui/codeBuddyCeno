'use client';

import type { Config } from '@/lib/generator';
import { Checkbox } from '@/components/ui/checkbox';

export function PanelControls({ c, updateAction }: {
    c: Config;
    updateAction: <K extends keyof Config>(key: K, value: Config[K]) => void;
}) {
    return <div className="parameter-section" aria-label="Acabamento dos painéis">
        <h3>Acabamento dos painéis</h3>
        <label className="element"><span>Frente, estrutura e bases separadas</span>
            <Checkbox checked={c.backdropDetailed} onCheckedChange={value => updateAction('backdropDetailed', value === true)}
                aria-label="Painel com acabamento detalhado"/>
        </label>
        {c.backdropDetailed && <>
            <label className="element"><span>Adicionar moldura frontal</span>
                <Checkbox checked={c.backdropFrameEnabled} onCheckedChange={value => updateAction('backdropFrameEnabled', value === true)}
                    aria-label="Adicionar moldura frontal ao painel"/>
            </label>
            {c.backdropFrameEnabled && ([
                ['backdropFrameWidth', 'Largura da moldura', .02, .2],
                ['backdropFrameDepth', 'Ressalto da moldura', .01, .15],
            ] as const).map(([key, label, min, max]) => <label className="field" key={key}>
                <span>{label} (m)</span><input type="number" min={min} max={max} step="0.01"
                    value={Number.isFinite(c[key]) ? c[key] : ''}
                    onChange={event => updateAction(key, event.target.valueAsNumber)}/>
            </label>)}
            <p className="tab-help">Escolha os materiais da frente, estrutura, bases e moldura na aba Materiais.
                A moldura fica dentro da largura e altura totais. O ressalto frontal deve caber na profundidade reservada às bases.
                Cada painel é exportado como um conjunto editável.</p>
        </>}
        {!c.backdropDetailed && <p className="tab-help">Painel simples, preservando a construção dos projetos anteriores.</p>}
    </div>;
}
