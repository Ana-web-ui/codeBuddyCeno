'use client';

import type { Config } from '@/lib/generator';
import type { FrontRotation } from '@/lib/stand-config';
import { materials } from '@/lib/generator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ReceptionFinishControls({ c, updateAction, applyAction }: {
    c: Config;
    updateAction: <K extends keyof Config>(key: K, value: Config[K]) => void;
    applyAction: (next: Config) => void;
}) {
    return <div className="parameter-section" aria-label="Finalização da recepção">
        <h3>Fila física e sinalização</h3>
        <button type="button" className="generate-button" onClick={() => applyAction({ ...c,
            receptionQueueEnabled: true, receptionBarriersEnabled: true,
            receptionSignEnabled: true, receptionExportGuides: true,
        })}>Ativar fila, sinalização e guias</button>
        <label className="field"><span>Orientação da frente da recepção</span>
            <Select value={String(c.frontRotation)} onValueChange={value => updateAction('frontRotation', Number(value) as FrontRotation)}>
                <SelectTrigger aria-label="Orientação da frente da recepção"><SelectValue/></SelectTrigger>
                <SelectContent>{([0, 90, 180, 270] as const).map((angle, i) => <SelectItem key={angle} value={String(angle)}>
                    {angle}° — Frente para {['baixo', 'a direita', 'cima', 'a esquerda'][i]}
                </SelectItem>)}</SelectContent>
            </Select>
        </label>
        {([
            ['receptionBarriersEnabled', 'Organizadores de fila com fitas'],
            ['receptionSignEnabled', 'Sinalização de credenciamento'],
            ['receptionExportGuides', 'Exportar guias de atendimento e circulação'],
        ] as const).map(([key, label]) => <label className="element" key={key}>
            <span>{label}</span><Checkbox checked={c[key]} disabled={key === 'receptionBarriersEnabled' && !c.receptionQueueEnabled}
                onCheckedChange={value => updateAction(key, value === true)} aria-label={label}/>
        </label>)}
        {c.receptionBarriersEnabled && <>{([
            ['receptionBarrierHeight', 'Altura dos organizadores', .7, 1.2],
            ['receptionBarrierSpan', 'Distância máxima entre postes', .5, 1.8],
        ] as const).map(([key, label, min, max]) => <label className="field" key={key}><span>{label} (m)</span>
            <input type="number" min={min} max={max} step="0.1" value={Number.isFinite(c[key]) ? c[key] : ''}
                onChange={event => updateAction(key, event.target.valueAsNumber)}/></label>)}</>}
        {c.receptionSignEnabled && <>
            <label className="field"><span>Texto da sinalização</span><input type="text" maxLength={48}
                value={c.receptionSignText} onChange={event => updateAction('receptionSignText', event.target.value)}/></label>
            {([
                ['receptionSignWidth', 'Largura da sinalização', .8, 3],
                ['receptionSignHeight', 'Altura da sinalização', 1.6, 3],
            ] as const).map(([key, label, min, max]) => <label className="field" key={key}><span>{label} (m)</span>
                <input type="number" min={min} max={max} step="0.1" value={Number.isFinite(c[key]) ? c[key] : ''}
                    onChange={event => updateAction(key, event.target.valueAsNumber)}/></label>)}
        </>}
        {([
            ['receptionBarrierMat', 'Postes e suportes'], ['receptionBeltMat', 'Fitas da fila'],
            ['receptionSignMat', 'Painel de sinalização'], ['receptionSignTextMat', 'Texto da sinalização'],
        ] as const).filter(([key]) => key === 'receptionBarrierMat' ? c.receptionSignEnabled || c.receptionBarriersEnabled
            : key === 'receptionBeltMat' ? c.receptionBarriersEnabled : c.receptionSignEnabled).map(([key, label]) =>
            <label className="field" key={key}><span>{label}</span><Select value={c[key]}
                onValueChange={value => updateAction(key, value as Config[typeof key])}>
                <SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>
                    {materials.map(material => <SelectItem key={material.value} value={material.value}>{material.label}</SelectItem>)}
                </SelectContent></Select></label>)}
        <p className="tab-help">As medidas são relativas à frente local. Girar a recepção gira a montagem completa.
            As bases ficam fora da largura livre da fila. Os guias exportados não aparecem no render.
            Os balcões continuam organizados por fileira.</p>
    </div>;
}
