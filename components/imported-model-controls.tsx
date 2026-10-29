'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Config } from '@/lib/generator';
import { materials } from '@/lib/generator';
import type { ImportedModel } from '@/lib/imported-models';
import { MAX_MODEL_BYTES, MAX_MODELS, modelGeometry, parseObj } from '@/lib/imported-models';

export function ImportedModelControls({ c, onChangeAction }: {
    c: Config;
    onChangeAction: (models: ImportedModel[]) => void;
}) {
    const [unit, setUnit] = useState<ImportedModel['unit']>('m');
    const [axis, setAxis] = useState<ImportedModel['upAxis']>('z');
    const [error, setError] = useState(''), [loading, setLoading] = useState(false);
    const current = useRef(c), request = useRef(0);
    useLayoutEffect(() => { current.current = c; }, [c]);
    async function handleFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const start = c, token = ++request.current;
        setError(''); setLoading(true);
        try {
            if (!/\.obj$/i.test(file.name) || file.size > MAX_MODEL_BYTES) throw new Error('Escolha um arquivo .obj de até 2 MB.');
            if (start.importedModels.length >= MAX_MODELS) throw new Error('Importe até 5 objetos personalizados.');
            const source = await file.text();
            parseObj(source);
            if (request.current !== token || current.current !== start) throw new Error('O projeto mudou durante a leitura. Selecione o arquivo novamente.');
            const id = Array.from({ length: 999 }, (_, i) => i + 1).find(id => !start.importedModels.some(m => m.id === id))!;
            const model: ImportedModel = { id, name: file.name.replace(/\.obj$/i, '').replace(/[\x00-\x1f]/g, '').slice(0, 100) || 'Objeto importado',
                source, unit, upAxis: axis, scale: 1, x: 0, y: 0, z: 0, rotation: 0, material: 'white' };
            onChangeAction([...start.importedModels, model]);
        } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível importar o OBJ.'); }
        finally { if (token === request.current) setLoading(false); }
    }
    function apply(event: FormEvent<HTMLFormElement>, model: ImportedModel) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const next = { ...model, name: String(form.get('name')), unit: form.get('unit') as ImportedModel['unit'],
            upAxis: form.get('upAxis') as ImportedModel['upAxis'], material: form.get('material') as ImportedModel['material'] };
        for (const key of ['scale', 'x', 'y', 'z', 'rotation'] as const) next[key] = Number(form.get(key));
        try { onChangeAction(c.importedModels.map(m => m.id === model.id ? next : m)); setError(''); }
        catch (e) { setError(e instanceof Error ? e.message : 'Confira os ajustes do objeto.'); }
    }
    return <div className="parameter-section imported-model-controls" aria-label="Objetos 3D personalizados">
        <h3>Objetos 3D personalizados</h3>
        <p className="tab-help">Importe a geometria de produtos e máquinas em OBJ. Selecione a unidade e o eixo vertical usados ao exportar o arquivo.
            Esta versão usa um material por objeto; MTL, texturas, UVs e normais do arquivo não são importados.</p>
        <label className="field"><span>Unidade do arquivo OBJ</span><select aria-label="Unidade do arquivo OBJ" value={unit} disabled={loading} onChange={e => setUnit(e.target.value as ImportedModel['unit'])}>
            <option value="m">Metros</option><option value="cm">Centímetros</option><option value="mm">Milímetros</option>
        </select></label>
        <label className="field"><span>Eixo vertical do arquivo OBJ</span><select aria-label="Eixo vertical do arquivo OBJ" value={axis} disabled={loading} onChange={e => setAxis(e.target.value as ImportedModel['upAxis'])}>
            <option value="z">Z para cima</option><option value="y">Y para cima</option>
        </select></label>
        <label className="upload-label" htmlFor="custom-model-file">{loading ? 'Lendo objeto…' : 'Importar objeto OBJ'}
            <input id="custom-model-file" type="file" accept=".obj" disabled={loading || c.importedModels.length >= MAX_MODELS} onChange={handleFile}/>
        </label>
        <p className="tab-help">Até 5 objetos, 2 MB e 20 mil vértices por arquivo. A planta mostra o espaço ocupado; a malha completa segue no JSON e no script.</p>
        {error && <p role="alert">{error}</p>}
        {c.importedModels.map(model => {
            const geometry = modelGeometry(model);
            const settings = Object.fromEntries(Object.entries(model).filter(([key]) => key !== 'source'));
            return <form key={JSON.stringify(settings)} aria-label={`Ajustar objeto ${model.id}`} onSubmit={event => apply(event, model)}>
                <h4>{model.name}</h4>
                <p className="tab-help">{geometry.size.map(n => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })).join(' × ')} m · {geometry.triangleCount} triângulos</p>
                <label className="field"><span>Nome do objeto {model.id}</span><input name="name" defaultValue={model.name} maxLength={100} required/></label>
                <label className="field"><span>Unidade do objeto {model.id}</span><select name="unit" defaultValue={model.unit}>
                    <option value="m">Metros</option><option value="cm">Centímetros</option><option value="mm">Milímetros</option>
                </select></label>
                <label className="field"><span>Eixo vertical do objeto {model.id}</span><select name="upAxis" defaultValue={model.upAxis}>
                    <option value="z">Z para cima</option><option value="y">Y para cima</option>
                </select></label>
                {([
                    ['scale', 'Escala', .001, 1000, .01], ['x', 'Posição X (m)', -30, 30, .1],
                    ['y', 'Posição Y (m)', -30, 30, .1], ['z', 'Elevação sobre o piso (m)', 0, 10, .1],
                    ['rotation', 'Rotação (°)', -360, 360, 1],
                ] as const).map(([key, label, min, max]) => <label className="field" key={key}><span>{label} — objeto {model.id}</span>
                    <input type="number" name={key} defaultValue={model[key]} min={min} max={max} step="any" required/>
                </label>)}
                <label className="field"><span>Material do objeto {model.id}</span><select name="material" defaultValue={model.material}>
                    {materials.map(material => <option value={material.value} key={material.value}>{material.label}</option>)}
                </select></label>
                <div className="imported-model-actions"><button type="submit">Aplicar ajustes — objeto {model.id}</button>
                <button type="button" onClick={() => {
                    try { onChangeAction(c.importedModels.filter(m => m.id !== model.id)); setError(''); }
                    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível remover.'); }
                }}>Remover objeto {model.id}</button></div>
            </form>;
        })}
        {!!c.importedModels.length && <p className="tab-help">X/Y indicam o centro. A elevação mede a base do objeto acima do piso: use a altura do tampo para apoiar um produto.
            Os objetos importados podem sobrepor móveis para permitir esse apoio; confira as interferências no programa 3D.
            A orientação da frente gira toda a montagem.</p>}
    </div>;
}
