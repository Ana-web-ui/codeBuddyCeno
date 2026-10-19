'use client';
import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Box, Layers, Download, Copy, Check, Code2, Ruler, Monitor, LampDesk, PanelTop, RectangleVertical, Square, Sparkles, Armchair, Circle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { materials, generate, geometry, filename, validate, tableGeometry, stoolGeometry, pedestalGeometry, loungeGeometry, coffeeTableGeometry, showcaseGeometry, extraObjectGeometry, assemblyGeometry, } from '@/lib/generator';
import type { MaterialKind, Target, Config, ProjectType } from '@/lib/generator';
import { unitTransform } from '@/lib/assembly';
import type { ObjectTransform } from '@/lib/assembly';
import { projectTypes, createProjectConfig } from '@/lib/project-types';
import { libraryCatalog, layoutChairs, extraObjectDefinitions, extraObjectSpec } from '@/lib/library';
const MAX_PROJECT_BYTES = 4 * 1024 * 1024;
function serializeProject(config: Config): string {
    const text = JSON.stringify({ config }, null, 2);
    if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) {
        throw new Error('O projeto excede o limite de 4 MB.');
    }
    return text;
}
function parseProject(text: string): Config {
    if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) {
        throw new Error('O arquivo de projeto excede o limite de 4 MB.');
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error('O arquivo de projeto não contém um JSON válido.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('O arquivo de projeto é inválido.');
    }
    const root = parsed as Record<string, unknown>;
    const data = root.config && typeof root.config === 'object' && !Array.isArray(root.config)
        ? root.config as Record<string, unknown>
        : root;
    if (data.projectType !== 'stand' && data.projectType !== 'palco') {
        throw new Error('Tipo de projeto inválido.');
    }
    const config = { ...createProjectConfig(data.projectType), ...data } as Config;
    validate(config);
    return config;
}
function projectFilename(config: Config): string {
    const name = config.name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '');
    return `${name || 'projeto'}.json`;
}
const elements = [
    { key: 'shelving', title: 'Estantes expositoras', text: 'Estantes abertas com prateleiras', icon: Layers },
    { key: 'backdrops', title: 'Backdrops', text: 'Painéis de fundo com bases de apoio', icon: PanelTop },
    { key: 'touchScreens', title: 'Telas touch', text: 'Modelo 3D de tela vertical com suporte', icon: Monitor },
    { key: 'cabinets', title: 'Armários', text: 'Armários com duas portas e prateleiras', icon: Box },
    { key: 'openCubes', title: 'Cubos vazados', text: 'Módulos abertos na frente e atrás', icon: Square },
    { key: 'roundRugs', title: 'Tapetes circulares', text: 'Piso decorativo que permite móveis sobre ele', icon: Circle },
    { key: 'showcases', title: 'Vitrines expositoras', text: 'Base, fechamento de vidro e prateleiras', icon: RectangleVertical },
    { key: 'coffeeTables', title: 'Mesas de centro', text: 'Mesas baixas com tampo retangular e quatro pernas', icon: PanelTop },
    { key: 'armchairs', title: 'Poltronas', text: 'Assento, encosto, braços e base', icon: Armchair },
    { key: 'puffs', title: 'Puffs', text: 'Assentos baixos com formato quadrado', icon: Square },
    { key: 'pedestals', title: 'Pedestais expositores', text: 'Bases para exposição de produtos', icon: Box },
    { key: 'bistroTables', title: 'Mesas bistrô', text: 'Mesas altas com tampo circular e base central', icon: Circle },
    { key: 'led', title: 'Painel de LED', text: 'Tela central com moldura', icon: Monitor },
    { key: 'counter', title: 'Balcão', text: 'Recepção com tampo branco', icon: PanelTop },
    { key: 'stage', title: 'Palco', text: 'Plataforma com altura ajustável', icon: Layers },
    { key: 'totem', title: 'Totem', text: 'Elemento vertical de marca', icon: RectangleVertical },
    { key: 'spots', title: 'Spots laterais', text: 'Dois trilhos com luz quente', icon: LampDesk },
    { key: 'chairs', title: 'Cadeiras', text: 'Plateia organizada em filas', icon: Armchair },
    { key: 'roundTables', title: 'Mesas redondas', text: 'Mesas com tampo circular e base central', icon: Circle, },
    { key: 'rectTables', title: 'Mesas retangulares', text: 'Mesas com tampo retangular e quatro pés', icon: PanelTop },
    { key: 'stools', title: 'Banquetas', text: 'Assentos altos com base central', icon: Armchair },
] as const;
type NumberKey = {
    [K in keyof Config]: Config[K] extends number ? K : never;
}[keyof Config];
type ParameterField = {
    step?: number;
    key: NumberKey;
    label: string;
    unit?: string;
    min?: number;
    max?: number;
};
const parameterFields: Record<'led' | 'counter' | 'stage' | 'totem' | 'spots' | 'chairs' | 'roundTables' | 'rectTables' | 'bistroTables' | 'stools' | 'pedestals' | 'armchairs' | 'puffs' | 'coffeeTables' | 'showcases' | 'shelving' | 'backdrops' | 'touchScreens' | 'cabinets' | 'openCubes' | 'roundRugs', ParameterField[]> = {
    led: [{ key: 'ledWidth', label: 'Largura' }, { key: 'ledHeight', label: 'Altura' }, { key: 'ledBottom', label: 'Base sobre o piso', max: 8 }],
    counter: [{ key: 'counterWidth', label: 'Largura' }, { key: 'counterDepth', label: 'Profundidade' }, { key: 'counterHeight', label: 'Altura' }, { key: 'counterCount', label: 'Quantidade', unit: 'un', min: 1, max: 6 }],
    stage: [{ key: 'stageWidth', label: 'Largura' }, { key: 'stageDepth', label: 'Profundidade' }, { key: 'stageHeight', label: 'Altura', max: 1 }],
    totem: [{ key: 'totemWidth', label: 'Largura' }, { key: 'totemDepth', label: 'Profundidade' }, { key: 'totemHeight', label: 'Altura' }, { key: 'totemCount', label: 'Quantidade', unit: 'un', min: 1, max: 6 }],
    spots: [{ key: 'spotsCount', label: 'Quantidade por lado', unit: 'un', min: 1, max: 10 }],
    chairs: [{ key: 'attendeeCount', label: 'Pessoas previstas', unit: 'un', min: 1, max: 1000 },
        { key: 'chairExtraCount', label: 'Cadeiras extras', unit: 'un', min: 0, max: 1000 },
        { key: 'chairColumns', label: 'Máximo por fila', unit: 'un', min: 1, max: 60 },
        { key: 'chairWidth', label: 'Largura', min: .3, max: 1.2 },
        { key: 'chairDepth', label: 'Profundidade', min: .3, max: 1.2 },
        { key: 'chairHeight', label: 'Altura total', min: .65, max: 1.5 },
        { key: 'chairSeatHeight', label: 'Altura do assento', min: .3, max: .7 },
        { key: 'chairGapX', label: 'Vão entre cadeiras', min: 0, max: 2 },
        { key: 'chairRowGap', label: 'Vão entre filas', min: .1, max: 3 },
        { key: 'chairAisleWidth', label: 'Largura de cada corredor', min: 0, max: 5 },
        { key: 'chairStageGap', label: 'Distância do palco', min: .5, max: 5 },
        { key: 'chairSideMargin', label: 'Margem lateral', min: .5, max: 5 },
        { key: 'chairFrontMargin', label: 'Margem na entrada', min: .2, max: 5 },],
    roundTables: [
        { key: 'roundTableChairsPerTable', label: 'Cadeiras por mesa', unit: 'un', min: 1, max: 10 },
        { key: 'tableChairWidth', label: 'Largura das cadeiras das mesas', min: 0.3, max: 1.2 },
        { key: 'tableChairDepth', label: 'Profundidade das cadeiras das mesas', min: 0.3, max: 1.2 },
        { key: 'tableChairHeight', label: 'Altura das cadeiras das mesas', min: 0.65, max: 1.5 },
        { key: 'tableChairSeatHeight', label: 'Altura do assento das cadeiras das mesas', min: 0.3, max: 0.7 },
        { key: 'tableChairTableGap', label: 'Distância livre entre mesa e cadeiras', min: 0, max: 2 },
        { key: 'tableChairGap', label: 'Vão entre cadeiras das mesas', min: 0, max: 2 },
        { key: 'roundTableCount', label: 'Quantidade', unit: 'un', min: 1, max: 100 },
        { key: 'roundTableDiameter', label: 'Diâmetro', min: 0.4, max: 3 },
        { key: 'roundTableHeight', label: 'Altura', min: 0.4, max: 1.2 },
        { key: 'roundTableTopThickness', label: 'Espessura do tampo', min: 0.01, max: 0.15 },
        { key: 'roundTableGap', label: 'Vão livre entre mesas', min: 0, max: 5 },
    ],
    rectTables: [
        { key: 'rectTableChairsPerTable', label: 'Cadeiras por mesa', unit: 'un', min: 1, max: 12 },
        { key: 'tableChairWidth', label: 'Largura das cadeiras das mesas', min: 0.3, max: 1.2 },
        { key: 'tableChairDepth', label: 'Profundidade das cadeiras das mesas', min: 0.3, max: 1.2 },
        { key: 'tableChairHeight', label: 'Altura das cadeiras das mesas', min: 0.65, max: 1.5 },
        { key: 'tableChairSeatHeight', label: 'Altura do assento das cadeiras das mesas', min: 0.3, max: 0.7 },
        { key: 'tableChairTableGap', label: 'Distância livre entre mesa e cadeiras', min: 0, max: 2 },
        { key: 'tableChairGap', label: 'Vão entre cadeiras das mesas', min: 0, max: 2 },
        { key: "rectTableCount", label: "Quantidade", unit: "un", min: 1, max: 100, },
        { key: "rectTableWidth", label: "Largura", min: 0.4, max: 4, },
        { key: "rectTableDepth", label: "Profundidade", min: 0.4, max: 2, },
        { key: "rectTableHeight", label: "Altura", min: 0.4, max: 1.2, },
        { key: "rectTableTopThickness", label: "Espessura do tampo", min: 0.01, max: 0.15, },
        { key: "rectTableGap", label: "Vão livre entre mesas", min: 0, max: 5, },
    ],
    bistroTables: [
        { key: 'bistroTableCount', label: 'Quantidade', unit: 'un', min: 1, max: 100 },
        { key: 'bistroTableDiameter', label: 'Diâmetro', min: 0.4, max: 3 },
        { key: 'bistroTableHeight', label: 'Altura', min: 0.4, max: 1.2 },
        { key: 'bistroTableTopThickness', label: 'Espessura do tampo', min: 0.01, max: 0.15 },
        { key: 'bistroTableGap', label: 'Vão livre entre mesas', min: 0, max: 5 },
    ],
    stools: [
        { key: "stoolCount", label: "Quantidade", unit: "un", min: 1, max: 100, },
        { key: 'stoolsPerBistro', label: 'Banquetas por bistrô', unit: 'un', min: 1, max: 6 },
        { key: 'stoolBistroGap', label: 'Distância livre entre tampo e assentos', min: 0, max: 2 },
        { key: "stoolSeatDiameter", label: "Diâmetro do assento", min: 0.25, max: 0.8, },
        { key: "stoolSeatHeight", label: "Altura até o topo do assento", min: 0.4, max: 1, },
        { key: "stoolSeatThickness", label: "Espessura do assento", min: 0.02, max: 0.12, },
        { key: "stoolGap", label: "Vão livre entre banquetas", min: 0, max: 3, },
    ],
    pedestals: [
        { key: 'pedestalCount', label: 'Quantidade', unit: 'un', min: 1, max: 100 },
        { key: 'pedestalWidth', label: 'Largura', min: .2, max: 3 },
        { key: 'pedestalDepth', label: 'Profundidade', min: .2, max: 3 },
        { key: 'pedestalHeight', label: 'Altura', min: .2, max: 3 },
        { key: 'pedestalGap', label: 'Vão livre entre pedestais', min: 0, max: 3 },
    ],
    armchairs: [
        { key: 'armchairCount', label: 'Quantidade', unit: 'un', min: 1, max: 100 },
        { key: 'armchairWidth', label: 'Largura total', min: .6, max: 1.5 },
        { key: 'armchairDepth', label: 'Profundidade total', min: .6, max: 1.5 },
        { key: 'armchairHeight', label: 'Altura total', min: .7, max: 1.5 },
        { key: 'armchairSeatHeight', label: 'Altura até o topo do assento', min: .3, max: .65 },
        { key: 'armchairGap', label: 'Vão livre entre poltronas', min: 0, max: 3 },
    ],
    puffs: [
        { key: 'puffCount', label: 'Quantidade', unit: 'un', min: 1, max: 100 },
        { key: 'puffWidth', label: 'Largura', min: .3, max: 2 },
        { key: 'puffDepth', label: 'Profundidade', min: .3, max: 2 },
        { key: 'puffHeight', label: 'Altura', min: .2, max: .8 },
        { key: 'puffGap', label: 'Vão livre entre puffs', min: 0, max: 3 },
    ],
    coffeeTables: [
        { key: 'loungeArmchairsPerTable', label: 'Poltronas por conjunto', unit: 'un', min: 0, max: 4 },
        { key: 'loungePuffsPerTable', label: 'Puffs por conjunto', unit: 'un', min: 0, max: 4 },
        { key: 'loungeTableSeatGap', label: 'Distância livre entre mesa e assentos', min: 0, max: 2 },
        { key: 'loungeSeatGap', label: 'Vão livre entre assentos do conjunto', min: 0, max: 2 },
        { key: 'loungeSetGap', label: 'Vão livre entre conjuntos', min: 0, max: 3 },
        { key: 'coffeeTableCount', label: 'Quantidade', unit: 'un', min: 1, max: 100 },
        { key: 'coffeeTableWidth', label: 'Largura', min: .4, max: 2.5 },
        { key: 'coffeeTableDepth', label: 'Profundidade', min: .3, max: 1.5 },
        { key: 'coffeeTableHeight', label: 'Altura', min: .2, max: .65 },
        { key: 'coffeeTableTopThickness', label: 'Espessura do tampo', min: .02, max: .12 },
        { key: 'coffeeTableGap', label: 'Vão livre entre mesas de centro', min: 0, max: 3 },
    ],
    showcases: [
        { key: 'showcaseCount', label: 'Quantidade', unit: 'un', min: 1, max: 100 },
        { key: 'showcaseWidth', label: 'Largura', min: .3, max: 3 },
        { key: 'showcaseDepth', label: 'Profundidade', min: .3, max: 2 },
        { key: 'showcaseHeight', label: 'Altura total', min: .6, max: 3 },
        { key: 'showcaseBaseHeight', label: 'Altura da base', min: .1, max: 1.5 },
        { key: 'showcaseShelfCount', label: 'Prateleiras internas', unit: 'un', min: 0, max: 6 },
        { key: 'showcaseGlassThickness', label: 'Espessura do vidro', min: .004, max: .03 },
        { key: 'showcaseGap', label: 'Vão livre entre vitrines', min: 0, max: 3 },
    ],
    shelving: [{ "key": "shelfCount", "label": "Quantidade", "min": 1, "max": 100, "unit": "un" }, { "key": "shelfWidth", "label": "Largura", "min": 0.4, "max": 3 }, { "key": "shelfDepth", "label": "Profundidade", "min": 0.25, "max": 1.5 }, { "key": "shelfHeight", "label": "Altura", "min": 0.4, "max": 3 }, { "key": "shelfShelfCount", "label": "Prateleiras internas", "min": 0, "max": 6, "unit": "un" }, { "key": "shelfGap", "label": "Vão livre entre unidades", "min": 0, "max": 3 }],
    backdrops: [{ "key": "backdropCount", "label": "Quantidade", "min": 1, "max": 100, "unit": "un" }, { "key": "backdropWidth", "label": "Largura", "min": 1, "max": 6 }, { "key": "backdropHeight", "label": "Altura", "min": 0.8, "max": 3 }, { "key": "backdropThickness", "label": "Espessura do painel", "min": 0.02, "max": 0.2, "step": 0.01 }, { "key": "backdropBaseDepth", "label": "Profundidade das bases", "min": 0.3, "max": 1.5 }, { "key": "backdropGap", "label": "Vão livre entre unidades", "min": 0, "max": 3 }],
    touchScreens: [{ "key": "touchCount", "label": "Quantidade", "min": 1, "max": 100, "unit": "un" }, { "key": "touchWidth", "label": "Largura da tela", "min": 0.3, "max": 1.5 }, { "key": "touchHeight", "label": "Altura total", "min": 0.8, "max": 2.5 }, { "key": "touchScreenHeight", "label": "Altura da tela", "min": 0.4, "max": 1.6 }, { "key": "touchBaseDepth", "label": "Profundidade da base", "min": 0.3, "max": 1 }, { "key": "touchGap", "label": "Vão livre entre unidades", "min": 0, "max": 3 }],
    cabinets: [{ "key": "cabinetCount", "label": "Quantidade", "min": 1, "max": 100, "unit": "un" }, { "key": "cabinetWidth", "label": "Largura", "min": 0.4, "max": 3 }, { "key": "cabinetDepth", "label": "Profundidade do corpo", "min": 0.3, "max": 1.2 }, { "key": "cabinetHeight", "label": "Altura", "min": 0.4, "max": 3 }, { "key": "cabinetShelfCount", "label": "Prateleiras internas", "min": 0, "max": 6, "unit": "un" }, { "key": "cabinetGap", "label": "Vão livre entre unidades", "min": 0, "max": 3 }],
    openCubes: [{ "key": "openCubeCount", "label": "Quantidade", "min": 1, "max": 100, "unit": "un" }, { "key": "openCubeWidth", "label": "Largura", "min": 0.2, "max": 2 }, { "key": "openCubeDepth", "label": "Profundidade", "min": 0.2, "max": 1.5 }, { "key": "openCubeHeight", "label": "Altura", "min": 0.2, "max": 2 }, { "key": "openCubeWallThickness", "label": "Espessura das placas", "min": 0.015, "max": 0.1, "step": 0.005 }, { "key": "openCubeGap", "label": "Vão livre entre unidades", "min": 0, "max": 3 }],
    roundRugs: [{ "key": "rugCount", "label": "Quantidade", "min": 1, "max": 100, "unit": "un" }, { "key": "rugDiameter", "label": "Diâmetro", "min": 0.4, "max": 10 }, { "key": "rugGap", "label": "Vão livre entre unidades", "min": 0, "max": 3 }],
};
const materialFields: {
    key: 'floorMat' | 'wallMat' | 'counterMat' | 'stageMat' | 'totemMat' | 'roundTableMat' | 'rectTableMat' | 'bistroTableMat' | 'stoolMat' | 'pedestalMat' | 'armchairMat' | 'puffMat' | 'coffeeTableMat' | 'showcaseBaseMat' | 'shelfMat' | 'backdropMat' | 'touchMat' | 'cabinetMat' | 'openCubeMat' | 'rugMat';
    label: string;
    enabled?: 'counter' | 'stage' | 'totem' | 'roundTables' | 'rectTables' | 'bistroTables' | 'stools' | 'pedestals' | 'armchairs' | 'puffs' | 'coffeeTables' | 'showcases' | 'shelving' | 'backdrops' | 'touchScreens' | 'cabinets' | 'openCubes' | 'roundRugs';
}[] = [{ key: 'floorMat', label: 'Piso' },
    { key: 'wallMat', label: 'Paredes' },
    { key: 'counterMat', label: 'Corpo do balcão', enabled: 'counter' },
    { key: 'stageMat', label: 'Palco', enabled: 'stage' },
    { key: 'totemMat', label: 'Totem', enabled: 'totem' },
    { key: 'roundTableMat', label: 'Tampo das mesas redondas', enabled: 'roundTables' },
    { key: 'rectTableMat', label: 'Tampo das mesas retangulares', enabled: 'rectTables' },
    { key: 'bistroTableMat', label: 'Tampo das mesas bistrô', enabled: 'bistroTables' },
    { key: 'stoolMat', label: 'Assento das banquetas', enabled: 'stools' },
    { key: 'pedestalMat', label: 'Pedestais expositores', enabled: 'pedestals' },
    { key: 'armchairMat', label: 'Poltronas — assento, encosto e braços', enabled: 'armchairs' },
    { key: 'puffMat', label: 'Puffs', enabled: 'puffs' },
    { key: 'coffeeTableMat', label: 'Tampo das mesas de centro', enabled: 'coffeeTables' },
    { key: 'showcaseBaseMat', label: 'Base das vitrines expositoras', enabled: 'showcases' },
    { key: 'shelfMat', label: 'Estantes expositoras', enabled: 'shelving' },
    { key: 'backdropMat', label: 'Backdrops', enabled: 'backdrops' },
    { key: 'touchMat', label: 'Telas touch', enabled: 'touchScreens' },
    { key: 'cabinetMat', label: 'Armários', enabled: 'cabinets' },
    { key: 'openCubeMat', label: 'Cubos vazados', enabled: 'openCubes' },
    { key: 'rugMat', label: 'Tapetes circulares', enabled: 'roundRugs' }];
const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
type DragPreview = { id: string; transform: ObjectTransform; error: string };
type PlanDragSession = {
    pointerId: number; svg: SVGSVGElement; config: Config; id: string;
    startClientX: number; startClientY: number; offsetX: number; offsetY: number;
    original: ObjectTransform; latest: ObjectTransform; moved: boolean;
};
/** SVG coordinates use +Y down; the project uses +Y toward the back. */
function planPoint(width: number, depth: number, svgX: number, svgY: number) {
    const scale = Math.min(440 / width, 280 / depth);
    return { x: (svgX - 300) / scale, y: (195 - svgY) / scale };
}
function dragPosition(x: number, y: number, rotation: number, snap: boolean): ObjectTransform {
    const round = (v: number) => Number((snap ? Math.round(v / .1) * .1 : v).toFixed(6));
    return { x: round(x), y: round(y), rotation };
}
function Plan({ c, selectedId, onSelect, snap = true, onDragPreview, onDrop }: {
    c: Config; selectedId?: string | null; onSelect?: (id: string) => void; snap?: boolean;
    onDragPreview?: (preview: DragPreview | null) => void;
    onDrop?: (id: string, transform: ObjectTransform) => void;
}) {
    const [drag, setDrag] = useState<DragPreview | null>(null);
    const dragSession = useRef<PlanDragSession | null>(null);
    // Use current callbacks when a session ends during effect cleanup.
    const dragCallback = useRef(onDragPreview);
    dragCallback.current = onDragPreview;
    function release(session: PlanDragSession) {
        if (session.svg.hasPointerCapture(session.pointerId)) session.svg.releasePointerCapture(session.pointerId);
    }
    function cancelDrag() {
        const session = dragSession.current;
        dragSession.current = null;
        if (session) release(session);
        setDrag(null);
        dragCallback.current?.(null);
    }
    useEffect(() => {
        const session = dragSession.current;
        if (session && (session.config !== c || (selectedId != null && selectedId !== session.id))) cancelDrag();
    }, [c, selectedId]);
    useEffect(() => () => {
        const session = dragSession.current;
        dragSession.current = null;
        if (session) release(session);
        dragCallback.current?.(null);
    }, []);
    function clientPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
        const matrix = svg.getScreenCTM();
        if (!matrix) return null;
        const point = svg.createSVGPoint(); point.x = clientX; point.y = clientY;
        const local = point.matrixTransform(matrix.inverse());
        return planPoint(c.width, c.depth, local.x, local.y);
    }
    function startDrag(event: ReactPointerEvent<SVGGElement>, id: string, original: ObjectTransform) {
        if (!onDrop || event.button !== 0 || !event.isPrimary || dragSession.current) return;
        const svg = event.currentTarget.ownerSVGElement;
        if (!svg) return;
        const point = clientPoint(svg, event.clientX, event.clientY);
        if (!point) return;
        event.preventDefault(); event.stopPropagation();
        onSelect?.(id);
        event.currentTarget.focus();
        svg.setPointerCapture(event.pointerId);
        dragSession.current = { pointerId: event.pointerId, svg, config: c, id,
            startClientX: event.clientX, startClientY: event.clientY,
            offsetX: original.x - point.x, offsetY: original.y - point.y,
            original: { ...original }, latest: { ...original }, moved: false };
        const preview = { id, transform: { ...original }, error: '' };
        setDrag(preview); onDragPreview?.(preview);
    }
    function moveDrag(event: ReactPointerEvent<SVGSVGElement>) {
        const session = dragSession.current;
        if (!session || event.pointerId !== session.pointerId) return;
        if (session.config !== c) { cancelDrag(); return; }
        event.preventDefault();
        if (!session.moved && Math.hypot(event.clientX - session.startClientX, event.clientY - session.startClientY) < 3) return;
        const point = clientPoint(session.svg, event.clientX, event.clientY);
        if (!point) return;
        session.moved = true;
        const transform = dragPosition(point.x + session.offsetX, point.y + session.offsetY, session.original.rotation, snap);
        if (transform.x === session.latest.x && transform.y === session.latest.y) return;
        session.latest = transform;
        let error = '';
        try { validate({ ...c, objectTransforms: { ...c.objectTransforms, [session.id]: transform } }); }
        catch (e) { error = e instanceof Error ? e.message : 'Posição inválida.'; }
        const preview = { id: session.id, transform, error };
        setDrag(preview); onDragPreview?.(preview);
    }
    function endDrag(event: ReactPointerEvent<SVGSVGElement>) {
        const session = dragSession.current;
        if (!session || session.pointerId !== event.pointerId) return;
        // Pointer-up can contain a final coordinate not delivered by pointer-move.
        moveDrag(event);
        if (dragSession.current !== session) return;
        dragSession.current = null;
        release(session);
        setDrag(null); onDragPreview?.(null);
        if (session.moved && session.config === c && (session.latest.x !== session.original.x || session.latest.y !== session.original.y)) {
            onDrop?.(session.id, session.latest);
        }
    }
    const units = assemblyGeometry(c);
    const drawUnits = (floor: boolean) => units.filter(unit => unit.floor === floor).map(unit => {
        const t = drag?.id === unit.id ? drag.transform : unitTransform(c, unit), selected = selectedId === unit.id;
        const stroke = drag?.id === unit.id && drag.error ? '#ff6575' : selected ? '#ffce57' : '#dce6ff';
        return <g key={unit.id} role="button" tabIndex={0} aria-label={`Selecionar ${unit.label}`} aria-pressed={selected}
          onClick={() => onSelect?.(unit.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(unit.id); } }}
          onPointerDown={event => startDrag(event, unit.id, unitTransform(c, unit))}
          style={{ cursor: drag?.id === unit.id ? 'grabbing' : 'grab', touchAction: 'none' }} transform={`translate(${px(t.x)} ${py(t.y)}) rotate(${-t.rotation})`}>
          <title>{`${unit.label} — arraste para mover ou clique para ajustar`}</title>
          {unit.members.map(m => {
              const mx = (m.x - unit.x) * s, my = -(m.y - unit.y) * s;
              const fill = m.material === 'brand' ? c.color : materials.find(mat => mat.value === m.material)?.color ?? '#c8cedb';
              return <g key={`${m.role}:${m.index}`} transform={`translate(${mx} ${my}) rotate(${-m.rotation})`}>
                {m.circle ? <circle r={m.width * s / 2} fill={fill} fillOpacity={floor ? .45 : 1} stroke={stroke} strokeWidth={selected ? 2.5 : 1} />
                  : <rect x={-m.width * s / 2} y={-m.depth * s / 2} width={m.width * s} height={m.depth * s} rx="1" fill={fill} fillOpacity={m.role === 'showcases' ? .4 : m.role === 'openCubes' ? .25 : 1} stroke={stroke} strokeWidth={selected ? 2.5 : 1} />}
                {m.role === 'openCubes' && <rect x={(-m.width / 2 + c.openCubeWallThickness) * s} y={-m.depth * s / 2} width={(m.width - 2 * c.openCubeWallThickness) * s} height={m.depth * s} fill="none" stroke="#8795ad" strokeDasharray="2 2" />}
                {!m.circle && <path d={`M ${-m.width * s / 3} ${-m.depth * s / 2} H ${m.width * s / 3}`} stroke="#fff" strokeWidth="2" />}
              </g>;
          })}
          <text x="0" y="3" textAnchor="middle" fontSize="9" fill={selected ? '#ffce57' : '#101827'} stroke={selected ? '#101827' : 'none'} strokeWidth=".4">{unit.label.replace(/ [0-9]+$/, '').slice(0, 2).toUpperCase()}{Number(unit.id.split(':')[1]) + 1}</text>
        </g>;
    });
    const g = geometry(c);
    const seating = layoutChairs(c, g.stageY);
    const s = Math.min(440 / c.width, 280 / c.depth);
    const w = c.width * s, h = c.depth * s, x = (600 - w) / 2, y = (390 - h) / 2;
    const px = (v: number) => x + w / 2 + v * s, py = (v: number) => y + h / 2 - v * s;
    return <svg viewBox="0 0 600 430" role="group" tabIndex={0}
      onPointerMove={moveDrag} onPointerUp={endDrag}
      onPointerCancel={event => { if (dragSession.current?.pointerId === event.pointerId) cancelDrag(); }}
      onLostPointerCapture={event => { if (dragSession.current?.pointerId === event.pointerId) cancelDrag(); }}
      onKeyDown={event => { if (event.key === 'Escape' && dragSession.current) { event.preventDefault(); cancelDrag(); } }}
      style={{ userSelect: 'none' }} aria-label={`Planta esquemática da área de montagem de ${num(c.width)} por ${num(c.depth)} metros`}>
      <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#252d40" strokeWidth=".5"/></pattern></defs>
    <rect width="600" height="430" fill="url(#grid)"/>
    <path d={`M ${x} ${y - 22} H ${x + w} M ${x} ${y - 29} v 14 M ${x + w} ${y - 29} v 14`} stroke="#67758e" fill="none"/>
    <text x="300" y={y - 33} textAnchor="middle" fill="#b6c3d7" fontSize="14">{num(c.width)} m</text>
    <path d={`M ${x + w + 24} ${y} V ${y + h} M ${x + w + 17} ${y} h 14 M ${x + w + 17} ${y + h} h 14`} stroke="#67758e" fill="none"/>
    <text x={x + w + 40} y={y + h / 2} transform={`rotate(90 ${x + w + 40} ${y + h / 2})`} textAnchor="middle" fill="#b6c3d7" fontSize="14">{num(c.depth)} m</text>
    <rect x={x} y={y} width={w} height={h} fill={(c.floorMat === 'brand' ? c.color : materials.find(m => m.value === c.floorMat)?.color) + '25'} stroke="#687695" strokeDasharray="5 5"/>
    {drawUnits(true)}
    {c.back && <rect x={x} y={y} width={w} height={Math.max(5, .15 * s)} fill={c.wallMat === 'brand' ? c.color : materials.find(m => m.value === c.wallMat)?.color}/>}
    {c.left && <rect x={x} y={y} width={Math.max(5, .15 * s)} height={h} fill={c.wallMat === 'brand' ? c.color : materials.find(m => m.value === c.wallMat)?.color}/>}
    {c.right && <rect x={x + w - Math.max(5, .15 * s)} y={y} width={Math.max(5, .15 * s)} height={h} fill={c.wallMat === 'brand' ? c.color : materials.find(m => m.value === c.wallMat)?.color}/>}
    {c.led && <g><rect x={px(-g.ledW / 2)} y={py(c.depth / 2 - .35) - 4} width={g.ledW * s} height="8" rx="2" fill={c.color}/><text x="300" y={y + 32} textAnchor="middle" fill="#cdd7ec" fontSize="13">LED</text></g>}
    {c.stage && <g><rect x={px(-g.stageW / 2)} y={py(g.stageY + g.stageD / 2)} width={g.stageW * s} height={g.stageD * s} rx="2" fill={c.stageMat === 'brand' ? c.color : materials.find(m => m.value === c.stageMat)?.color} stroke="#78859d"/><text x="300" y={py(g.stageY) + 5} textAnchor="middle" fill="#d0daee" fontSize="13">Palco</text></g>}
    {c.chairs && (<g aria-label={`${seating.positions.length} cadeiras`}>
    {seating.positions.map(([cx, cy], index) => (<rect key={index} x={px(cx - c.chairWidth / 2)} y={py(cy + c.chairDepth / 2)} width={c.chairWidth * s} height={c.chairDepth * s} fill={c.color} stroke="#dce6ff" strokeWidth="0.5"/>))}
  </g>)}
    {drawUnits(false)}
    {c.counter && g.counterXs.map((cx, i) => <g key={i}><rect x={px(cx - (g.counterW + .08) / 2)} y={py(g.counterY + (c.counterDepth + .08) / 2)} width={(g.counterW + .08) * s} height={(c.counterDepth + .08) * s} rx="3" fill={c.counterMat === 'brand' ? c.color : materials.find(m => m.value === c.counterMat)?.color}/><text x={px(cx)} y={py(g.counterY) + 5} textAnchor="middle" fill="white" fontSize="12">Balcão</text></g>)}
    {c.totem && g.totemXs.map((tx, i) => <g key={i}><rect x={px(tx - (c.totemWidth + .15) / 2)} y={py(g.totemY + (c.totemDepth + .2) / 2)} width={(c.totemWidth + .15) * s} height={(c.totemDepth + .2) * s} rx="2" fill={c.totemMat === 'brand' ? c.color : materials.find(m => m.value === c.totemMat)?.color}/><text x={px(tx)} y={py(g.totemY) + 27} textAnchor="middle" fill="#cdd7ec" fontSize="12">Totem</text></g>)}
    {c.spots && [-1, 1].map(sign => <g key={sign}><path d={`M ${px(sign * (c.width / 2 - .35))} ${py(c.depth / 2 - .25)} V ${py(-c.depth / 2 + .25)}`} stroke="#b49a67" strokeWidth="2"/>{g.spotYs.map((sy, i) => <circle key={i} cx={px(sign * (c.width / 2 - .35))} cy={py(sy)} r="4" fill="#f0ca85"/>)}</g>)}
    {drag && <g pointerEvents="none" transform={`translate(${Math.max(5, Math.min(390, px(drag.transform.x) + 12))} ${Math.max(20, Math.min(398, py(drag.transform.y) - 16))})`}>
      <rect x="0" y="-17" width="198" height="27" rx="5" fill="#101827" stroke={drag.error ? '#ff6575' : '#ffce57'} />
      <text x="8" y="0" fill={drag.error ? '#ff6575' : '#ffce57'} fontSize="12">X: {num(drag.transform.x)} m · Y: {num(drag.transform.y)} m</text>
    </g>}
    <text x="300" y={y + h + 35} textAnchor="middle" fill="#8392ae" fontSize="13" letterSpacing="3">FRENTE / ENTRADA</text>
  </svg>;
}
export default function Home() {
    const [confirmedPartial, setConfirmedPartial] = useState<string | null>(null);
    const confirmedPartialRef = useRef<string | null>(null);
    confirmedPartialRef.current = confirmedPartial;
    const [c, setC] = useState<Config>(() => createProjectConfig("stand"));
    useEffect(() => {
        setConfirmedPartial(null);
        confirmedPartialRef.current = null;
    }, [c]);
    const projectDrafts = useRef<Record<ProjectType, Config>>({ stand: createProjectConfig("stand"), palco: createProjectConfig("palco") });
    const [tab, setTab] = useState('plan');
    const [output, setOutput] = useState<{
        code: string;
        config: Config;
    } | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [notice, setNotice] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [transformDraft, setTransformDraft] = useState({ x: '', y: '', rotation: '' });
    const [assemblyError, setAssemblyError] = useState('');
    const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const current = useRef(c);
    current.current = c;
    const imageRequest = useRef(0);
    const projectInput = useRef<HTMLInputElement>(null);
    const projectRequest = useRef(0);
    const [openingProject, setOpeningProject] = useState(false);
    const validationMessage: string = (() => {
        try {
            validate(c);
            layoutChairs(c, geometry(c).stageY);
            return '';
        }
        catch (e) {
            return e instanceof Error ? e.message : 'Dados inválidos';
        }
    })();
    const valid = !validationMessage;
    const seating = valid
        ? layoutChairs(c, geometry(c).stageY)
        : null;
    const configurationKey = JSON.stringify(c);
    const needsPartialConfirmation = Boolean(seating && seating.missingCount > 0);
    const partialConfirmed = confirmedPartial === configurationKey;
    const assemblyUnits = valid ? assemblyGeometry(c) : [];
    const selectedUnit = assemblyUnits.find(unit => unit.id === selectedId);
    useEffect(() => {
        if (!selectedUnit) { setSelectedId(null); setAssemblyError(''); return; }
        const t = unitTransform(c, selectedUnit);
        setTransformDraft({ x: String(Number(t.x.toFixed(6))), y: String(Number(t.y.toFixed(6))), rotation: String(t.rotation) });
        setAssemblyError('');
    }, [selectedId, c]);
    function commitTransforms(transforms: Config['objectTransforms']) {
        try {
            const next = { ...c, objectTransforms: transforms };
            validate(next);
            setC(next);
            setAssemblyError(''); setError('');
            setNotice('Montagem atualizada. Gere novamente o script para exportar os ajustes.');
        } catch (e) { setAssemblyError(e instanceof Error ? e.message : 'Não foi possível aplicar o ajuste.'); }
    }
    function previewDrag(preview: DragPreview | null) {
        setDragPreview(preview);
        if (preview) setAssemblyError('');
    }
    function dropObject(id: string, transform: ObjectTransform) {
        if (!assemblyUnits.some(unit => unit.id === id)) return;
        commitTransforms({ ...c.objectTransforms, [id]: transform });
    }
    function applySelectedTransform() {
        if (!selectedUnit) return;
        if (Object.values(transformDraft).some(value => !value.trim())) {
            setAssemblyError('Preencha X, Y e rotação.'); return;
        }
        const transform: ObjectTransform = { x: Number(transformDraft.x), y: Number(transformDraft.y), rotation: Number(transformDraft.rotation) };
        commitTransforms({ ...c.objectTransforms, [selectedUnit.id]: transform });
    }
    function resetSelectedTransform() {
        if (!selectedUnit) return;
        const next = { ...c.objectTransforms }; delete next[selectedUnit.id]; commitTransforms(next);
    }
    const display = c;
    const dirty = output && JSON.stringify(output.config) !== JSON.stringify(c);
    const update = <K extends keyof Config>(key: K, value: Config[K]) => {
        const preservesLayout = ['name', 'target', 'color', 'screenImage', 'screenName'].includes(key) || key.endsWith('Mat');
        setC(prev => ({ ...prev, [key]: value, objectTransforms: preservesLayout ? prev.objectTransforms : {} }));
        setError(''); setAssemblyError('');
        setNotice(!preservesLayout && Object.keys(c.objectTransforms).length ? 'As medidas, quantidades ou distribuição mudaram. Os ajustes individuais foram restaurados para a nova distribuição automática.' : '');
    };
    const build = () => {
        try {
            validate(c);
            layoutChairs(c, geometry(c).stageY);
            const generated = generate(c, {
                confirmedPartial: confirmedPartial ?? undefined,
            });
            const code = generated;
            setOutput({ code, config: { ...c } });
            setTab('code');
            setError('');
            setNotice('Script gerado. Você já pode baixar o arquivo.');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Não foi possível gerar o script.');
        }
    };
    function download() {
        if (!output || dirty)
            return;
        const blob = new Blob([output.code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename(output.config);
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice(output.config.target === 'max' ? 'Arquivo .ms baixado. Execute no 3ds Max.' : 'Arquivo .py baixado. Abra no Blender.');
    }
    function saveProject() {
        try {
            const text = serializeProject(c);
            const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = projectFilename(c);
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setError('');
            setNotice('Projeto salvo em JSON. Guarde esse arquivo para continuar a edição depois.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Não foi possível salvar o projeto.');
            setNotice('');
        }
    }
    async function openProject(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const requestId = ++projectRequest.current;
        const original = JSON.stringify(current.current);
        setOpeningProject(true);
        setError('');
        setNotice('');
        try {
            if (!/\.json$/i.test(file.name) || file.size > MAX_PROJECT_BYTES) {
                throw new Error('Escolha um arquivo .json do Code Buddy de até 4 MB.');
            }
            const loaded = parseProject(await file.text());
            if (requestId !== projectRequest.current) return;
            if (JSON.stringify(current.current) !== original) {
                throw new Error('O projeto foi alterado durante a leitura. Abra o arquivo novamente para carregá-lo.');
            }
            imageRequest.current += 1;
            const previous = current.current;
            projectDrafts.current[previous.projectType] = { ...previous };
            projectDrafts.current[loaded.projectType as ProjectType] = { ...loaded };
            current.current = loaded;
            setSelectedId(null); setAssemblyError('');
            confirmedPartialRef.current = null;
            setConfirmedPartial(null);
            setC(loaded);
            setOutput(null);
            setCopied(false);
            setTab('plan');
            setNotice('Projeto aberto. Confira a planta e gere um novo script quando quiser.');
        } catch (e) {
            if (requestId === projectRequest.current) {
                setError(e instanceof Error ? e.message : 'Não foi possível ler o arquivo de projeto.');
            }
        } finally {
            if (requestId === projectRequest.current) setOpeningProject(false);
        }
    }
    async function handleImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file)
            return;
        if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            setError('Use uma imagem JPG ou PNG de até 2 MB.');
            return;
        }
        const requestId = ++imageRequest.current;
        const requestedType = c.projectType;
        const isCurrent = () => requestId === imageRequest.current && current.current.projectType === requestedType;
        const reader = new FileReader();
        reader.onerror = () => {
            if (isCurrent())
                setError('Não foi possível ler a imagem.');
        };
        reader.onload = () => {
            if (!isCurrent())
                return;
            const data = String(reader.result);
            const image = new Image();
            image.onerror = () => {
                if (isCurrent())
                    setError('O arquivo não contém uma imagem válida.');
            };
            image.onload = () => {
                if (!isCurrent())
                    return;
                setC(prev => ({ ...prev, screenImage: data, screenName: file.name }));
                setError('');
                setNotice('Textura da TV adicionada. Gere o script para incluir a imagem.');
            };
            image.src = data;
        };
        reader.readAsDataURL(file);
    }
    async function copy() {
        if (!output || dirty)
            return;
        try {
            await navigator.clipboard.writeText(output.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            setError('Não foi possível copiar. Use o botão Baixar arquivo.');
        }
    }
    useEffect(() => {
        const context = (document as unknown as {
            modelContext?: {
                registerTool: (tool: unknown, options: unknown) => Promise<void> | void;
            };
        }).modelContext;
        if (!context?.registerTool)
            return;
        const controller = new AbortController();
        try {
            Promise.resolve(context.registerTool({ name: 'generate_stand_script', title: 'Gerar script de cenografia', description: 'Gera o script para Blender ou 3ds Max de acordo com as medidas, materiais e textura visíveis.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false }, execute: (input: unknown) => {
                    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length)
                        throw new Error('Use um objeto vazio.');
                    const cfg = { ...current.current };
                    validate(cfg);
                    layoutChairs(cfg, geometry(cfg).stageY);
                    const generated = generate(cfg, {
                        confirmedPartial: confirmedPartialRef.current ?? undefined,
                    });
                    const code: string = generated;
                    setOutput({ code, config: cfg });
                    setTab('code');
                    return { filename: filename(cfg), code };
                } }, { signal: controller.signal })).catch(() => { });
        }
        catch { }
        return () => controller.abort();
    }, []);
    const availableElements = elements.filter((element) => libraryCatalog.some((item) => item.id === element.key &&
        item.projectTypes.some((type) => type === c.projectType)));
    function changeProjectType(type: ProjectType) {
        if (type === c.projectType)
            return;
        imageRequest.current += 1;
        setSelectedId(null); setAssemblyError('');
        const currentProjectType = c.projectType;
        // Guarda o preenchimento do projeto atual.
        projectDrafts.current[currentProjectType] = { ...c };
        // Recupera o preenchimento do próximo projeto.
        setC({
            ...projectDrafts.current[type],
            // Mantém o programa de destino selecionado.
            target: c.target,
        });
        setOutput(null);
        setTab("plan");
        setError("");
        setNotice("");
        setCopied(false);
    }
    return <div className="app-shell">
    <header className="topbar"><a href="/" className="brand"><span className="brand-mark"><Box size={24}/></span><span>code<span className="brand-light">buddy</span><small>CENOGRAFIA</small></span></a><div className="topbar-right"><span className="version">V3 · Blender + Max</span><span className="group-name">GRUPO <b>TV1</b></span></div></header>
    <main><div className="page-heading"><div><div className="eyebrow">SEU ESTÚDIO DE CENOGRAFIA</div><h1>Da ideia ao primeiro projeto<span>.</span></h1><p>Defina as medidas. Escolha os elementos. Leve para o Blender ou 3ds Max.</p></div><div className="format"><Code2 size={20}/><span>SAÍDA DO PROJETO<strong>{c.target === 'max' ? 'MaxScript para 3ds Max' : 'Python para Blender'}</strong></span></div></div>
    <div className="workspace"><section className="config-panel" aria-label="Configuração do projeto"><div className="section-title"><span className="step">01</span><h2>Configure seu projeto</h2></div>
      <div className="project-file-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <button type="button" className="generate-button" onClick={saveProject} disabled={openingProject} style={{ flex: 1 }}>Salvar projeto JSON</button>
        <button type="button" className="generate-button" onClick={() => projectInput.current?.click()} disabled={openingProject} style={{ flex: 1 }}>{openingProject ? 'Abrindo projeto…' : 'Abrir projeto JSON'}</button>
        <input ref={projectInput} type="file" accept=".json,application/json" aria-label="Arquivo de projeto Code Buddy" onChange={openProject} hidden />
      </div>
      <p className="tab-help">O JSON guarda este projeto para editar depois, incluindo a imagem da tela. Abrir um arquivo substitui o projeto exibido; salve o atual antes, se quiser guardá-lo.</p>
      <div className="field engine-label">
        <span>Tipo de projeto</span>
        <Select value={c.projectType} onValueChange={(value) => changeProjectType(value as ProjectType)}>
          <SelectTrigger aria-label="Tipo de projeto" className="full-select"><SelectValue /></SelectTrigger>
          <SelectContent>{projectTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <label className="field engine-label"><span>Gerar para</span><Select value={c.target} onValueChange={v => update('target', v as Target)}><SelectTrigger aria-label="Programa de destino" className="full-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blender">Blender · Python (.py)</SelectItem><SelectItem value="max">3ds Max · MaxScript (.ms)</SelectItem></SelectContent></Select></label>
      <Tabs defaultValue="stand" className="config-tabs"><TabsList className="config-tabs-list"><TabsTrigger value="stand">Projeto</TabsTrigger><TabsTrigger value="params">Parâmetros</TabsTrigger><TabsTrigger value="materials">Materiais</TabsTrigger></TabsList><TabsContent value="stand">
      <label className="field">Nome do projeto<input value={c.name} maxLength={80} onChange={e => update('name', e.target.value)} placeholder="Ex.: Stand KitKat"/></label>
      <p className="tab-help">{c.projectType === 'palco' ? 'Informe a área disponível e a altura de montagem. Ajuste as medidas da plataforma na aba Parâmetros.' : 'Informe as medidas do stand. A altura também define as paredes e os trilhos de iluminação.'}</p>
      <div className="dimensions">{([{ key: 'width', label: 'Largura', min: 3, max: 30 }, { key: 'depth', label: 'Profundidade', min: 3, max: 30 }, { key: 'height', label: 'Altura', min: 2, max: 8 }] as const).map(f => <label className="field" key={f.key}>{f.label}<div className="unit-input"><input type="number" inputMode="decimal" min={f.min} max={f.max} step="0.1" value={Number.isNaN(c[f.key]) ? '' : c[f.key]} onChange={e => update(f.key, e.target.value === '' ? NaN : Number(e.target.value))}/><span>m</span></div></label>)}</div>
      <div className="area-summary"><Ruler size={16}/><span>Área de montagem</span><strong>{valid ? num(c.width * c.depth) : '—'} <small>m²</small></strong></div>
      {c.projectType === 'stand' && <>
        <div className="subheading"><h3>Paredes</h3><span>A frente fica aberta</span></div>
      <div className="wall-options">{([{ key: 'left', label: 'Esquerda' }, { key: 'back', label: 'Fundo' }, { key: 'right', label: 'Direita' }] as const).map(f => <label className={'wall-choice ' + (c[f.key] ? 'chosen' : '')} key={f.key}><Checkbox checked={c[f.key]} onCheckedChange={v => update(f.key, v === true)} aria-label={`Parede ${f.label.toLowerCase()}`}/>{f.label}</label>)}</div>
      </>}
      <div className="subheading elements-heading"><h3>Elementos</h3><span>Selecione o que entra</span></div>
      <div className="element-list">{availableElements.map(f => <label className={'element ' + (c[f.key] ? 'selected' : '')} key={f.key}><span className="element-icon"><f.icon size={19}/></span><span className="element-text"><strong>{f.title}</strong><small>{f.text}</small></span><Checkbox checked={c[f.key]} disabled={c.projectType === 'palco' && f.key === 'stage'} onCheckedChange={v => update(f.key, v === true)} aria-label={f.title}/></label>)}</div>
      <div className="color-row"><label htmlFor="brand-color">Cor de destaque<small>Aplicada ao LED e aos elementos</small></label><div className="color-control"><input id="brand-color" type="color" value={c.color} onChange={e => update('color', e.target.value)}/><span>{c.color.toUpperCase()}</span></div></div>
      </TabsContent><TabsContent value="params">
      <p className="tab-help">Medidas em metros. Os elementos seguem uma distribuição automática na planta.</p>
      {seating && c.chairs && (<p className="tab-help">
    {c.chairGenerationMode === 'fill' ? (<>
        A configuração comporta {seating.capacity} cadeiras.{" "}
        A planta mostra {seating.generatedCount} cadeiras em {seating.rows} filas.
      </>) : (<>
        Público previsto: {seating.attendeeCount} pessoas.{" "}
        Reserva solicitada: {seating.extraRequestedCount} cadeiras.{" "}
        Total solicitado: {seating.requestedCount} cadeiras.{" "}
        A planta mostra {seating.generatedCount} cadeiras em {seating.rows} filas.
        <br />
        A soma de pessoas e cadeiras extras deve ser de até 1.000.
      </>)}
  </p>)}
      {availableElements.filter(f => c[f.key]).map(f => <div className="parameter-section" key={f.key}><h3><f.icon size={16}/>{f.title}</h3>{f.key === 'chairs' && (<div className="field">
    <label htmlFor="chair-generation-mode">Como deseja gerar a plateia?</label>
    <Select value={c.chairGenerationMode} onValueChange={value => {
                    if (value === 'quantity' || value === 'fill') {
                        update('chairGenerationMode', value);
                    }
                }}>
      <SelectTrigger id="chair-generation-mode" className="full-select">
        <SelectValue placeholder="Selecione o modo"/>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="quantity">Informar pessoas e cadeiras extras</SelectItem>
        <SelectItem value="fill">Preencher o espaço disponível</SelectItem>
      </SelectContent>
    </Select>
    <p className="tab-help">
      {c.chairGenerationMode === 'fill'
                    ? 'Gera todas as cadeiras que cabem na configuração, respeitando os corredores, os espaçamentos e o máximo por fila. Limite de 1.000 cadeiras.'
                    : 'Calcula as cadeiras necessárias para o público previsto e a reserva solicitada.'}
    </p>
    <label htmlFor="chair-distribution">Distribuição da plateia</label>
    <Select value={c.chairDistribution} onValueChange={value => {
                    if (value === 'central' || value === 'lateral') {
                        update('chairDistribution', value);
                    }
                }}>
      <SelectTrigger id="chair-distribution" className="full-select">
        <SelectValue placeholder="Selecione a distribuição"/>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="central">Corredor central — dois blocos</SelectItem>
        <SelectItem value="lateral">Corredores laterais — bloco central</SelectItem>
      </SelectContent>
    </Select>
    <small>
      {c.chairDistribution === 'lateral'
                    ? 'Um corredor de cada lado, além das margens laterais.'
                    : 'Um corredor entre os dois blocos de cadeiras.'}
    </small>
  </div>)}{f.key === 'stools' && (<div className="field">
    <label htmlFor="stool-distribution">Distribuição das banquetas</label>
    <Select value={c.stoolDistribution} onValueChange={value => {
                    if (value !== 'free' && value !== 'bistro')
                        return;
                    setC(prev => ({ ...prev, stoolDistribution: value,
                        bistroTables: value === 'bistro' ? true : prev.bistroTables }));
                    setError('');
                    setNotice('');
                }}>
      <SelectTrigger id="stool-distribution" className="full-select"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="free">Avulsas</SelectItem>
        <SelectItem value="bistro">Ao redor dos bistrôs</SelectItem>
      </SelectContent>
    </Select>
    <p className="tab-help">
      {c.stoolDistribution === 'bistro'
                    ? <>Total calculado: {c.bistroTableCount} bistrôs × {c.stoolsPerBistro} banquetas = {c.bistroTableCount * c.stoolsPerBistro}. O espaço da mesa e dos assentos é reservado em conjunto. Limite de 100 banquetas.</>
                    : 'As banquetas são distribuídas nas posições livres depois das mesas.'}
    </p>
  </div>)} {(f.key === 'roundTables' || f.key === 'rectTables') && (<div className="field">
    <label className="element">
      <span>Adicionar cadeiras ao redor</span>
      <Checkbox checked={f.key === 'roundTables' ? c.roundTableChairs : c.rectTableChairs} onCheckedChange={v => update(f.key === 'roundTables' ? 'roundTableChairs' : 'rectTableChairs', v === true)} aria-label={f.key === 'roundTables' ? 'Cadeiras nas mesas redondas' : 'Cadeiras nas mesas retangulares'}/>
    </label>
    {(f.key === 'roundTables' ? c.roundTableChairs : c.rectTableChairs) && (<p className="tab-help">
        Total: {f.key === 'roundTables' ? c.roundTableCount * c.roundTableChairsPerTable : c.rectTableCount * c.rectTableChairsPerTable} cadeiras, separadas da plateia.
        As medidas das cadeiras são compartilhadas entre mesas redondas e retangulares.
        {f.key === 'rectTables' && ' As cadeiras ficam nos dois lados paralelos à largura da mesa.'}
      </p>)}
  </div>)} {f.key === 'coffeeTables' && (<div className="field">
    <label htmlFor="lounge-mode">Distribuição do lounge</label>
    <Select value={c.loungeMode} onValueChange={value => {
                    if (value !== 'free' && value !== 'set')
                        return;
                    setC(prev => ({ ...prev, loungeMode: value,
                        armchairs: value === 'set' && prev.loungeArmchairsPerTable > 0 ? true : prev.armchairs,
                        puffs: value === 'set' && prev.loungePuffsPerTable > 0 ? true : prev.puffs }));
                    setError('');
                    setNotice('');
                }}>
      <SelectTrigger id="lounge-mode" className="full-select"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="free">Móveis avulsos</SelectItem><SelectItem value="set">Conjunto de lounge</SelectItem></SelectContent>
    </Select>
    <p className="tab-help">{c.loungeMode === 'set'
                    ? <>Cada mesa de centro forma um conjunto com até 4 assentos. Total: {c.coffeeTableCount} mesas, {c.armchairs ? c.coffeeTableCount * c.loungeArmchairsPerTable : 0} poltronas e {c.puffs ? c.coffeeTableCount * c.loungePuffsPerTable : 0} puffs. Limite de 100 unidades de cada tipo de assento.</>
                    : 'Mesas de centro, poltronas e puffs ocupam posições livres de forma independente.'}</p>
  </div>)} <div className="param-grid">{parameterFields[f.key].filter(field => {
                if (field.key.startsWith('lounge') && c.loungeMode !== 'set')
                    return false;
                if (field.key === 'coffeeTableGap' && c.loungeMode === 'set')
                    return false;
                if ((field.key === 'armchairCount' || field.key === 'armchairGap' || field.key === 'puffCount' || field.key === 'puffGap') && c.loungeMode === 'set')
                    return false;
                if (f.key === 'roundTables' && (field.key === 'roundTableChairsPerTable' || field.key.startsWith('tableChair')) && !c.roundTableChairs)
                    return false;
                if (f.key === 'rectTables' && (field.key === 'rectTableChairsPerTable' || field.key.startsWith('tableChair')) && !c.rectTableChairs)
                    return false;
                if (field.key === 'stoolCount' && c.stoolDistribution === 'bistro')
                    return false;
                if ((field.key === 'stoolsPerBistro' || field.key === 'stoolBistroGap') && c.stoolDistribution !== 'bistro')
                    return false;
                const isQuantityField = field.key === 'attendeeCount' || field.key === 'chairExtraCount';
                return c.chairGenerationMode !== 'fill' || !isQuantityField;
            }).map(field => <label className="field" key={field.key}>{field.key === 'coffeeTableCount' && c.loungeMode === 'set' ? 'Quantidade de conjuntos' : field.label}<div className="unit-input"><input type="number" inputMode={field.unit === 'un' ? 'numeric' : 'decimal'} min={field.min ?? .1} max={field.max ?? 30} step={field.step ?? (field.unit === 'un' ? 1 : field.key === "showcaseGlassThickness" ? .001 : field.key === "roundTableTopThickness" || field.key === "rectTableTopThickness" || field.key === "bistroTableTopThickness" || field.key === "coffeeTableTopThickness" || field.key === "stoolSeatThickness" || field.key === "stoolBistroGap" ? 0.01 : 0.05)} value={Number.isNaN(c[field.key]) ? '' : c[field.key] as number} onChange={e => update(field.key, e.target.value === '' ? NaN : Number(e.target.value))}/><span>{field.unit ?? 'm'}</span></div></label>)}</div></div>)}
      {!availableElements.some(f => c[f.key]) && <p className="tab-help">Selecione um elemento na aba Projeto para ajustar suas medidas.</p>}
      {c.led && <div className="texture-section"><h3>Textura da TV / LED</h3><p>Escolha a arte que vai aparecer na tela. A imagem inteira é ajustada às medidas do LED.</p><label className="upload-label" htmlFor="tv-image">Escolher imagem JPG ou PNG<input id="tv-image" type="file" accept="image/png,image/jpeg" onChange={handleImage}/></label><small>Até 2 MB · incorporada ao script · imagem estática</small>{c.screenImage ? <div className="texture-preview"><img src={c.screenImage} alt="Arte selecionada para a tela de TV"/><span>{c.screenName}</span><button onClick={() => { imageRequest.current += 1; setC(prev => ({ ...prev, screenImage: '', screenName: '' })); setNotice('Imagem removida.'); }}>Remover imagem</button></div> : <p className="tab-help">Sem imagem, a tela usa a cor de destaque.</p>}</div>}
      </TabsContent><TabsContent value="materials"><p className="tab-help">Escolha o acabamento de cada parte. Madeira e concreto usam textura procedural; metal e vidro recebem propriedades de superfície.</p><div className="material-fields">{materialFields.filter((field) => {
            if (field.key === 'wallMat')
                return c.back || c.left || c.right;
            return !field.enabled || c[field.enabled];
        }).map(f => <div className="field material-field" key={f.key}><label htmlFor={'mat-' + f.key}>{f.label}</label><Select value={c[f.key]} onValueChange={v => update(f.key, v as MaterialKind)}><SelectTrigger id={'mat-' + f.key} className="full-select"><SelectValue /></SelectTrigger><SelectContent>{materials.map(m => <SelectItem key={m.value} value={m.value}><span className="material-dot" style={{ background: m.value === 'brand' ? c.color : m.color }}/>{m.label}</SelectItem>)}</SelectContent></Select></div>)}</div></TabsContent></Tabs>
        {seating && c.chairs && (<div className="parameter-section">
    <h3>Distribuição da plateia</h3>

    <p className="tab-help">
      Modo: {c.chairGenerationMode === 'fill' ? 'Preencher o espaço disponível' : 'Por quantidade'}
      <br />
      {c.chairGenerationMode === 'quantity' && (<>
          Pessoas previstas: {seating.attendeeCount}<br />
          Cadeiras extras solicitadas: {seating.extraRequestedCount}<br />
          Total de cadeiras solicitadas: {seating.requestedCount}<br />
          Pessoas sem assento: {seating.unseatedCount}<br />
          Cadeiras extras disponíveis: {seating.extraGeneratedCount}<br />
          Cadeiras extras não atendidas: {seating.extraMissingCount}<br />
        </>)}
      Capacidade geométrica nesta configuração: {seating.capacity}<br />
      Cadeiras na planta: {seating.generatedCount}<br />
      Filas utilizadas: {seating.rows}<br />
      Máximo de cadeiras por fila: {seating.columns}
    </p>

    {needsPartialConfirmation && (<>
        <p className="tab-help">
          {seating.unseatedCount > 0 ? (<>Faltam assentos para {seating.unseatedCount} pessoas.{" "}</>) : (<>Todas as pessoas previstas têm assento.{" "}</>)}
          {seating.extraMissingCount > 0 && (<>Não couberam {seating.extraMissingCount} cadeiras extras.{" "}</>)}
          Você pode ajustar os parâmetros ou confirmar a geração parcial.
        </p>

        {partialConfirmed ? (<p className="tab-help" role="status">
            Geração parcial confirmada.
            Clique em Gerar para exportar.
          </p>) : (<button type="button" className="generate-button" onClick={() => {
                        setConfirmedPartial(configurationKey);
                        setError("");
                    }}>
            Confirmar geração de{" "}
            {seating.generatedCount} cadeiras
          </button>)}
      </>)}
  </div>)}

    <button className="generate-button" onClick={build} disabled={!valid ||
            (needsPartialConfirmation &&
                !partialConfirmed)}><Sparkles size={18}/>Gerar {c.target === 'max' ? 'MaxScript' : 'script Blender'}</button><p className="generation-note">Piso, câmera frontal e iluminação incluídos.</p>{error && <p role="alert" className="error">{error}</p>}
    </section>
    <section className="result-panel" aria-label="Visualização e script">
      <div className="config-panel" style={{ marginBottom: 16, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Ajustar montagem</h3>
        <p className="tab-help">Arraste um móvel na planta ou escolha abaixo para ajustar pelos campos. Mesas e seus assentos vinculados se movem juntos. Palco, estrutura e plateia continuam automáticos.</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={snapToGrid} disabled={!!dragPreview} onChange={event => setSnapToGrid(event.target.checked)} />
          Encaixar a cada 10 cm
        </label>
        <p className="tab-help">Arraste e solte para aplicar. Vermelho indica uma posição inválida; ao soltar, o objeto volta. Pressione Esc para cancelar.</p>
        <label className="field">Objeto ou conjunto
          <select aria-label="Selecionar objeto da montagem" value={selectedId ?? ''} onChange={event => setSelectedId(event.target.value || null)} style={{ width: '100%', padding: 10, marginTop: 8, background: '#0e1524', color: '#edf1fc', border: '1px solid #34405a', borderRadius: 6 }}>
            <option value="">Selecione um objeto</option>
            {assemblyUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.label}{Object.hasOwn(c.objectTransforms, unit.id) ? ' · ajustado' : ''}</option>)}
          </select>
        </label>
        {selectedUnit && <>
          <p className="tab-help">X: esquerda (−) / direita (+). Y: entrada (−) / fundo (+). Posição medida no centro; rotação adicional em relação à distribuição inicial.</p>
          <div className="dimensions">
            {(['x', 'y', 'rotation'] as const).map(key => <label className="field" key={key}>{key === 'rotation' ? 'Rotação (°)' : `${key.toUpperCase()} (m)`}
              <input aria-label={key === 'rotation' ? 'Rotação do objeto' : `Posição ${key.toUpperCase()} do objeto`} type="number" min={key === 'rotation' ? -360 : -30} max={key === 'rotation' ? 360 : 30} step={key === 'rotation' ? 5 : .1} readOnly={!!dragPreview} value={dragPreview?.id === selectedId ? String(Number(dragPreview.transform[key].toFixed(6))) : transformDraft[key]} onChange={event => setTransformDraft(prev => ({ ...prev, [key]: event.target.value }))} />
            </label>)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="generate-button" onClick={applySelectedTransform}>Aplicar ajuste</button>
            <button type="button" className="generate-button" onClick={resetSelectedTransform}>Restaurar objeto</button>
          </div>
        </>}
        {Object.keys(c.objectTransforms).length > 0 && <button type="button" className="generate-button" onClick={() => commitTransforms({})}>Restaurar toda a distribuição</button>}
        <p className="tab-help">Alterar medidas, quantidades ou distribuição restaura os ajustes individuais. Materiais e cores preservam as posições.</p>
        {(dragPreview?.error || assemblyError) && <p role="alert" className="error">{dragPreview?.error || assemblyError}</p>}
      </div>
      <Tabs value={tab} onValueChange={setTab}><div className="result-header"><TabsList className="view-tabs"><TabsTrigger value="plan"><Square size={16}/>Planta</TabsTrigger><TabsTrigger value="code"><Code2 size={17}/>{c.target === 'max' ? 'MaxScript' : 'Script Python'}</TabsTrigger></TabsList><span className="plan-scale">{valid ? `${num(c.width)} × ${num(c.depth)} m` : 'Confira as medidas'}</span></div>
      <TabsContent value="plan"><div className="plan-title"><span>VISTA SUPERIOR</span><small>Planta esquemática · sem perspectiva</small></div><div className="drawing">{valid ? <Plan c={display} selectedId={selectedId} onSelect={setSelectedId} snap={snapToGrid} onDragPreview={previewDrag} onDrop={dropObject}/> : <div className="empty"><Ruler size={32}/><p>{validationMessage}</p></div>}</div><div className="legend">{(c.back || c.left || c.right) && <span><i className="legend-wall"/>Parede</span>}<span><i style={{ background: c.color }}/>Elementos</span><span><i className="legend-light"/>Spots</span></div><div className="model-info"><div><span>ÁREA TOTAL</span><strong>{valid ? num(c.width * c.depth) : '—'} <small>m²</small></strong></div><div><span>ALTURA DE MONTAGEM</span><strong>{valid ? num(c.height) : '—'} <small>m</small></strong></div><div><span>{c.target === 'max' ? 'EXPORTAÇÃO' : 'RENDER'}</span><strong>{c.target === 'max' ? '3ds Max' : 'Cycles'} <small>{c.target === 'max' ? '.ms' : '64 samples'}</small></strong></div></div></TabsContent>
      <TabsContent value="code"><div className="code-toolbar"><span>{output ? filename(output.config) : 'Seu script aparecerá aqui'}</span><div><button onClick={copy} disabled={!output || !!dirty} aria-label="Copiar script">{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copiado' : 'Copiar'}</button><button onClick={download} disabled={!output || !!dirty}><Download size={16}/>Baixar {output?.config.target === 'max' ? '.ms' : '.py'}</button></div></div>{dirty && <div className="stale" role="status">Você alterou o projeto. Clique em “Gerar script” para atualizar o arquivo.</div>}{output ? <pre className="code"><code>{output.code.replace(/data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+/g, '[imagem incorporada — baixe ou copie o script completo]').replace(/local IMAGEM_TV = "[A-Za-z0-9+/=]+"/g, 'local IMAGEM_TV = "[imagem incorporada — baixe ou copie o script completo]"')}</code></pre> : <div className="empty"><Code2 size={38}/><h3>Seu projeto, em código.</h3><p>Escolha os elementos ao lado e clique em<br />“Gerar script”.</p></div>}</TabsContent>
    </Tabs><p className="notice" role="status" aria-live="polite">{notice}</p>
      <div className="blender-guide"><div className="guide-icon"><Box size={22}/></div><div><h3>Como abrir no {c.target === 'max' ? '3ds Max' : 'Blender'}</h3>{c.target === 'max' ? <ol><li><b>1</b>Baixe o arquivo <strong>.ms</strong>.</li><li><b>2</b>Abra o 3ds Max e entre em <strong>Scripting → Run Script</strong>.</li><li><b>3</b>Escolha o arquivo. Use <strong>CB_Camera_Frontal</strong> para visualizar.</li></ol> : <ol><li><b>1</b>Comece com uma cena vazia e entre em <strong>Scripting</strong>.</li><li><b>2</b>Em <strong>Open</strong>, abra o arquivo .py baixado.</li><li><b>3</b>Clique em <strong>Run Script</strong>. Use <strong>F12</strong> para renderizar.</li></ol>}</div></div>
      <div className="scope-note"><span className="step small-step">i</span><p>Esta versão cria um modelo conceitual. Texturas, artes e detalhes de acabamento podem ser ajustados no programa escolhido. A aparência final depende do renderizador.</p></div>
    </section></div><footer><span>CODE BUDDY / CENOGRAFIA</span><span>Uma base para a sua próxima ideia.</span></footer></main>
  </div>;
}
