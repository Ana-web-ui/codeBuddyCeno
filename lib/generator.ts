import { importedModelsDefaults, validateImportedModels } from './imported-models';
import type { ImportedModelsConfig } from './imported-models';
import { blenderImportedModels } from './imported-model-exporters';
import { showcaseDetailDefaults, validateShowcaseDetail } from './showcase';
import type { ShowcaseDetailConfig } from './showcase';
import { buildAssembly, validateAssembly, unitTransform, checkTransforms } from './assembly.js';
import type { AssemblyConfig, AssemblyScene, AssemblyUnit } from './assembly.js';
import { wrapBlenderUnit, wrapMaxUnit } from './assembly-exporters.js';
import { blenderStandardObjects, maxStandardObjects } from './standard-object-exporters';
import { blenderShowcases, maxShowcases } from './showcase-exporters';
import { blenderLounge, maxLounge } from './lounge-exporters';
import { blenderCoffeeTables, maxCoffeeTables } from './coffee-table-exporters';
import { blenderPedestals, maxPedestals } from './pedestal-exporters';
import { generateMax } from './maxscript';
import { exportProjectKey } from './export-project';
import { chairDefaults, layoutChairs, roundTableDefaults, layoutRoundTables, rectTableDefaults, layoutRectTables, bistroTableDefaults, layoutBistroTables, stoolDefaults, layoutStools, validateStoolAssociation, layoutBistroStoolSets, tableChairDefaults, validateTableChairs, layoutTablesWithChairs, pedestalDefaults, layoutPedestals, loungeDefaults, validateLounge, layoutArmchairs, layoutPuffs, coffeeTableDefaults, layoutCoffeeTables, loungeSetDefaults, layoutLoungeSets, showcaseDefaults, layoutShowcases, extraObjectDefaults, layoutExtraObjects } from './library';
import type { ChairConfig, ReservedArea, RoundTableConfig, RectTableConfig, BistroTableConfig, StoolConfig, TableChairConfig, TableChairLayout, PedestalConfig, LoungeConfig, CoffeeTableConfig, LoungeSetConfig, ShowcaseConfig, ExtraObjectsConfig } from './library';
import { blenderChairs, maxChairs } from './chair-exporters';
import { blenderRoundTables, maxRoundTables } from './round-table-exporters';
import { blenderRectTables, maxRectTables, } from './react-table-exporters';
import { blenderBistroTables, maxBistroTables } from './bistro-table-exporters';
import { blenderStools, maxStools } from './stool-exporters';
import { storageDefaults, storageReservedAreas, validateStorage } from './storage';
import { blenderStorage } from './storage-exporters';
import type { StorageConfig } from './storage';
import type { StandLayout, FrontRotation, CornerOpenSide } from './stand-config.js';
import { getStandWalls } from './stand-config.js';
import { activationDefaults } from './activation';
import { activationGeometry } from './activation-geometry';
import { activationGuides, activationPhotoCamera } from './activation-exporters';
import { blenderSampling, maxSampling } from './sampling-exporters';
import { blenderDemoStation, maxDemoStation } from './demo-exporters';
import type { ActivationConfig } from './activation';
import { receptionDefaults, receptionGeometry, validateReception } from './reception.js';
import type { ReceptionConfig } from './reception.js';
import { receptionExport } from './reception-exporters';
import { counterDefaults, validateCounter } from './counter';
import type { CounterConfig } from './counter';
import { blenderCounters } from './counter-exporters';
import { panelDefaults, validatePanel } from './panel';
import { shelvingDefaults, validateShelving } from './shelving';
import type { ShelvingConfig } from './shelving';
import { blenderShelving, maxShelving } from './shelving-exporters';
import { blenderPanels, maxPanels } from './panel-exporters';
import type { PanelConfig } from './panel';
import { brandingDefaults, validateBranding } from './branding';
import type { BrandingConfig } from './branding';
export type MaterialKind = 'white' | 'brand' | 'wood' | 'metal' | 'glass' | 'concrete' | 'plastic';
export type ProjectType = 'stand' | 'palco' | 'lounge'| 'activation' | 'reception';
export type Target = 'blender' | 'max';
export const materials: {
    value: MaterialKind;
    label: string;
    color: string;
}[] = [
    { value: 'white', label: 'Pintura branca', color: '#c8cedb' }, { value: 'brand', label: 'Cor de destaque', color: '#5268ff' },
    { value: 'wood', label: 'Madeira', color: '#a87542' }, { value: 'metal', label: 'Metal', color: '#8d99a8' },
    { value: 'glass', label: 'Vidro', color: '#81bfce' }, { value: 'concrete', label: 'Concreto', color: '#747b86' },
    { value: 'plastic', label: 'Plástico', color: '#c4d1e1' }
];
export type Config = ImportedModelsConfig & BrandingConfig &  ShowcaseDetailConfig & ShelvingConfig & PanelConfig & CounterConfig & ReceptionConfig & ActivationConfig & StorageConfig & AssemblyConfig & ChairConfig & RoundTableConfig & RectTableConfig & BistroTableConfig & StoolConfig & TableChairConfig & PedestalConfig & LoungeConfig & CoffeeTableConfig & LoungeSetConfig & ShowcaseConfig & ExtraObjectsConfig & {
    projectType: ProjectType;
    standLayout: StandLayout;
    frontRotation: FrontRotation;
    cornerOpenSide: CornerOpenSide;
    name: string;
    width: number;
    depth: number;
    height: number;
    color: string;
    target: Target;
    back: boolean;
    left: boolean;
    right: boolean;
    led: boolean;
    counter: boolean;
    stage: boolean;
    totem: boolean;
    spots: boolean;
    ledWidth: number;
    ledHeight: number;
    ledBottom: number;
    counterWidth: number;
    counterDepth: number;
    counterHeight: number;
    counterCount: number;
    stageWidth: number;
    stageDepth: number;
    stageHeight: number;
    totemWidth: number;
    totemDepth: number;
    totemHeight: number;
    totemCount: number;
    spotsCount: number;
    roundTables: boolean;
    floorMat: MaterialKind;
    wallMat: MaterialKind;
    counterMat: MaterialKind;
    stageMat: MaterialKind;
    totemMat: MaterialKind;
    screenImage: string;
    screenName: string;
};
export const defaults: Config = {
    ...importedModelsDefaults,
    standLayout: 'custom',
    frontRotation: 0,
    cornerOpenSide: 'right',
    objectTransforms: {},
    ...brandingDefaults,
    ...panelDefaults,
    ...showcaseDetailDefaults,
    ...shelvingDefaults,
    ...counterDefaults,
    ...receptionDefaults,
    ...activationDefaults,
    ...storageDefaults,
    ...chairDefaults,
    ...roundTableDefaults,
    ...rectTableDefaults,
    ...bistroTableDefaults,
    ...stoolDefaults,
    ...tableChairDefaults,
    ...pedestalDefaults,
    ...loungeDefaults,
    ...coffeeTableDefaults,
    ...loungeSetDefaults,
    ...showcaseDefaults,
    ...extraObjectDefaults,
    name: 'Meu primeiro stand', width: 10, depth: 5, height: 3.5, color: '#5268ff', target: 'blender', back: true, left: false, right: false, led: true, counter: true, stage: false, totem: false, spots: true,
    ledWidth: 4, ledHeight: 2, ledBottom: .65, counterWidth: 2, counterDepth: .65, counterHeight: 1, counterCount: 1,
    stageWidth: 4.5, stageDepth: 1.4, stageHeight: .3, totemWidth: .55, totemDepth: .25, totemHeight: 1.8, totemCount: 1, spotsCount: 3,
    floorMat: 'white', wallMat: 'white', counterMat: 'brand', stageMat: 'metal', totemMat: 'brand', screenImage: '', screenName: '',
    projectType: 'stand'
};
export function geometry(c: Config) {
    const reception = receptionGeometry(c);
    return {
        ledW: c.ledWidth,
        ledH: c.ledHeight,
        ledZ: 0.1 + c.ledBottom + c.ledHeight / 2,
        counterW: c.counterWidth,
        stageW: c.stageWidth,
        stageD: c.stageDepth,
        stageY: c.projectType === "palco"
            ? c.depth / 2 - 0.7 - c.stageDepth / 2
            : c.depth * 0.18,
               counterY: reception
            ? c.receptionRowY
            : -c.depth * 0.28,

        counterXs: reception
            ? reception.counters.map(counter => counter.x)
            : Array.from(
                {
                    length: Math.min(
                        6,
                        Math.max(0, c.counterCount || 0),
                    ),
                },
                (_, i) =>
                    (i - (c.counterCount - 1) / 2) *
                    (c.counterWidth + 0.4),
            ),
        totemXs: Array.from({ length: Math.min(6, Math.max(0, c.totemCount || 0)) }, (_, i) => (i - (c.totemCount - 1) / 2) *
            (c.totemWidth + 0.5)),
        totemY: -c.depth * 0.07,
        spotYs: Array.from({ length: Math.min(10, Math.max(0, c.spotsCount || 0)) }, (_, i) => c.spotsCount === 1
            ? 0
            : -c.depth * 0.27 +
                i * (c.depth * 0.54 / (c.spotsCount - 1))),
    };
}
/**
 * Calcula as posições das mesas usando as áreas
 * ocupadas pelos elementos existentes.
 */
function tableReservedAreas(
    c: Config,
    includeStorage = true,
): ReservedArea[] {    const g = geometry(c);
    const reserved: ReservedArea[] = [];
    function reserve(centerX: number, centerY: number, width: number, depth: number, clearance = 0.1) {
        reserved.push({
            centerX,
            centerY,
            width: width + 2 * clearance,
            depth: depth + 2 * clearance,
        });
    }
    // Reserva uma faixa nas bordas da área.
    const edgeMargin = 0.2;
    reserve(-c.width / 2 + edgeMargin / 2, 0, edgeMargin, c.depth, 0);
    reserve(c.width / 2 - edgeMargin / 2, 0, edgeMargin, c.depth, 0);
    reserve(0, -c.depth / 2 + edgeMargin / 2, c.width, edgeMargin, 0);
    reserve(0, c.depth / 2 - edgeMargin / 2, c.width, edgeMargin, 0);
    if (c.stage) {
        reserve(0, g.stageY, c.stageWidth, c.stageDepth);
    }
    if (c.counter) {
        for (const x of g.counterXs) {
            reserve(x, g.counterY, c.counterWidth + 0.08, c.counterDepth + 0.08);
        }
    }
    if (c.totem) {
        for (const x of g.totemXs) {
            reserve(x, g.totemY, c.totemWidth + 0.15, c.totemDepth + 0.2);
        }
    }
    if (c.led) {
        const ledY = c.depth / 2 - 0.35;
        // Projeção da moldura e da tela.
        reserve(0, ledY, c.ledWidth + 0.12, 0.2);
        // Bases dos suportes, quando não há parede de fundo.
        if (!c.back) {
            for (const sign of [-1, 1]) {
                reserve(sign * c.ledWidth * 0.4, ledY, 0.45, 0.5);
            }
        }
    }
    if (c.spots) {
        // Postes de sustentação no fundo da área.
        for (const sign of [-1, 1]) {
            reserve(sign * (c.width / 2 - 0.35), c.depth / 2 - 0.35, 0.07, 0.07);
        }
    }
    if (c.chairs) {
        const seating = layoutChairs(c, g.stageY);
        if (seating.generatedCount > 0) {
            const stageFront = g.stageY - c.stageDepth / 2;
            const entranceY = -c.depth / 2;
            // Protege toda a zona entre a entrada e o palco:
            // cadeiras, corredores e afastamento do palco.
            reserve(0, (entranceY + stageFront) / 2, c.width, stageFront - entranceY, 0);
        }
    }

    if (includeStorage) {
    reserved.push(...storageReservedAreas(c));

    }
    return reserved;
}

export function findStoragePosition(
    c: Config,
): { storageX: number; storageY: number } {
    if (c.projectType !== 'stand') {
        throw new Error(
            'O depósito está disponível somente para estandes.',
        );
    }

    const margin = 0.2;

    const minX =
        -c.width / 2 + margin + c.storageWidth / 2;
    const maxX =
        c.width / 2 - margin - c.storageWidth / 2;

    const minY =
        -c.depth / 2 + margin + c.storageDepth / 2;
    const maxY =
        c.depth / 2 - margin - c.storageDepth / 2;

    if (minX > maxX || minY > maxY) {
        throw new Error(
            'O depósito não cabe na área do estande.',
        );
    }

    const occupied = tableReservedAreas(c, false);

    function candidate(
        x: number,
        y: number,
    ): { storageX: number; storageY: number } | null {
        const next: Config = {
            ...c,
            projectType: 'stand',
            storageEnabled: true,
            storageX: Number(x.toFixed(6)),
            storageY: Number(y.toFixed(6)),
        };

        try {
            validateStorage(next, occupied);

            return {
                storageX: next.storageX,
                storageY: next.storageY,
            };
        } catch {
            return null;
        }
    }

    // Prefere a lateral fechada quando apenas uma está fechada.
    const preferLeft = c.left && !c.right;

    const firstX = preferLeft ? minX : maxX;
    const secondX = preferLeft ? maxX : minX;

    // Primeiro verifica os dois cantos do fundo.
    for (const x of [firstX, secondX]) {
        const position = candidate(x, maxY);
        if (position) return position;
    }

    // Depois procura em uma grade de 10 cm, do fundo para a frente.
    const columns = Math.ceil((maxX - minX) / 0.1);
    const rows = Math.ceil((maxY - minY) / 0.1);

    for (let row = 0; row <= rows; row++) {
        const y = Math.max(minY, maxY - row * 0.1);

        for (let column = 0; column <= columns; column++) {
            const x = preferLeft
                ? Math.min(maxX, minX + column * 0.1)
                : Math.max(minX, maxX - column * 0.1);

            const position = candidate(x, y);
            if (position) return position;
        }
    }

    throw new Error(
        'Não encontrei espaço para o depósito e o acesso da porta. Reduza suas medidas ou ajuste os elementos fixos.',
    );
}

/** Distribui redondas, retangulares e bistrôs, nesta ordem. */
export function tableGeometry(c: Config) {
    validateStoolAssociation(c);
    validateTableChairs(c);
    const grouped = c.stools && c.stoolDistribution === 'bistro';
    const roundSeated = c.roundTables && c.roundTableChairs;
    const rectSeated = c.rectTables && c.rectTableChairs;
    const roundGap = Math.max(c.roundTableGap, roundSeated ? c.tableChairGap : 0);
    const rectGap = Math.max(c.rectTableGap, rectSeated ? c.tableChairGap : 0);
    const bistroGap = Math.max(c.bistroTableGap, grouped ? c.stoolGap : 0);
    const reserved = tableReservedAreas(c);
    const emptyChairs = (): TableChairLayout => ({ positions: [], rotations: [], rows: 0, generatedCount: 0 });
    function reserveObjects(areas: ReservedArea[], positions: [
        number,
        number
    ][], w: number, d: number, gap: number) {
        for (const [x, y] of positions)
            areas.push({ centerX: x, centerY: y, width: w + 2 * gap, depth: d + 2 * gap });
    }
    const roundSet = roundSeated ? layoutTablesWithChairs(c, 'round', reserved) : null;
    const roundTables = roundSet ? roundSet.tables : layoutRoundTables(c, reserved);
    const roundFootprint = roundSet ? roundSet.footprint : { width: c.roundTableDiameter, depth: c.roundTableDiameter };
    const rectReserved = [...reserved];
    if (c.roundTables && c.rectTables)
        reserveObjects(rectReserved, roundTables.positions, roundFootprint.width, roundFootprint.depth, Math.max(roundGap, rectGap));
    const rectSet = rectSeated ? layoutTablesWithChairs(c, 'rect', rectReserved) : null;
    const rectTables = rectSet ? rectSet.tables : layoutRectTables(c, rectReserved);
    const rectFootprint = rectSet ? rectSet.footprint : { width: c.rectTableWidth, depth: c.rectTableDepth };
    const bistroReserved = [...reserved];
    if (c.roundTables && c.bistroTables)
        reserveObjects(bistroReserved, roundTables.positions, roundFootprint.width, roundFootprint.depth, Math.max(roundGap, bistroGap));
    if (c.rectTables && c.bistroTables)
        reserveObjects(bistroReserved, rectTables.positions, rectFootprint.width, rectFootprint.depth, Math.max(rectGap, bistroGap));
    const sets = grouped ? layoutBistroStoolSets(c, bistroReserved) : null;
    const bistroTables = sets ? sets.tables : layoutBistroTables(c, bistroReserved);
    const bistroStools = sets ? sets.stools : { positions: [] as [
            number,
            number
        ][], generatedCount: 0 };
    const roundChairs = roundSet ? roundSet.chairs : emptyChairs();
    const rectChairs = rectSet ? rectSet.chairs : emptyChairs();
    const tableChairs: TableChairLayout = { positions: [...roundChairs.positions, ...rectChairs.positions], rotations: [...roundChairs.rotations, ...rectChairs.rotations], rows: 0, generatedCount: roundChairs.generatedCount + rectChairs.generatedCount };
    return { roundTables, rectTables, bistroTables, bistroStools, tableChairs, roundChairs, rectChairs, roundFootprint, rectFootprint };
}
/** Mantém compatibilidade com a planta e o exportador existentes. */
export function roundTableGeometry(c: Config) {
    return tableGeometry(c).roundTables;
}
export function rectTableGeometry(c: Config) {
    return tableGeometry(c).rectTables;
}
export function bistroTableGeometry(c: Config) {
    return tableGeometry(c).bistroTables;
}
/**
 * Posiciona banquetas avulsas depois dos três tipos de mesa.
 */
export function stoolGeometry(c: Config) {
    if (!c.stools) {
        return {
            positions: [] as [
                number,
                number
            ][],
            generatedCount: 0,
        };
    }
    validateStoolAssociation(c);
    if (c.stoolDistribution === 'bistro')
        return tableGeometry(c).bistroStools;
    const reserved = tableReservedAreas(c);
    const tables = tableGeometry(c);
    if (c.roundTables) {
        const gap = Math.max(c.stoolGap, c.roundTableGap, c.roundTableChairs ? c.tableChairGap : 0);
        for (const [x, y] of tables.roundTables.positions) {
            reserved.push({
                centerX: x,
                centerY: y,
                width: tables.roundFootprint.width + 2 * gap,
                depth: tables.roundFootprint.depth + 2 * gap,
            });
        }
    }
    if (c.rectTables) {
        const gap = Math.max(c.stoolGap, c.rectTableGap, c.rectTableChairs ? c.tableChairGap : 0);
        for (const [x, y] of tables.rectTables.positions) {
            reserved.push({
                centerX: x,
                centerY: y,
                width: tables.rectFootprint.width + 2 * gap,
                depth: tables.rectFootprint.depth + 2 * gap,
            });
        }
    }
    if (c.bistroTables) {
        const gap = Math.max(c.stoolGap, c.bistroTableGap);
        for (const [x, y] of tables.bistroTables.positions) {
            reserved.push({
                centerX: x,
                centerY: y,
                width: c.bistroTableDiameter + 2 * gap,
                depth: c.bistroTableDiameter + 2 * gap,
            });
        }
    }
    return layoutStools(c, reserved);
}
/** Pedestais usam as posições livres depois das mesas e dos assentos. */
function furnitureReservedAreas(c: Config, furnitureGap: number): ReservedArea[] {
    const reserved = tableReservedAreas(c);
    const tables = tableGeometry(c);
    const stools = stoolGeometry(c);
    function reserve(positions: [
        number,
        number
    ][], w: number, d: number, gap: number) {
        for (const [x, y] of positions)
            reserved.push({ centerX: x, centerY: y, width: w + 2 * gap, depth: d + 2 * gap });
    }
    if (c.roundTables)
        reserve(tables.roundTables.positions, tables.roundFootprint.width, tables.roundFootprint.depth, Math.max(furnitureGap, c.roundTableGap, c.roundTableChairs ? c.tableChairGap : 0));
    if (c.rectTables)
        reserve(tables.rectTables.positions, tables.rectFootprint.width, tables.rectFootprint.depth, Math.max(furnitureGap, c.rectTableGap, c.rectTableChairs ? c.tableChairGap : 0));
    if (c.bistroTables) {
        const grouped = c.stools && c.stoolDistribution === 'bistro';
        const diameter = grouped ? c.bistroTableDiameter + 2 * c.stoolBistroGap + 2 * c.stoolSeatDiameter : c.bistroTableDiameter;
        reserve(tables.bistroTables.positions, diameter, diameter, Math.max(furnitureGap, c.bistroTableGap, grouped ? c.stoolGap : 0));
    }
    if (c.stools && c.stoolDistribution === 'free')
        reserve(stools.positions, c.stoolSeatDiameter, c.stoolSeatDiameter, Math.max(furnitureGap, c.stoolGap));
    return reserved;
}
export function pedestalGeometry(c: Config) {
    if (!c.pedestals)
        return { positions: [] as [
                number,
                number
            ][], generatedCount: 0 };
    return layoutPedestals(c, furnitureReservedAreas(c, c.pedestalGap));
}
/** Ordem: mesas e assentos, pedestais, poltronas e puffs. */
/** Reserva todo o conjunto antes de posicionar mesas e assentos associados. */
function loungeSetGeometry(c: Config) {
    const reserved = furnitureReservedAreas(c, c.loungeSetGap);
    const pedestals = pedestalGeometry(c);
    if (c.pedestals)
        for (const [x, y] of pedestals.positions) {
            const gap = Math.max(c.loungeSetGap, c.pedestalGap);
            reserved.push({ centerX: x, centerY: y, width: c.pedestalWidth + 2 * gap, depth: c.pedestalDepth + 2 * gap });
        }
    return layoutLoungeSets(c, reserved);
}
export function loungeGeometry(c: Config) {
    if (c.loungeMode === 'set')
        return loungeSetGeometry(c).lounge;
    if (!c.armchairs && !c.puffs)
        return { armchairs: { positions: [] as [
                    number,
                    number
                ][], generatedCount: 0 }, puffs: { positions: [] as [
                    number,
                    number
                ][], generatedCount: 0 } };
    validateLounge(c);
    const pedestals = pedestalGeometry(c);
    function base(gap: number) {
        const areas = furnitureReservedAreas(c, gap);
        if (c.pedestals)
            for (const [x, y] of pedestals.positions)
                areas.push({
                    centerX: x, centerY: y, width: c.pedestalWidth + 2 * Math.max(gap, c.pedestalGap), depth: c.pedestalDepth + 2 * Math.max(gap, c.pedestalGap)
                });
        return areas;
    }
    const armchairs = layoutArmchairs(c, c.armchairs ? base(c.armchairGap) : []);
    const puffReserved = c.puffs ? base(c.puffGap) : [];
    if (c.armchairs && c.puffs)
        for (const [x, y] of armchairs.positions)
            puffReserved.push({
                centerX: x, centerY: y, width: c.armchairWidth + 2 * Math.max(c.armchairGap, c.puffGap),
                depth: c.armchairDepth + 2 * Math.max(c.armchairGap, c.puffGap)
            });
    const puffs = layoutPuffs(c, puffReserved);
    return { armchairs, puffs };
}
/** Mesas de centro avulsas, posicionadas depois dos móveis existentes. */
export function coffeeTableGeometry(c: Config) {
    if (c.loungeMode === 'set')
        return loungeSetGeometry(c).tables;
    if (!c.coffeeTables)
        return { positions: [] as [
                number,
                number
            ][], generatedCount: 0 };
    const reserved = furnitureReservedAreas(c, c.coffeeTableGap);
    const pedestals = pedestalGeometry(c), lounge = loungeGeometry(c);
    function reserve(positions: [
        number,
        number
    ][], w: number, d: number, gap: number) {
        const spacing = Math.max(c.coffeeTableGap, gap);
        for (const [x, y] of positions)
            reserved.push({ centerX: x, centerY: y, width: w + 2 * spacing, depth: d + 2 * spacing });
    }
    if (c.pedestals)
        reserve(pedestals.positions, c.pedestalWidth, c.pedestalDepth, c.pedestalGap);
    if (c.armchairs)
        reserve(lounge.armchairs.positions, c.armchairWidth, c.armchairDepth, c.armchairGap);
    if (c.puffs)
        reserve(lounge.puffs.positions, c.puffWidth, c.puffDepth, c.puffGap);
    return layoutCoffeeTables(c, reserved);
}
/** Vitrines são distribuídas depois de todos os móveis e conjuntos. */
function showcaseReservedAreas(c: Config, objectGap: number): ReservedArea[] {
    const reserved = furnitureReservedAreas(c, objectGap);
    const pedestals = pedestalGeometry(c), lounge = loungeGeometry(c), coffee = coffeeTableGeometry(c);
    function reserve(x: number, y: number, w: number, d: number, gap: number) {
        const spacing = Math.max(objectGap, gap);
        reserved.push({ centerX: x, centerY: y, width: w + 2 * spacing, depth: d + 2 * spacing });
    }
    if (c.pedestals)
        for (const [x, y] of pedestals.positions)
            reserve(x, y, c.pedestalWidth, c.pedestalDepth, c.pedestalGap);
    if (c.loungeMode === 'set') {
        const arms = c.armchairs ? c.loungeArmchairsPerTable : 0, puffs = c.puffs ? c.loungePuffsPerTable : 0;
        coffee.positions.forEach(([x, y], i) => {
            let halfW = c.coffeeTableWidth / 2, halfD = c.coffeeTableDepth / 2;
            for (const [layout, count, w, d] of [[lounge.armchairs, arms, c.armchairWidth, c.armchairDepth], [lounge.puffs, puffs, c.puffWidth, c.puffDepth]] as const) {
                for (let j = i * count; j < (i + 1) * count; j++) {
                    const [sx, sy] = layout.positions[j], angle = layout.rotations?.[j] ?? 0;
                    const worldW = Math.abs(Math.cos(angle)) * w + Math.abs(Math.sin(angle)) * d;
                    const worldD = Math.abs(Math.sin(angle)) * w + Math.abs(Math.cos(angle)) * d;
                    halfW = Math.max(halfW, Math.abs(sx - x) + worldW / 2);
                    halfD = Math.max(halfD, Math.abs(sy - y) + worldD / 2);
                }
            }
            reserve(x, y, 2 * halfW, 2 * halfD, c.loungeSetGap);
        });
    }
    else {
        if (c.coffeeTables)
            for (const [x, y] of coffee.positions)
                reserve(x, y, c.coffeeTableWidth, c.coffeeTableDepth, c.coffeeTableGap);
        for (const [layout, w, d, gap] of [[lounge.armchairs, c.armchairWidth, c.armchairDepth, c.armchairGap], [lounge.puffs, c.puffWidth, c.puffDepth, c.puffGap]] as const) {
            layout.positions.forEach(([x, y], i) => {
                const a = layout.rotations?.[i] ?? 0;
                reserve(x, y, Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * d, Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * d, gap);
            });
        }
    }
    return reserved;
}
export function showcaseGeometry(c: Config) { if (!c.showcases)
    return { positions: [] as [
            number,
            number
        ][], generatedCount: 0 }; return layoutShowcases(c, showcaseReservedAreas(c, c.showcaseGap)); }
export function extraObjectGeometry(c: Config) {
    if (c.projectType === 'activation') {
        const g = activationGeometry(c)!;
        // Reutiliza as verificações construtivas, sem a distribuição genérica.
        const result = layoutExtraObjects({ ...c, touchCount: 1 }, () => []);
        const role = c.activationModel === 'photo' ? 'backdrops' : 'touchScreens';
        if(c.activationModel !== 'demo' && c.activationModel !== 'sampling') result[role] = { positions: g.baseStations.map(s => [s.x, s.y]), generatedCount: g.stations.length };
        return result;
    }
    return layoutExtraObjects(c, (gap) => {
        const reserved = showcaseReservedAreas(c, gap);
        if (c.showcases) {
            const s = showcaseGeometry(c), space = Math.max(gap, c.showcaseGap);
            for (const [x, y] of s.positions)
                reserved.push({ centerX: x, centerY: y, width: c.showcaseWidth + 2 * space, depth: c.showcaseDepth + 2 * space });
        }
        return reserved;
    });
}
export function validate(c: Config) {
    validateImportedModels(c);
    validateBranding(c);
    validateShowcaseDetail(c);
    validateShelving(c);
    validatePanel(c);
    validateCounter(c);
    if (![0, 90, 180, 270].includes(c.frontRotation))
        throw new Error('A orientação da frente deve ser 0°, 90°, 180° ou 270°.');
    if (!['front', 'corner', 'peninsula', 'island', 'custom'].includes(c.standLayout))
        throw new Error('Selecione uma configuração válida para o estande.');
    if (!['left', 'right'].includes(c.cornerOpenSide))
        throw new Error('Selecione uma lateral aberta válida para a esquina.');
    if (c.projectType === 'stand' && c.standLayout !== 'custom') {
        const walls = getStandWalls(c.standLayout, c.cornerOpenSide, c);
        if (walls.back !== c.back || walls.left !== c.left || walls.right !== c.right)
            throw new Error('As paredes não correspondem ao modelo do estande. Selecione o modelo novamente ou use Personalizado.');
    }
    checkTransforms(c.objectTransforms);
    if (c.loungeMode !== 'free' && c.loungeMode !== 'set')
        throw new Error('Selecione um modo válido para o lounge.');
    if (!c.name.trim() || c.name.length > 80)
        throw new Error('Dê um nome ao projeto, com até 80 caracteres.');
    if (
        !['stand', 'palco', 'lounge', 'activation', 'reception'].includes(
            c.projectType,
        )
    ) {
        throw new Error('Tipo de projeto inválido.');
    }

    if (!['touch','photo','demo','sampling'].includes(c.activationModel)) {
        throw new Error('Modelo de ativação inválido.');
    }
    if (c.projectType === 'palco') {
        if (!c.stage)
            throw new Error('Palco / plenária precisa incluir um palco.');
        if (c.back || c.left || c.right || c.counter || c.totem)
            throw new Error('Nesta versão, paredes, balcões e totens ainda não estão disponíveis em Palco / plenária.');
    }
    if (c.projectType === 'lounge' && [c.back, c.left, c.right, c.stage, c.chairs,
        c.led, c.counter, c.totem, c.spots, c.storageEnabled, c.roundTables,
        c.rectTables, c.shelving, c.backdrops, c.touchScreens, c.cabinets,
        c.openCubes, c.showcases, c.pedestals].some(Boolean)) {
        throw new Error('O projeto Lounge contém elementos que não estão disponíveis neste tipo de projeto.');
    }
    for (const k of ['width', 'depth', 'height'] as const) {
        const min = k === 'height' ? 2 : 3;
        const max = k === 'height' ? 8 : 30;
        if (!Number.isFinite(c[k]) || c[k] < min || c[k] > max)
            throw new Error(k === 'height' ? 'A altura deve estar entre 2 e 8 m.' : 'Largura e profundidade devem estar entre 3 e 30 m.');
    }
    if (!/^#[0-9a-f]{6}$/i.test(c.color))
        throw new Error('Escolha uma cor válida.');
    if (!['blender', 'max'].includes(c.target))
        throw new Error('Escolha Blender ou 3ds Max.');
    for (const k of ['back', 'left', 'right', 'led', 'counter', 'stage', 'totem', 'spots', 'chairs', 'roundTables', 'rectTables', 'bistroTables', 'stools', 'roundTableChairs', 'rectTableChairs', 'pedestals', 'armchairs', 'puffs', 'coffeeTables', 'showcases', 'shelving', 'backdrops', 'touchScreens', 'cabinets', 'openCubes', 'roundRugs'] as const)
        if (typeof c[k] !== 'boolean')
            throw new Error('Seleção de elementos inválida.');
    for (const [key, initial] of Object.entries(defaults))
        if (typeof initial === 'number' && (!Number.isFinite(c[key as keyof Config] as number)))
            throw new Error('Confira os parâmetros dos elementos: todas as medidas e quantidades devem conter números.');
    for (const k of ['showcaseDeckMat', 'showcasePlinthMat', 'showcaseProfileMat', 'shelfShelfMat', 'shelfBackMat', 'shelfBaseMat', 'backdropFrameMat', 'backdropStructureMat', 'backdropBaseMat', 'receptionBarrierMat','receptionBeltMat','receptionSignMat','receptionSignTextMat','counterTopMat','counterBaseMat','samplingCounterMat','samplingSupportMat','samplingSampleMat','demoBenchMat', 'demoProductMat', 'floorMat', 'wallMat', 'counterMat', 'stageMat', 'totemMat', 'roundTableMat', 'rectTableMat', 'bistroTableMat', 'stoolMat', 'pedestalMat', 'armchairMat', 'puffMat', 'coffeeTableMat', 'showcaseBaseMat', 'shelfMat', 'backdropMat', 'touchMat', 'cabinetMat', 'openCubeMat', 'rugMat'] as const)
        if (!materials.some(m => m.value === c[k]))
            throw new Error('Material inválido.');
    const check = (keys: (keyof Config)[], label: string) => {
        for (const k of keys)
            if (typeof c[k] !== 'number' || !Number.isFinite(c[k]) || (c[k] as number) < .1 || (c[k] as number) > 30)
                throw new Error('Confira as medidas de ' + label + ' (mínimo 0,1 m).');
    };
    const count = (value: number, label: string, max: number) => {
        if (!Number.isInteger(value) || value < 1 || value > max)
            throw new Error(label + ': use uma quantidade inteira de 1 a ' + max + '.');
    };
    if (c.stools) {
        validateStoolAssociation(c);
        if (c.stoolDistribution === 'free')
            count(c.stoolCount, 'Banquetas', 100);
        const dimensions = [
            ['stoolSeatDiameter', 0.25, 0.8, 'Diâmetro do assento da banqueta'],
            ['stoolSeatHeight', 0.4, 1, 'Altura do assento da banqueta'],
            ['stoolSeatThickness', 0.02, 0.12, 'Espessura do assento da banqueta'],
            ['stoolGap', 0, 3, 'Vão entre banquetas'],
        ] as const;
        for (const [key, min, max, label] of dimensions) {
            const value = c[key];
            if (!Number.isFinite(value) || value < min || value > max) {
                throw new Error(label + ': use um valor entre ' + min + ' e ' + max + ' m.');
            }
        }
        if (c.stoolSeatHeight > c.height) {
            throw new Error('A banqueta deve caber na altura da montagem.');
        }
        if (c.stoolSeatDiameter > Math.min(c.width, c.depth)) {
            throw new Error('O assento da banqueta deve caber na área de montagem.');
        }
    }
    if (c.bistroTables) {
        count(c.bistroTableCount, 'Mesas bistrô', 100);
        const dimensions = [
            ['bistroTableDiameter', 0.4, 3, 'Diâmetro da mesa bistrô'],
            ['bistroTableHeight', 0.4, 1.2, 'Altura da mesa bistrô'],
            ['bistroTableTopThickness', 0.01, 0.15, 'Espessura do tampo da mesa bistrô'],
            ['bistroTableGap', 0, 5, 'Vão entre mesas bistrô'],
        ] as const;
        for (const [key, min, max, label] of dimensions) {
            const value = c[key];
            if (!Number.isFinite(value) || value < min || value > max) {
                throw new Error(label + ': use um valor entre ' + min + ' e ' + max + ' m.');
            }
        }
        if (c.bistroTableHeight > c.height) {
            throw new Error('A mesa bistrô deve caber na altura da montagem.');
        }
        if (c.bistroTableDiameter > Math.min(c.width, c.depth)) {
            throw new Error('O diâmetro da mesa bistrô deve caber na área de montagem.');
        }
    }
    if (c.led) {
        check(['ledWidth', 'ledHeight'], 'LED');
        if (!Number.isFinite(c.ledBottom) || c.ledBottom < .1 || c.ledBottom > 8)
            throw new Error('A altura da base do LED deve ser de 0,1 a 8 m.');
        if (c.ledWidth + .24 > c.width - .3 || c.ledBottom + c.ledHeight + .06 > c.height)
            throw new Error('O LED deve caber na largura e na altura do stand, incluindo a moldura.');
    }
    if (c.counter) {
        check(['counterWidth', 'counterDepth', 'counterHeight'], 'balcão');
        count(c.counterCount, 'Balcões', 6);
        if (c.counterHeight > c.height)
            throw new Error('O balcão deve ser menor que a altura do stand.');
    }
    if (c.stage) {
        check(['stageWidth', 'stageDepth', 'stageHeight'], 'palco');
        if (c.stageHeight > Math.min(1, c.height))
            throw new Error('A altura do palco deve ser de 0,1 a 1 m.');
    }
    if (c.totem) {
        check(['totemWidth', 'totemDepth', 'totemHeight'], 'totem');
        count(c.totemCount, 'Totens', 6);
        if (c.totemHeight > c.height)
            throw new Error('O totem deve caber na altura do stand.');
    }
    if (c.spots)
        count(c.spotsCount, 'Spots por lado', 10);

        validateReception(c);

    if (c.projectType === 'reception') {
        const unsupported = [
            c.back, c.left, c.right,
            c.led, c.stage, c.totem, c.spots,
            c.chairs, c.storageEnabled,
            c.roundTables, c.rectTables, c.bistroTables, c.stools,
            c.coffeeTables, c.armchairs, c.puffs,
            c.pedestals, c.showcases, c.shelving, c.backdrops,
            c.touchScreens, c.cabinets, c.openCubes, c.roundRugs,
        ].some(Boolean);

        if (unsupported) {
            throw new Error(
                'Nesta etapa, a recepção permite somente os balcões ' +
                'e suas áreas de atendimento e equipe.',
            );
        }

        if (Object.keys(c.objectTransforms).length > 0) {
            throw new Error(
                'Os balcões da recepção ainda usam o ajuste da fileira. ' +
                'Ajustes individuais não estão disponíveis nesta etapa.',
            );
        }
    }
    const g = geometry(c);
    const rects: {
        label: string;
        x: number;
        y: number;
        w: number;
        d: number;
    }[] = [];
    if (c.counter)
        g.counterXs.forEach(x => rects.push({ label: 'balcão', x, y: g.counterY, w: c.counterWidth + .08, d: c.counterDepth + .08 }));
    if (c.totem)
        g.totemXs.forEach(x => rects.push({ label: 'totem', x, y: g.totemY, w: c.totemWidth + .15, d: c.totemDepth + .2 }));
    if (c.stage)
        rects.push({ label: 'palco', x: 0, y: g.stageY, w: c.stageWidth, d: c.stageDepth });
    for (const r of rects)
        if (Math.abs(r.x) + r.w / 2 > c.width / 2 - .2 || Math.abs(r.y) + r.d / 2 > c.depth / 2 - .5)
            throw new Error('As medidas ou quantidades de ' + r.label + ' ultrapassam o espaço disponível. Reduza o tamanho ou a quantidade.');
    for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i], b = rects[j];
            if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 + .1 && Math.abs(a.y - b.y) < (a.d + b.d) / 2 + .1)
                throw new Error('Há sobreposição entre ' + a.label + ' e ' + b.label + '. Reduza suas medidas.');
        }
    if (c.screenImage && (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(c.screenImage) || c.screenImage.length > 2800000))
        throw new Error('Use uma imagem JPG ou PNG de até 2 MB.');
        validateStorage(c, tableReservedAreas(c, false));

    layoutChairs(c, geometry(c).stageY);
    tableGeometry(c);
    layoutChairs(c, geometry(c).stageY);
    tableGeometry(c);
    stoolGeometry(c);
    pedestalGeometry(c);
    loungeGeometry(c);
    coffeeTableGeometry(c);
    showcaseGeometry(c);
    extraObjectGeometry(c);
    if (c.projectType !== 'activation' && Object.keys(c.objectTransforms).length) validateAssembly(c, assemblyGeometry(c), tableReservedAreas(c));
    return c;
}
/** Posições automáticas são a base dos ajustes; não chama validate para evitar recursão. */
export function assemblyScene(c: Config): AssemblyScene {
    const tables = tableGeometry(c), lounge = loungeGeometry(c);
    const demo = c.projectType === 'activation' && (c.activationModel === 'demo' || c.activationModel === 'sampling') ? activationGeometry(c) : null;
    return { roundTables: tables.roundTables, rectTables: tables.rectTables, bistroTables: tables.bistroTables,
        demoStations: { positions: demo?.demo ? demo.baseStations.map(s=>[s.x,s.y]) : [] },
        samplingStations: { positions: demo?.sampling ? demo.baseStations.map(s=>[s.x,s.y]) : [] },
        tableChairs: tables.tableChairs, stools: stoolGeometry(c), pedestals: pedestalGeometry(c),
        armchairs: lounge.armchairs, puffs: lounge.puffs, coffeeTables: coffeeTableGeometry(c),
        showcases: showcaseGeometry(c), ...extraObjectGeometry(c) };
}
export function assemblyGeometry(c: Config): AssemblyUnit[] {
    return buildAssembly(c, assemblyScene(c));
}
function assemblyScript(c: Config): string {
    const scene = assemblyScene(c), units = buildAssembly(c, scene), blender = c.target === 'blender';
    const extraBase = extraObjectGeometry(c);
    const subset = <T extends { positions: [number, number][]; rotations?: number[] }>(layout: T, indices: number[]): T => ({
        ...layout, positions: indices.map(i => layout.positions[i]), rotations: indices.map(i => layout.rotations?.[i] ?? 0),
        generatedCount: indices.length, rows: 0,
    });
    const dining = { ...c, chairs: true, chairWidth: c.tableChairWidth, chairDepth: c.tableChairDepth,
        chairHeight: c.tableChairHeight, chairSeatHeight: c.tableChairSeatHeight };
    return units.map(unit => {
        const roles = [...new Set(unit.members.map(m => m.role))];
        const code = roles.map(role => {
            const indices = unit.members.filter(m => m.role === role).map(m => m.index);
            const layout = subset(scene[role], indices);
            // Os exportadores existentes precisam apenas das posições, rotação e contagem.
            const positions = { ...layout, generatedCount: indices.length, rows: 0 };
            switch (role) {
                case 'samplingStations': return blender ? blenderSampling(c,positions) : maxSampling(c,positions);
                case 'demoStations': return blender ? blenderDemoStation(c,positions) : maxDemoStation(c,positions);
                case 'roundTables': return blender ? blenderRoundTables(c, positions) : maxRoundTables(c, positions);
                case 'rectTables': return blender ? blenderRectTables(c, positions) : maxRectTables(c, positions);
                case 'bistroTables': return blender ? blenderBistroTables(c, positions) : maxBistroTables(c, positions);
                case 'tableChairs': return blender ? blenderChairs(dining, positions, { group: 'tables' }) : maxChairs(dining, positions, { group: 'tables' });
                case 'stools': return blender ? blenderStools(c, positions) : maxStools(c, positions);
                case 'pedestals': return blender ? blenderPedestals(c, positions) : maxPedestals(c, positions);
                case 'coffeeTables': return blender ? blenderCoffeeTables(c, positions) : maxCoffeeTables(c, positions);
                case 'showcases': return blender ? blenderShowcases(c, positions, { grouped: false }) : maxShowcases(c, positions, { grouped: false });
                case 'armchairs': case 'puffs': {
                    const empty = { positions: [] as [number, number][], rotations: [] as number[], generatedCount: 0 };
                    const lounge = { armchairs: empty, puffs: empty, [role]: positions };
                    return blender ? blenderLounge(c, lounge) : maxLounge(c, lounge);
                }
                default: {
                    if (role === 'shelving' && c.shelfDetailed) {
                        return blender ? blenderShelving(c, positions, { grouped: false })
                            : maxShelving(c, positions, { grouped: false });
                    }
                    if (role === 'backdrops' && c.backdropDetailed) {
                        return blender ? blenderPanels(c, positions, { grouped: false })
                            : maxPanels(c, positions, { grouped: false });
                    }
                    const extras = { ...extraBase };
                    for (const id of Object.keys(extras) as (keyof typeof extras)[]) {
                        extras[id] = { ...extras[id], positions: id === role ? positions.positions : [], generatedCount: id === role ? indices.length : 0 };
                    }
                    return blender ? blenderStandardObjects(c, extras) : maxStandardObjects(c, extras);
                }
            }
        }).join('\n');
        const t = unitTransform(c, unit);
        const detailedPanel = unit.id.startsWith('backdrops:') && c.backdropDetailed;
        const detailedShowcase = unit.id.startsWith('showcases:') && c.showcaseDetailed;
        const detailedShelf = unit.id.startsWith('shelving:') && c.shelfDetailed;
        return blender ? wrapBlenderUnit(unit, t, code) : wrapMaxUnit(unit, t, code, {
            group: detailedShowcase || detailedShelf || (detailedPanel && c.projectType !== 'activation'),
            preserveNames: detailedShowcase || detailedPanel || detailedShelf,
        });
    }).join('\n');
}
export function filename(c: Config) { return (c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'stand') + (c.target === 'max' ? '.ms' : '.py'); }
export function generate(c: Config, options: {
    confirmedPartial?: string;
} = {}) {
    validate(c);
    const chairLayout = layoutChairs(c, geometry(c).stageY);
    const tables = tableGeometry(c);
    const stools = stoolGeometry(c);
    const pedestals = pedestalGeometry(c);
    const lounge = loungeGeometry(c);
    const coffeeTables = coffeeTableGeometry(c);
    const showcases = showcaseGeometry(c);
    const extraObjects = extraObjectGeometry(c);
    const diningConfig = {
        ...c, chairs: true,
        chairWidth: c.tableChairWidth, chairDepth: c.tableChairDepth,
        chairHeight: c.tableChairHeight, chairSeatHeight: c.tableChairSeatHeight,
    };
    const configurationKey = JSON.stringify(c);
    if (chairLayout.missingCount > 0 &&
        options.confirmedPartial !== configurationKey) {
        throw new Error(`Você solicitou ${chairLayout.requestedCount} cadeiras, ` +
            `mas cabem ${chairLayout.generatedCount}. ` +
            "Confirme a geração parcial antes de continuar.");
    }
    if (c.projectType === 'activation' || Object.keys(c.objectTransforms).length || (c.projectType === 'lounge' && c.target === 'blender')) {
        const units = assemblyScript(c) + activationPhotoCamera(c) + activationGuides(c);
        if (c.target === 'blender') return generateBlender(c, blenderChairs(c, chairLayout, { group: 'audience' }) + units);
        const script = generateMax(c), marker = 'select criados';
        if (!script.includes(marker)) throw new Error('Não encontrei o ponto de inserção dos objetos no MaxScript.');
        return script.replace(marker, maxChairs(c, chairLayout, { group: 'audience' }) + units + '\n' + marker);
    }
    if (c.target === "blender") {
        return generateBlender(c,
            blenderChairs(c, chairLayout, { group: "audience" }) +
            blenderChairs(diningConfig, tables.tableChairs, { group: "tables" }) +
            blenderRoundTables(c, tables.roundTables) +
            blenderRectTables(c, tables.rectTables) +
            blenderBistroTables(c, tables.bistroTables) +
            blenderStools(c, stools) +
            blenderPedestals(c, pedestals) + blenderLounge(c, lounge) + blenderCoffeeTables(c, coffeeTables) + blenderShowcases(c, showcases) + blenderStandardObjects(c, extraObjects));
    }
    const script = generateMax(c);
    const additions = maxChairs(c, chairLayout, { group: "audience" }) +
        maxChairs(diningConfig, tables.tableChairs, { group: "tables" }) +
        maxRoundTables(c, tables.roundTables) +
        maxRectTables(c, tables.rectTables) +
        maxBistroTables(c, tables.bistroTables) +
        maxStools(c, stools) +
        maxPedestals(c, pedestals) + maxLounge(c, lounge) + maxCoffeeTables(c, coffeeTables) + maxShowcases(c, showcases) + maxStandardObjects(c, extraObjects);
    if (!additions) {
        return script;
    }
    const marker = "select criados";
    if (!script.includes(marker)) {
        throw new Error("Não encontrei o ponto de inserção " +
            "dos objetos no MaxScript.");
    }
    return script.replace(marker, additions + "\n" + marker);
}
export function generateBlender(c: Config, additions = '') {
    validate(c);
    const rgb = [1, 3, 5].map(i => +(parseInt(c.color.slice(i, i + 2), 16) / 255).toFixed(5));
    return `# CODE BUDDY | Cenografia
# Modelo conceitual em metros. Projeto: ${c.name.replace(/[\r\n]/g, ' ')}
# Blender: Scripting > New > cole este código > Run Script.
# Cada execução cria uma nova versão, preservando objetos e materiais anteriores.
# As versões ocupam a mesma posição; oculte as anteriores para comparar ou renderizar.
# LARGURA, PROFUNDIDADE e ALTURA controlam as medidas principais.
import bpy
import math
import base64
import tempfile
import os
import uuid
from mathutils import Vector

LARGURA = ${c.width}
PROFUNDIDADE = ${c.depth}
ALTURA = ${c.height}
COR_MARCA = (${rgb.join(', ')}, 1)
PAREDE_FUNDO = ${c.back ? 'True' : 'False'}
PAREDE_ESQUERDA = ${c.left ? 'True' : 'False'}
PAREDE_DIREITA = ${c.right ? 'True' : 'False'}
ADICIONAR_LED = ${c.led ? 'True' : 'False'}
ADICIONAR_BALCAO = ${c.counter ? 'True' : 'False'}
ADICIONAR_PALCO = ${c.stage ? 'True' : 'False'}
ADICIONAR_TOTEM = ${c.totem ? 'True' : 'False'}
ADICIONAR_SPOTS = ${c.spots ? 'True' : 'False'}

LED_LARGURA = ${c.ledWidth}
LED_ALTURA = ${c.ledHeight}
LED_BASE = ${c.ledBottom}
BALCAO_LARGURA = ${c.counterWidth}
BALCAO_PROFUNDIDADE = ${c.counterDepth}
BALCAO_ALTURA = ${c.counterHeight}
BALCOES = ${c.counterCount}
PALCO_LARGURA = ${c.stageWidth}
PALCO_PROFUNDIDADE = ${c.stageDepth}
PALCO_ALTURA = ${c.stageHeight}
TOTEM_LARGURA = ${c.totemWidth}
TOTEM_PROFUNDIDADE = ${c.totemDepth}
TOTEM_ALTURA = ${c.totemHeight}
TOTENS = ${c.totemCount}
SPOTS_POR_LADO = ${c.spotsCount}
MATERIAL_PISO = '${c.floorMat}'
MATERIAL_PAREDES = '${c.wallMat}'
MATERIAL_BALCAO = '${c.counterMat}'
MATERIAL_PALCO = '${c.stageMat}'
MATERIAL_TOTEM = '${c.totemMat}'
IMAGEM_TV = '${c.led ? c.screenImage : ''}'

PROJETO = ${JSON.stringify(c.name)}
PROJETO_CHAVE = '${exportProjectKey(c.name)}'
colecao = None
materiais_geracao = {}

def preparar():
    global colecao, materiais_geracao
    materiais_geracao = {}
    versoes = [col.get('code_buddy_version', 0) for col in bpy.data.collections
               if col.get('code_buddy_project_key') == PROJETO_CHAVE]
    versao = max((v for v in versoes if isinstance(v, int) and v > 0), default=0) + 1
    nome = 'CB_%s_v%03d' % (PROJETO_CHAVE, versao)
    while bpy.data.collections.get(nome) is not None:
        versao += 1
        nome = 'CB_%s_v%03d' % (PROJETO_CHAVE, versao)
    colecao = bpy.data.collections.new(nome)
    colecao['code_buddy_project'] = PROJETO
    colecao['code_buddy_project_key'] = PROJETO_CHAVE
    colecao['code_buddy_version'] = versao
    colecao['code_buddy_generation'] = uuid.uuid4().hex
    bpy.context.scene.collection.children.link(colecao)
    cena = bpy.context.scene
    cena.unit_settings.system = 'METRIC'
    cena.unit_settings.scale_length = 1.0

def identificar(dado):
    for chave in ('code_buddy_project', 'code_buddy_project_key',
                  'code_buddy_version', 'code_buddy_generation'):
        dado[chave] = colecao[chave]
    return dado

def aplicar_orientacao():
    angulo = ${c.projectType === 'stand' || c.projectType === 'reception' ? c.frontRotation : 0}
    if angulo == 0:
        return
    # Consolida inclusive os guias recém-criados antes de preservar suas matrizes.
    bpy.context.view_layer.update()
    objetos = list(colecao.all_objects)
    conjunto = set(objetos)
    raiz = bpy.data.objects.new(colecao.name + '_Orientacao', None)
    colecao.objects.link(raiz)
    identificar(raiz)
    raiz.empty_display_type = 'PLAIN_AXES'
    raiz.empty_display_size = 1.0
    for objeto in objetos:
        if objeto.parent not in conjunto:
            matriz = objeto.matrix_world.copy()
            objeto.parent = raiz
            objeto.matrix_world = matriz
    raiz.rotation_euler.z = math.radians(angulo)
    bpy.context.view_layer.update()

def finalizar_geracao():
    # Inclui as peças criadas diretamente pelos exportadores da biblioteca V3.
    for objeto in colecao.all_objects:
        identificar(objeto)
    print('Code Buddy: nova versão criada em ' + colecao.name + '. Anteriores preservadas.')

def organizar(objeto):
    for origem in list(objeto.users_collection):
        origem.objects.unlink(objeto)
    colecao.objects.link(objeto)
    return identificar(objeto)

def material(nome, cor, emissao=0):
    # Reutiliza somente nesta execução; nunca redefine materiais de outra versão.
    mat = materiais_geracao.get(nome)
    if mat is None:
        mat = identificar(bpy.data.materials.new(colecao.name + '_' + nome))
        materiais_geracao[nome] = mat
    mat.diffuse_color = cor
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    saida = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(shader.outputs['BSDF'], saida.inputs['Surface'])
    shader.inputs['Base Color'].default_value = cor
    shader.inputs['Roughness'].default_value = 0.45
    entrada = shader.inputs.get('Emission Color')
    if entrada is None:
        entrada = shader.inputs.get('Emission')
    if entrada is not None:
        entrada.default_value = cor
    forca = shader.inputs.get('Emission Strength')
    if forca is not None:
        forca.default_value = emissao
    return mat

def acabamento(tipo):
    cores = {'white': (0.88, 0.88, 0.88, 1), 'brand': COR_MARCA,
             'wood': (0.42, 0.20, 0.075, 1), 'metal': (0.58, 0.62, 0.68, 1),
             'glass': (0.92, 0.97, 1, 1), 'concrete': (0.38, 0.4, 0.43, 1),
             'plastic': (0.78, 0.82, 0.88, 1)}
    mat = material('Acabamento_' + tipo, cores[tipo])
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value = {'metal': .22, 'glass': .04, 'wood': .55, 'concrete': .85, 'plastic': .25}.get(tipo, .45)
    if tipo == 'metal':
        shader.inputs['Metallic'].default_value = 1
    if tipo == 'glass':
        entrada = shader.inputs.get('Transmission Weight')
        if entrada is None:
            entrada = shader.inputs.get('Transmission')
        if entrada is not None:
            entrada.default_value = 1
        shader.inputs['IOR'].default_value = 1.45
    if tipo in ['wood', 'concrete']:
        coord = nodes.new('ShaderNodeTexCoord')
        textura = nodes.new('ShaderNodeTexNoise')
        textura.inputs['Scale'].default_value = 6 if tipo == 'wood' else 35
        textura.inputs['Detail'].default_value = 3
        if tipo == 'wood':
            escala = nodes.new('ShaderNodeVectorMath')
            escala.operation = 'MULTIPLY'
            escala.inputs[1].default_value = (3, 45, 3)
            links.new(coord.outputs['Generated'], escala.inputs[0])
            links.new(escala.outputs['Vector'], textura.inputs['Vector'])
        else:
            links.new(coord.outputs['Generated'], textura.inputs['Vector'])
        rampa = nodes.new('ShaderNodeValToRGB')
        rampa.color_ramp.elements[0].color = (0.12, .045, .015, 1) if tipo == 'wood' else (.27, .28, .3, 1)
        rampa.color_ramp.elements[1].color = (.58, .32, .12, 1) if tipo == 'wood' else (.48, .5, .53, 1)
        links.new(textura.outputs['Fac'], rampa.inputs['Fac'])
        links.new(rampa.outputs['Color'], shader.inputs['Base Color'])
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .15
        bump.inputs['Distance'].default_value = .003
        links.new(textura.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat

def material_tv():
    mat = material('LED', COR_MARCA, 2)
    if not IMAGEM_TV:
        return mat
    mime, dados = IMAGEM_TV.split(',', 1)
    sufixo = '.png' if 'image/png' in mime else '.jpg'
    caminho = None
    try:
        with tempfile.NamedTemporaryFile(suffix=sufixo, delete=False) as arquivo:
            caminho = arquivo.name
            arquivo.write(base64.b64decode(dados))
        imagem = bpy.data.images.load(caminho, check_existing=False)
        imagem.name = colecao.name + '_Textura_TV'
        identificar(imagem)
        imagem.pack()
        textura = mat.node_tree.nodes.new('ShaderNodeTexImage')
        textura.image = imagem
        shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        mat.node_tree.links.new(textura.outputs['Color'], shader.inputs['Base Color'])
        entrada = shader.inputs.get('Emission Color')
        if entrada is None:
            entrada = shader.inputs.get('Emission')
        if entrada is not None:
            mat.node_tree.links.new(textura.outputs['Color'], entrada)
    finally:
        if caminho and os.path.exists(caminho):
            os.remove(caminho)
    return mat

def tela_tv(largura, altura, y, z, mat):
    # Face frontal com UV explícito: a arte aparece inteira e sem espelhamento.
    mesh = bpy.data.meshes.new('CB_Tela_Mesh')
    mesh.from_pydata([(-largura/2, y, z-altura/2), (largura/2, y, z-altura/2),
                     (largura/2, y, z+altura/2), (-largura/2, y, z+altura/2)], [], [(0,1,2,3)])
    mesh.update()
    obj = bpy.data.objects.new('LED_Tela', mesh)
    colecao.objects.link(obj)
    mesh.materials.append(mat)
    uv = mesh.uv_layers.new(name='UVMap')
    for i, valor in enumerate([(0,0), (1,0), (1,1), (0,1)]):
        uv.data[i].uv = valor

def caixa(nome, dimensoes, posicao, mat, arredondar=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=posicao)
    obj = organizar(bpy.context.object)
    obj.name = nome
    obj.dimensions = dimensoes
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if arredondar:
        bevel = obj.modifiers.new('Bordas suaves', 'BEVEL')
        bevel.width = arredondar
        bevel.segments = 3
    return obj

def apontar(objeto, alvo):
    direcao = Vector(alvo) - objeto.location
    objeto.rotation_euler = direcao.to_track_quat('-Z', 'Y').to_euler()

def luz(nome, tipo, posicao, alvo, energia, cor=(1, 1, 1), tamanho=4):
    dados = bpy.data.lights.new(nome, tipo)
    dados.energy = energia
    dados.color = cor
    obj = bpy.data.objects.new(nome, dados)
    colecao.objects.link(obj)
    obj.location = posicao
    apontar(obj, alvo)
    if tipo == 'AREA':
        dados.shape = 'DISK'
        dados.size = tamanho
    if tipo == 'SPOT':
        dados.spot_size = math.radians(65)
        dados.spot_blend = 0.5
        dados.shadow_soft_size = 0.15
    return obj

def criar_estrutura(branco, marca):
    caixa('Piso', (LARGURA, PROFUNDIDADE, 0.1), (0, 0, 0.05), acabamento(MATERIAL_PISO), 0.02)
    if PAREDE_FUNDO:
        caixa('Parede_Fundo', (LARGURA, 0.15, ALTURA), (0, PROFUNDIDADE/2 - 0.075, ALTURA/2 + 0.1), acabamento(MATERIAL_PAREDES))
        caixa('Faixa_Marca', (LARGURA - 0.3, 0.025, 0.22), (0, PROFUNDIDADE/2 - 0.165, ALTURA - 0.15), marca)
    for nome, ativo, sinal in [('Esquerda', PAREDE_ESQUERDA, -1), ('Direita', PAREDE_DIREITA, 1)]:
        if ativo:
            caixa('Parede_' + nome, (0.15, PROFUNDIDADE, ALTURA), (sinal*(LARGURA/2 - 0.075), 0, ALTURA/2 + 0.1), acabamento(MATERIAL_PAREDES))

def criar_elementos(branco, marca, escuro, tela):
    if ADICIONAR_LED:
        largura_led = LED_LARGURA
        altura_led = LED_ALTURA
        y = PROFUNDIDADE/2 - 0.35
        z = 0.1 + LED_BASE + LED_ALTURA/2
        caixa('LED_Moldura', (largura_led + 0.12, 0.12, altura_led + 0.12), (0, y, z), escuro, 0.02)
        tela_tv(largura_led, altura_led, y - 0.075, z, tela)
        if not PAREDE_FUNDO:
            for x in [-largura_led*0.4, largura_led*0.4]:
                suporte_h = z - altura_led/2 - 0.1
                caixa('LED_Suporte', (0.09, 0.09, suporte_h), (x, y, 0.1 + suporte_h/2), escuro)
                caixa('LED_Base', (0.45, 0.5, 0.06), (x, y, 0.13), escuro)
${c.counterDetailed ? blenderCounters(c, geometry(c).counterXs, geometry(c).counterY).split("\n").map(line => "    " + line).join("\n") : `    if ADICIONAR_BALCAO:
        for i in range(BALCOES):
            x = [${geometry(c).counterXs.join(', ')}][i]
            y = ${geometry(c).counterY}
            caixa('Balcao_Corpo', (BALCAO_LARGURA, BALCAO_PROFUNDIDADE, BALCAO_ALTURA-.06), (x, y, .1+(BALCAO_ALTURA-.06)/2), acabamento(MATERIAL_BALCAO), .02)
            caixa('Balcao_Tampo', (BALCAO_LARGURA+.08, BALCAO_PROFUNDIDADE+.08, .06), (x, y, .1+BALCAO_ALTURA-.03), branco, .02)
`}
    if ADICIONAR_PALCO:
        caixa('Palco', (PALCO_LARGURA, PALCO_PROFUNDIDADE, PALCO_ALTURA), (0, ${geometry(c).stageY}, .1+PALCO_ALTURA/2), acabamento(MATERIAL_PALCO), .02)
    if ADICIONAR_TOTEM:
        for i in range(TOTENS):
            x = (i - (TOTENS-1)/2)*(TOTEM_LARGURA + .5)
            y = -PROFUNDIDADE*.07
            caixa('Totem', (TOTEM_LARGURA, TOTEM_PROFUNDIDADE, TOTEM_ALTURA), (x, y, .1+TOTEM_ALTURA/2), acabamento(MATERIAL_TOTEM), .02)
            caixa('Totem_Base', (TOTEM_LARGURA+.15, TOTEM_PROFUNDIDADE+.2, .06), (x, y, .13), escuro, .01)

def criar_iluminacao(escuro):
    # Luz ampla para o render e spots laterais opcionais.
    luz('Luz_Principal', 'AREA', (0, -PROFUNDIDADE*0.6, ALTURA + 3), (0, 0, 1), max(1000, LARGURA*PROFUNDIDADE*60), tamanho=max(LARGURA, PROFUNDIDADE))
    luz('Luz_Preenchimento', 'AREA', (LARGURA/2, 0, ALTURA + 1), (0, 0, 1), max(600, LARGURA*PROFUNDIDADE*25), tamanho=max(3, PROFUNDIDADE))
    if ADICIONAR_SPOTS:
        # Trilhos independentes, mesmo sem paredes laterais.
        for sinal in [-1, 1]:
            x = sinal*(LARGURA/2 - 0.35)
            caixa('Poste_Luz', (0.07, 0.07, ALTURA), (x, PROFUNDIDADE/2 - 0.35, ALTURA/2 + 0.1), escuro)
            caixa('Trilho_Spots', (0.07, PROFUNDIDADE - 0.5, 0.07), (x, 0, ALTURA + 0.1), escuro)
            for i in range(SPOTS_POR_LADO):
                y = 0 if SPOTS_POR_LADO == 1 else -PROFUNDIDADE*.27 + i*(PROFUNDIDADE*.54/(SPOTS_POR_LADO-1))
                alvo = (sinal*LARGURA*0.15, y, 0.1)
                spot = luz('Spot_Lateral', 'SPOT', (x, y, ALTURA), alvo, 250, (1, 0.84, 0.65))
                caixa('Spot_Corpo', (0.15, 0.15, 0.2), (x, y, ALTURA + 0.05), escuro, 0.02)

def configurar_render():
    cena = bpy.context.scene
    bpy.ops.object.camera_add(location=(0, -max(PROFUNDIDADE*1.8, LARGURA*1.35), ALTURA*1.45))
    camera = organizar(bpy.context.object)
    camera.name = 'Camera_Frontal'
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = max(LARGURA*1.25, PROFUNDIDADE*1.4, ALTURA*2.5)
    apontar(camera, (0, 0, ALTURA*0.35))
    cena.camera = camera
    cena.render.engine = 'CYCLES'
    cena.cycles.samples = 64
    cena.cycles.use_denoising = True
    cena.render.resolution_x = 1920
    cena.render.resolution_y = 1080
    cena.render.resolution_percentage = 100
    mundo = identificar(bpy.data.worlds.new(colecao.name + '_Mundo'))
    cena.world = mundo
    mundo.use_nodes = True
    fundo = mundo.node_tree.nodes.get('Background')
    fundo.inputs['Color'].default_value = (0.12, 0.14, 0.2, 1)
    fundo.inputs['Strength'].default_value = 0.4

def gerar_stand():
    preparar()
    branco = material('Branco', (0.88, 0.88, 0.88, 1))
    marca = material('Marca', COR_MARCA)
    escuro = material('Grafite', (0.025, 0.03, 0.045, 1))
    tela = material_tv()
    criar_estrutura(branco, marca)
    criar_elementos(branco, marca, escuro, tela)
    criar_iluminacao(escuro)
    configurar_render()
    print('Code Buddy: stand pronto. Use NumPad 0 para a câmera e F12 para renderizar.')

gerar_stand()
${blenderStorage(c)}
${additions}
${receptionExport(c)}
${blenderImportedModels(c)}
aplicar_orientacao()
finalizar_geracao()
`;
}
