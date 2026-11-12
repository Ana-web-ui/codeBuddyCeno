'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Config } from '@/lib/generator';
import { materials } from '@/lib/generator';
import type { BrandingConfig, ArtworkMode } from '@/lib/branding';
import { artworkImageSize } from '@/lib/branding-image';
import { artworkPlacement, artworkSurface } from '@/lib/branding-geometry';
import type { ArtworkSlot } from '@/lib/branding-geometry';
import { readArtworkFile } from '@/lib/branding-upload';
import { Checkbox } from '@/components/ui/checkbox';

type Props = { c: Config; onChangeAction: (patch: Partial<BrandingConfig>) => void };
function ArtworkControls({ c, slot, onChangeAction }: Props & { slot: ArtworkSlot }) {
    const [draft, setDraft] = useState({ mode: c[`${slot}Mode`], scale: c[`${slot}Scale`], offsetX: c[`${slot}OffsetX`], offsetY: c[`${slot}OffsetY`] });
    const [error, setError] = useState(''), [loading, setLoading] = useState(false);
    const current = useRef(c), request = useRef(0);
    useLayoutEffect(() => { current.current = c; }, [c]);
    useEffect(() => () => { request.current++; }, []);
    const image = c[`${slot}Image`], enabled = c[`${slot}Enabled`];
    const available = slot === 'panelArt' ? c.backdrops : c.counter;
    const label = slot === 'panelArt' ? 'Arte dos painéis' : 'Arte dos balcões';
    const surface = artworkSurface(c, slot);
    const draftValid = Number.isFinite(draft.scale) && draft.scale >= .1 && draft.scale <= 3 &&
        [draft.offsetX, draft.offsetY].every(n => Number.isFinite(n) && Math.abs(n) <= .5);
    const surfaceValid = [surface.width, surface.height].every(n => Number.isFinite(n) && n > 0);
    const placement = image && draftValid && surfaceValid ? artworkPlacement(surface, artworkImageSize(image), draft) : null;
    const background = slot === 'panelArt' ? c.backdropMat : c.counterMat;
    const patch = (values: Partial<BrandingConfig>) => {
        try { onChangeAction(values); setError(''); }
        catch (e) { setError(e instanceof Error ? e.message : 'Confira os ajustes da arte.'); }
    };
    async function upload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        const token = ++request.current, start = c;
        setLoading(true); setError('');
        try {
            const data = await readArtworkFile(file);
            if (token !== request.current || current.current !== start) throw new Error('O projeto mudou durante a leitura. Selecione a imagem novamente.');
            onChangeAction({ [`${slot}Image`]: data, [`${slot}Name`]: file.name.slice(0, 255), [`${slot}Enabled`]: true });
        } catch (e) { if (token === request.current) setError(e instanceof Error ? e.message : 'Não foi possível carregar a imagem.'); }
        finally { if (token === request.current) setLoading(false); }
    }
    function apply(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draftValid) return;
        patch({ [`${slot}Mode`]: draft.mode, [`${slot}Scale`]: draft.scale, [`${slot}OffsetX`]: draft.offsetX, [`${slot}OffsetY`]: draft.offsetY });
    }
    return <section className="branding-slot" aria-label={label}>
        <h4>{label}</h4>
        {!available && <p className="tab-help">Ative {slot === 'panelArt' ? 'Backdrops' : 'Balcão'} na aba Projeto para aplicar uma arte.
            {image ? ' A imagem guardada será preservada.' : ''}</p>}
        <label className="upload-label" htmlFor={`${slot}-file`}>{loading ? 'Preparando imagem…' : `Escolher imagem — ${label.toLowerCase()}`}
            <input id={`${slot}-file`} type="file" accept="image/png,image/jpeg" disabled={!available || loading} onChange={upload}/>
        </label>
        <p className="tab-help">PNG com transparência ou JPG · até 2 MB e 16 megapixels.</p>
        {image && <>
            <p className="branding-filename">{c[`${slot}Name`]}</p>
            <label className="element"><span>Aplicar {label.toLowerCase()}</span><Checkbox aria-label={`Aplicar ${label.toLowerCase()}`}
                checked={enabled} disabled={!available || loading} onCheckedChange={value => patch({ [`${slot}Enabled`]: value === true })}/></label>
            <form aria-label={`Ajustes — ${label}`} onSubmit={apply}>
                <label className="field"><span>Enquadramento — {label.toLowerCase()}</span><select value={draft.mode}
                    onChange={event => setDraft({ ...draft, mode: event.target.value as ArtworkMode })}>
                    <option value="contain">Logo inteiro · preservar proporção</option><option value="cover">Arte completa · preencher e recortar</option>
                </select></label>
                {([
                    ['scale', 'Escala', .1, 3], ['offsetX', 'Deslocamento horizontal', -.5, .5], ['offsetY', 'Deslocamento vertical', -.5, .5],
                ] as const).map(([key, name, min, max]) => <label className="field" key={key}><span>{name} — {label.toLowerCase()}</span>
                    <input type="number" min={min} max={max} step="any" required value={Number.isFinite(draft[key]) ? draft[key] : ''}
                        onChange={event => setDraft({ ...draft, [key]: event.target.valueAsNumber })}/>
                </label>)}
                <p className="tab-help">Escala 1 usa o enquadramento escolhido. O deslocamento é proporcional à área útil: 0,1 equivale a 10%.
                    Positivo move para a direita ou para cima, olhando a peça de frente.</p>
                {placement && <svg className="branding-preview" viewBox={`0 0 ${surface.width} ${surface.height}`} role="img" aria-label={`Prévia de enquadramento — ${label.toLowerCase()}`}>
                    <defs><clipPath id={`${slot}-clip`}><rect width={surface.width} height={surface.height}/></clipPath></defs>
                    <rect width={surface.width} height={surface.height} fill={background === 'brand' ? c.color : materials.find(m => m.value === background)?.color}/>
                    {enabled && <image href={image} x={surface.width / 2 + placement.left} y={surface.height / 2 - placement.bottom - placement.height}
                        width={placement.width} height={placement.height} preserveAspectRatio="none" clipPath={`url(#${slot}-clip)`}/>}
                </svg>}
                <p className="tab-help">{enabled ? 'Prévia dos ajustes. Clique em Aplicar para salvar o enquadramento.' : 'Arte guardada e desativada.'}
                    {slot === 'panelArt' ? ' A área útil respeita a moldura do painel.' : ' A aplicação ocupa somente a frente do corpo, abaixo do tampo.'}</p>
                <button type="submit" disabled={!available || !draftValid || loading}>Aplicar ajustes — {label.toLowerCase()}</button>
            </form>
            <button type="button" onClick={() => patch({ [`${slot}Image`]: '', [`${slot}Name`]: '', [`${slot}Enabled`]: false })}>Remover imagem — {label.toLowerCase()}</button>
        </>}
        {error && <p role="alert">{error}</p>}
    </section>;
}

export function BrandingControls({ c, onChangeAction }: Props) {
    return <div className="parameter-section branding-controls" aria-label="Logos e artes">
        <h3>Logos e artes</h3>
        <p className="tab-help">Aplique uma imagem na frente dos backdrops e outra na frente dos balcões, incluindo os de recepção.
            As unidades do mesmo tipo compartilham a arte. As imagens seguem no JSON e nos scripts.</p>
        {(['panelArt', 'counterArt'] as const).map(slot => <ArtworkControls c={c} slot={slot} onChangeAction={onChangeAction}
            key={JSON.stringify([slot, c[`${slot}Name`], c[`${slot}Image`].length, c[`${slot}Enabled`], c[`${slot}Mode`], c[`${slot}Scale`], c[`${slot}OffsetX`], c[`${slot}OffsetY`]])}/>)}
    </div>;
}
