import type { Config } from './generator';
import { activationGeometry } from './activation-geometry';
import { extraObjectDefinitions, extraObjectSpec } from './library.js';
import type { ReservedArea } from './library.js';

export type ObjectTransform = { x: number; y: number; rotation: number };
export type AssemblyConfig = { objectTransforms: Record<string, ObjectTransform> };
export type AssemblyRole = 'demoStations' | 'roundTables' | 'rectTables' | 'bistroTables' | 'tableChairs' | 'stools' | 'pedestals' | 'armchairs' | 'puffs' | 'coffeeTables' | 'showcases' | typeof extraObjectDefinitions[number]['id'];
export type AssemblyMember = {
    role: AssemblyRole; index: number; x: number; y: number; rotation: number;
    width: number; depth: number; circle: boolean; material: Config['floorMat'];
};
export type AssemblyUnit = {
    rotation: number; id: string; label: string; x: number; y: number; floor: boolean; members: AssemblyMember[] 
};
type Layout = { positions: [number, number][]; rotations?: number[] };
export type AssemblyScene = Record<AssemblyRole, Layout>;

/** Identidade por tipo e índice; conjuntos mantêm seus assentos vinculados à mesa. */
export function buildAssembly(c: Config, scene: AssemblyScene): AssemblyUnit[] {
    const units: AssemblyUnit[] = [];
    function member(role: AssemblyRole, index: number): AssemblyMember {
        const [x, y] = scene[role].positions[index];
        const common = { role, index, x, y, rotation: (scene[role].rotations?.[index] ?? 0) * 180 / Math.PI };
        const shape = (width: number, depth: number, material: Config['floorMat'], circle = false): AssemblyMember => ({ ...common, width, depth, material, circle });
        switch (role) {
            case 'demoStations': return shape(c.demoBenchWidth+.08,c.demoBenchDepth+.08,c.demoBenchMat);
            case 'roundTables': return shape(c.roundTableDiameter, c.roundTableDiameter, c.roundTableMat, true);
            case 'rectTables': return shape(c.rectTableWidth, c.rectTableDepth, c.rectTableMat);
            case 'bistroTables': return shape(c.bistroTableDiameter, c.bistroTableDiameter, c.bistroTableMat, true);
            case 'tableChairs': return shape(c.tableChairWidth, c.tableChairDepth, 'brand');
            case 'stools': return shape(c.stoolSeatDiameter, c.stoolSeatDiameter, c.stoolMat, true);
            case 'pedestals': return shape(c.pedestalWidth, c.pedestalDepth, c.pedestalMat);
            case 'armchairs': return shape(c.armchairWidth, c.armchairDepth, c.armchairMat);
            case 'puffs': return shape(c.puffWidth, c.puffDepth, c.puffMat);
            case 'coffeeTables': return shape(c.coffeeTableWidth, c.coffeeTableDepth, c.coffeeTableMat);
            case 'showcases': return shape(c.showcaseWidth, c.showcaseDepth, c.showcaseBaseMat);
            default: {
                const spec = extraObjectSpec(c, role), def = extraObjectDefinitions.find(d => d.id === role)!;
                return shape(spec.width, spec.depth, c[def.materialKey], role === 'roundRugs');
            }
        }
    }
    function add(role: AssemblyRole, label: string, children?: (i: number) => AssemblyMember[]) {
        scene[role].positions.forEach(([x, y], i) => units.push({
            id: `${role}:${i}`, label: `${label} ${i + 1}`, x, y, floor: role === 'roundRugs', members: [member(role, i), ...(children?.(i) ?? [])],
            rotation: 0
        }));
    }
    const chairs = (start: number, count: number) => Array.from({ length: count }, (_, j) => member('tableChairs', start + j));
    const roundCount = c.roundTables && c.roundTableChairs ? c.roundTableChairsPerTable : 0;
    const rectCount = c.rectTables && c.rectTableChairs ? c.rectTableChairsPerTable : 0;
    add('roundTables', roundCount ? 'Conjunto de mesa redonda' : 'Mesa redonda', i => chairs(i * roundCount, roundCount));
    const offset = scene.roundTables.positions.length * roundCount;
    add('rectTables', rectCount ? 'Conjunto de mesa retangular' : 'Mesa retangular', i => chairs(offset + i * rectCount, rectCount));
    const stoolCount = c.stools && c.stoolDistribution === 'bistro' ? c.stoolsPerBistro : 0;
    add('bistroTables', stoolCount ? 'Conjunto bistrô' : 'Mesa bistrô', i => Array.from({ length: stoolCount }, (_, j) => member('stools', i * stoolCount + j)));
    if (!stoolCount) add('stools', 'Banqueta');
    add('pedestals', 'Pedestal');
    if (c.loungeMode === 'set') {
        const arms = c.armchairs ? c.loungeArmchairsPerTable : 0, puffs = c.puffs ? c.loungePuffsPerTable : 0;
        add('coffeeTables', 'Conjunto de lounge', i => [
            ...Array.from({ length: arms }, (_, j) => member('armchairs', i * arms + j)),
            ...Array.from({ length: puffs }, (_, j) => member('puffs', i * puffs + j)),
        ]);
    } else {
        add('armchairs', 'Poltrona'); add('puffs', 'Puff'); add('coffeeTables', 'Mesa de centro');
    }
    add('showcases', 'Vitrine');
    for (const def of extraObjectDefinitions) add(def.id, def.label);
    add('demoStations', 'Demonstração de produto');
    if (c.projectType === 'activation') {
        const stations = activationGeometry(c)!.baseStations;
        for (const unit of units) {
            const station = stations.find(s => s.id === unit.id);
            if (station) { unit.rotation = station.rotation; unit.label = c.activationModel === 'demo' ? 'Demonstração de produto' : c.activationModel === 'photo' ? 'Espaço para fotos' : `Estação de interação ${Number(unit.id.split(':')[1]) + 1}`; }
        }
    }
    return units;
}

export function unitTransform(c: AssemblyConfig, unit: AssemblyUnit): ObjectTransform {
    return Object.hasOwn(c.objectTransforms, unit.id) ? c.objectTransforms[unit.id] : { x: unit.x, y: unit.y, rotation: unit.rotation };
}

export function placedMembers(c: AssemblyConfig, unit: AssemblyUnit): AssemblyMember[] {
    const t = unitTransform(c, unit), r = t.rotation * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
    return unit.members.map(m => ({ ...m, x: t.x + (m.x - unit.x) * cos - (m.y - unit.y) * sin,
        y: t.y + (m.x - unit.x) * sin + (m.y - unit.y) * cos, rotation: m.rotation + t.rotation }));
}

export function checkTransforms(value: unknown): asserts value is AssemblyConfig['objectTransforms'] {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 2000) throw new Error('Os ajustes individuais do projeto são inválidos.');
    for (const [id, t] of Object.entries(value)) {
        if (!/^[A-Za-z]+:\d{1,3}$/.test(id) || !t || typeof t !== 'object' || Array.isArray(t) ||
            Object.keys(t).length !== 3 || !['x', 'y', 'rotation'].every(key => Object.hasOwn(t, key) && typeof t[key] === 'number' && Number.isFinite(t[key])) ||
            Math.abs(t.x) > 30 || Math.abs(t.y) > 30 || Math.abs(t.rotation) > 360) {
            throw new Error('Confira os ajustes: X e Y entre −30 e 30 m; rotação entre −360° e 360°.');
        }
    }
}

type Point = [number, number];
function corners(m: AssemblyMember): Point[] {
    const a = (m.circle ? 0 : m.rotation) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [m.x + sx * m.width / 2 * cos - sy * m.depth / 2 * sin, m.y + sx * m.width / 2 * sin + sy * m.depth / 2 * cos]);
}
/** Retângulos orientados; círculos usam uma envoltória conservadora. */
function intersects(a: AssemblyMember, b: AssemblyMember): boolean {
    const ca = corners(a), cb = corners(b);
    for (const angle of [a.circle ? 0 : a.rotation, b.circle ? 0 : b.rotation]) {
        const r = angle * Math.PI / 180;
        for (const [x, y] of [[Math.cos(r), Math.sin(r)], [-Math.sin(r), Math.cos(r)]]) {
            const pa = ca.map(p => p[0] * x + p[1] * y), pb = cb.map(p => p[0] * x + p[1] * y);
            if (Math.max(...pa) <= Math.min(...pb) + 1e-8 || Math.max(...pb) <= Math.min(...pa) + 1e-8) return false;
        }
    }
    return true;
}

export function validateAssembly(c: Config, units: AssemblyUnit[], reserved: ReservedArea[]): void {
    checkTransforms(c.objectTransforms);
    const ids = new Set(units.map(u => u.id));
    for (const id of Object.keys(c.objectTransforms)) if (!ids.has(id)) throw new Error('Um objeto ajustado não existe mais. Restaure a distribuição automática.');
    if (!Object.keys(c.objectTransforms).length) return;
    const placed = units.map(u => placedMembers(c, u));
    const fixed: AssemblyMember[] = reserved.map(a => ({ role: 'pedestals', index: 0, x: a.centerX, y: a.centerY, width: a.width, depth: a.depth, rotation: 0, circle: false, material: 'white' }));
    units.forEach((unit, i) => {
        if (!Object.hasOwn(c.objectTransforms, unit.id)) return;
        for (const m of placed[i]) {
            if (corners(m).some(([x, y]) => Math.abs(x) > c.width / 2 - .2 + 1e-8 || Math.abs(y) > c.depth / 2 - .2 + 1e-8)) {
                throw new Error(`${unit.label}: o ajuste ultrapassa a área disponível e a margem de 20 cm.`);
            }
            if (unit.floor) continue;
            if (fixed.some(a => intersects(m, a))) throw new Error(`${unit.label}: essa posição ocupa uma área reservada ao palco, plateia ou estrutura fixa.`);
            units.forEach((other, j) => {
                if (i === j || other.floor) return;
                if (placed[j].some(b => intersects(m, b))) throw new Error(`${unit.label}: há sobreposição com ${other.label}.`);
            });
        }
    });
}
