import type { ExtraSceneConfig, ExtraObjectId, ExtraObjectLayouts } from './library';
import type { MaterialKind } from './generator';
import type { PanelConfig } from './panel';
import { blenderPanels, maxPanels } from './panel-exporters';
type StandardSceneConfig = ExtraSceneConfig & PanelConfig;
// Shape (0=box,1=cylinder), width, depth, height, offset X/Y, center Z, material.
type Part = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    MaterialKind
];
function objectParts(c: ExtraSceneConfig, id: ExtraObjectId): {
    name: string;
    parts: Part[];
} {
    const parts: Part[] = [];
    const box = (w: number, d: number, h: number, x: number, y: number, z: number, mat: MaterialKind) => parts.push([0, w, d, h, x, y, z, mat]);
    function cabinetFrame(w: number, d: number, h: number, n: number, mat: MaterialKind, doors: boolean) {
        const t = .03, back = .02;
        box(t, d, h, -w / 2 + t / 2, 0, .1 + h / 2, mat);
        box(t, d, h, w / 2 - t / 2, 0, .1 + h / 2, mat);
        box(w - 2 * t, d, t, 0, 0, .1 + t / 2, mat);
        box(w - 2 * t, d, t, 0, 0, .1 + h - t / 2, mat);
        box(w - 2 * t, back, h - 2 * t, 0, d / 2 - back / 2, .1 + h / 2, mat);
        const front = doors ? .025 : 0, inside = d - back - front;
        for (let i = 1; i <= n; i++)
            box(w - 2 * t, inside, t, 0, (front - back) / 2, .1 + t + (h - 2 * t) * i / (n + 1), mat);
        if (doors) {
            for (const sign of [-1, 1]) {
                box((w - 2 * t) / 2 - .004, .025, h - 2 * t, sign * (w - 2 * t) / 4, -d / 2 + .0125, .1 + h / 2, mat);
                box(.015, .03, .12, sign * .04, -d / 2 - .015, .1 + h * .55, 'metal');
            }
        }
    }
    switch (id) {
        case 'shelving':
            cabinetFrame(c.shelfWidth, c.shelfDepth, c.shelfHeight, c.shelfShelfCount, c.shelfMat, false);
            return { name: 'Estante', parts };
        case 'cabinets':
            cabinetFrame(c.cabinetWidth, c.cabinetDepth, c.cabinetHeight, c.cabinetShelfCount, c.cabinetMat, true);
            return { name: 'Armario', parts };
        case 'backdrops': {
            const w = c.backdropWidth, h = c.backdropHeight;
            box(w, c.backdropThickness, h, 0, 0, .1 + h / 2, c.backdropMat);
            for (const sign of [-1, 1])
                box(.4, c.backdropBaseDepth, .04, sign * (w / 2 - .22), 0, .12, 'metal');
            return { name: 'Backdrop', parts };
        }
        case 'touchScreens': {
            const w = c.touchWidth, h = c.touchHeight, screen = c.touchScreenHeight, support = h - screen;
            box(w + .1, c.touchBaseDepth, .04, 0, 0, .12, c.touchMat);
            box(.12, .12, support - .04, 0, 0, .14 + (support - .04) / 2, c.touchMat);
            box(w, .08, screen, 0, 0, .1 + h - screen / 2, c.touchMat);
            box(w - .06, .006, screen - .06, 0, -.043, .1 + h - screen / 2, 'brand');
            return { name: 'Tela_Touch', parts };
        }
        case 'openCubes': {
            const w = c.openCubeWidth, d = c.openCubeDepth, h = c.openCubeHeight, t = c.openCubeWallThickness, mat = c.openCubeMat;
            box(t, d, h, -w / 2 + t / 2, 0, .1 + h / 2, mat);
            box(t, d, h, w / 2 - t / 2, 0, .1 + h / 2, mat);
            box(w - 2 * t, d, t, 0, 0, .1 + t / 2, mat);
            box(w - 2 * t, d, t, 0, 0, .1 + h - t / 2, mat);
            return { name: 'Cubo_Vazado', parts };
        }
        case 'roundRugs':
            parts.push([1, c.rugDiameter, c.rugDiameter, .008, 0, 0, .104, c.rugMat]);
            return { name: 'Tapete_Circular', parts };
    }
}
function sceneData(c: StandardSceneConfig, layouts: ExtraObjectLayouts) {
    const materials: MaterialKind[] = [];
    const groups: [
        string,
        [
            number,
            number
        ][],
        number[][]
    ][] = [];
    for (const id of ['shelving', 'backdrops', 'touchScreens', 'cabinets', 'openCubes', 'roundRugs'] as const) {
        if (!c[id] || !layouts[id].positions.length)
            continue;
        if (id === 'backdrops' && c.backdropDetailed) continue;
        const { name, parts } = objectParts(c, id);
        const numeric = parts.map(p => { let index = materials.indexOf(p[7]); if (index < 0) {
            index = materials.length;
            materials.push(p[7]);
        } return [...p.slice(0, 7), index] as number[]; });
        groups.push([name, layouts[id].positions, numeric]);
    }
    return { groups, materials };
}
export function blenderStandardObjects(c: StandardSceneConfig, layouts: ExtraObjectLayouts): string {
    const { groups, materials } = sceneData(c, layouts);
    const panels = blenderPanels(c, layouts.backdrops);
    if (!groups.length)
        return panels;
    return `
# BIBLIOTECA: OBJETOS PADRAO
def criar_objetos_padrao():
    grupos = ${JSON.stringify(groups)}
    materiais = [acabamento(tipo) for tipo in ${JSON.stringify(materials)}]
    for prefixo, posicoes, pecas in grupos:
        for i, (x, y) in enumerate(posicoes, 1):
            for j, (tipo, w, d, h, dx, dy, z, material_id) in enumerate(pecas, 1):
                nome = '%s_%03d_Peca_%d' % (prefixo, i, j)
                if tipo == 0:
                    caixa(nome, (w, d, h), (x + dx, y + dy, z), materiais[int(material_id)])
                else:
                    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=w/2, depth=h, location=(x+dx,y+dy,z))
                    obj = organizar(bpy.context.object)
                    obj.name = nome
                    obj.data.materials.append(materiais[int(material_id)])

criar_objetos_padrao()
${panels}
`;
}
export function maxStandardObjects(c: StandardSceneConfig, layouts: ExtraObjectLayouts): string {
    const { groups, materials } = sceneData(c, layouts);
    const panels = maxPanels(c, layouts.backdrops);
    if (!groups.length)
        return panels;
    const array = (rows: number[][]) => '#(' + rows.map(row => '#(' + row.join(',') + ')').join(',') + ')';
    const data = '#(' + groups.map(([name, positions, parts]) => '#("' + name + '",' + array(positions) + ',' + array(parts) + ')').join(',') + ')';
    return `
-- BIBLIOTECA: OBJETOS PADRAO
undo "Adicionar objetos padrao Code Buddy" on
(
    local gruposPadrao = ${data}
    local materiaisPadrao = #(${materials.map(m => 'cbMaterial "' + m + '"').join(',')})
    for grupo in gruposPadrao do
    (
        local posicoes = grupo[2]
        local pecas = grupo[3]
        for i = 1 to posicoes.count do
        (
            local ponto = posicoes[i]
            for j = 1 to pecas.count do
            (
                local p = pecas[j]
                local nome = grupo[1] + "_" + (i as string) + "_Peca_" + (j as string)
                local mat = materiaisPadrao[(p[8] as integer)+1]
                if p[1] == 0 then
                    cbCaixa nome p[2] p[3] p[4] (ponto[1]+p[5]) (ponto[2]+p[6]) p[7] mat
                else
                (
                    local obj = cylinder name:("CB_"+nome) radius:(p[2]/2*METRO) height:(p[4]*METRO) sides:64 heightsegs:1 capsegs:1 pos:[(ponto[1]+p[5])*METRO,(ponto[2]+p[6])*METRO,(p[7]-p[4]/2)*METRO]
                    obj.material = mat
                    cbRegistrar obj
                )
            )
        )
    )
)
${panels}
`;
}
