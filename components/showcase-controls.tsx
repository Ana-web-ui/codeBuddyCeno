'use client';

import type { Config } from '@/lib/generator';
import { showcaseSpace } from '@/lib/showcase';
import { Checkbox } from '@/components/ui/checkbox';

export function ShowcaseControls({ c, updateAction }: {
    c: Config;
    updateAction: <K extends keyof Config>(key: K, value: Config[K]) => void;
}) {
    const space = showcaseSpace(c);
    return <div className="parameter-section" aria-label="Acabamento das vitrines">
        <h3>Acabamento das vitrines</h3>
        <label className="element"><span>Base, perfis e vidros separados</span>
            <Checkbox checked={c.showcaseDetailed} onCheckedChange={value => updateAction('showcaseDetailed', value === true)}
                aria-label="Vitrine com acabamento detalhado"/>
        </label>
        {c.showcaseDetailed && <>
            {([
                ['showcasePlinthEnabled', 'Adicionar rodapé recuado à vitrine'],
                ['showcaseProfilesEnabled', 'Adicionar perfis à vitrine'],
            ] as const).map(([key, label]) => <label className="element" key={key}><span>{label}</span>
                <Checkbox checked={c[key]} onCheckedChange={value => updateAction(key, value === true)} aria-label={label}/>
            </label>)}
            {([
                ['showcaseDeckThickness', 'Espessura do tampo da vitrine', .015, .08, .005],
                ['showcasePlinthHeight', 'Altura do rodapé da vitrine', .04, .2, .01],
                ['showcasePlinthInset', 'Recuo do rodapé da vitrine', 0, .1, .01],
                ['showcaseProfileWidth', 'Largura dos perfis da vitrine', .01, .06, .005],
                ['showcaseGlassRoughness', 'Rugosidade do vidro da vitrine', 0, .2, .01],
                ['showcaseGlassIor', 'Índice de refração do vidro da vitrine', 1.3, 1.8, .01],
            ] as const).filter(([key]) => key === 'showcaseProfileWidth' ? c.showcaseProfilesEnabled
                : key === 'showcasePlinthHeight' || key === 'showcasePlinthInset' ? c.showcasePlinthEnabled : true)
                .map(([key, label, min, max, step]) => <label className="field" key={key}>
                    <span>{label}{key === 'showcaseGlassRoughness' || key === 'showcaseGlassIor' ? '' : ' (m)'}</span>
                    <input type="number" min={min} max={max} step={step} value={Number.isFinite(c[key]) ? c[key] : ''}
                        onChange={event => updateAction(key, event.target.valueAsNumber)}/>
                </label>)}
            <p className="tab-help">Vão livre entre vidros: {Number.isFinite(space.gap) && space.gap >= 0
                ? space.gap.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' m' : 'confira as medidas'}.
                Escolha os materiais do corpo, tampo, rodapé e perfis na aba Materiais.
                A quantidade de prateleiras internas continua nos parâmetros da vitrine.</p>
        </>}
        {!c.showcaseDetailed && <p className="tab-help">Construção simples, preservando os projetos anteriores.</p>}
    </div>;
}
