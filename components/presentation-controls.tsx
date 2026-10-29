'use client';

import type { Config } from '@/lib/generator';
import { floorOutline, floorArea } from '@/lib/presentation';
import { Checkbox } from '@/components/ui/checkbox';

export function PresentationControls({ c, updateAction }: {
    c: Config;
    updateAction: <K extends keyof Config>(key: K, value: Config[K]) => void;
}) {
    const preview = [c.width, c.depth, c.floorCornerRadius].every(Number.isFinite) && c.width > 0 && c.depth > 0;
    const scale = 180 / Math.max(c.width, c.depth);
    return <div className="parameter-section presentation-controls" aria-label="Piso, iluminação e câmeras">
        <h3>Piso, iluminação e câmeras</h3>
        <label className="field"><span>Formato do piso</span><select value={c.floorShape}
            onChange={event => updateAction('floorShape', event.target.value as Config['floorShape'])}>
            <option value="rectangle">Retangular</option><option value="rounded">Cantos arredondados</option><option value="ellipse">Elíptico / circular</option>
        </select></label>
        {c.floorShape === 'rounded' && <label className="field"><span>Raio dos cantos do piso (m)</span>
            <input type="number" min="0" max={Math.min(c.width, c.depth) / 2} step="any"
                value={Number.isFinite(c.floorCornerRadius) ? c.floorCornerRadius : ''}
                onChange={event => updateAction('floorCornerRadius', event.target.valueAsNumber)}/>
        </label>}
        {preview && <>
            <svg viewBox="0 0 200 200" role="img" aria-label="Prévia do formato do piso" className="floor-shape-preview">
                <polygon points={floorOutline(c).map(([x, y]) => `${100+x*scale},${100-y*scale}`).join(' ')} fill="#283652" stroke="#9babff" strokeWidth="2"/>
            </svg>
            <p className="tab-help">Área do piso: {floorArea(c).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m².
                A altura permanece em 10 cm. Um piso elíptico fica circular quando largura e profundidade são iguais.</p>
        </>}
        {c.floorShape !== 'rectangle' && <p className="tab-help">As posições continuam preservadas. Para usar um piso curvo, desative paredes que chegam aos cantos e ajuste peças que ultrapassem o contorno.
            A planta sinaliza o que precisa ser revisto.</p>}
        <label className="field"><span>Estilo de iluminação</span><select value={c.lightingPreset}
            onChange={event => updateAction('lightingPreset', event.target.value as Config['lightingPreset'])}>
            <option value="original">Original</option><option value="neutral">Neutra</option><option value="warm">Quente</option><option value="studio">Estúdio com luz de recorte</option>
        </select></label>
        <label className="field"><span>Intensidade das luzes</span><input type="number" min="0.1" max="3" step="any"
            value={Number.isFinite(c.lightingIntensity) ? c.lightingIntensity : ''}
            onChange={event => updateAction('lightingIntensity', event.target.valueAsNumber)}/></label>
        <p className="tab-help">1 mantém a intensidade de referência; 0,5 reduz pela metade e 2 duplica. Os spots laterais continuam opcionais nos elementos do projeto.</p>
        <label className="element"><span>Adicionar câmeras de apresentação</span><Checkbox checked={c.presentationCameras}
            aria-label="Adicionar câmeras de apresentação" onCheckedChange={value => updateAction('presentationCameras', value === true)}/></label>
        {c.presentationCameras && <>
            <label className="field"><span>Câmera de apresentação ativa</span><select value={c.presentationCamera}
                onChange={event => updateAction('presentationCamera', event.target.value as Config['presentationCamera'])}>
                <option value="front">Frontal</option><option value="isometric">Isométrica</option><option value="top">Superior</option>
            </select></label>
            <label className="field"><span>Formato da apresentação</span><select value={c.presentationFormat}
                onChange={event => updateAction('presentationFormat', event.target.value as Config['presentationFormat'])}>
                <option value="landscape">Horizontal · 1920 × 1080</option><option value="square">Quadrado · 1080 × 1080</option><option value="portrait">Vertical · 1080 × 1920</option>
            </select></label>
            <label className="field"><span>Margem do enquadramento</span><input type="number" min="1.05" max="2" step="any"
                value={Number.isFinite(c.presentationMargin) ? c.presentationMargin : ''}
                onChange={event => updateAction('presentationMargin', event.target.valueAsNumber)}/></label>
            <p className="tab-help">As três câmeras seguem no arquivo. A escolhida fica ativa para apresentar o projeto; o enquadramento considera largura, profundidade e altura.
                A orientação da frente gira as câmeras junto da montagem. As vistas de apresentação usam projeção ortográfica.</p>
        </>}
        {!c.presentationCameras && <p className="tab-help">A câmera frontal original continua sendo utilizada.</p>}
    </div>;
}
