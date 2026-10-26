type ChairConfig = {
    chairs?: boolean;
    chairWidth: number;
    chairDepth: number;
    chairHeight: number;
    chairSeatHeight: number;
};
type ChairLayout = {
    positions: [
        number,
        number
    ][];
    rows: number;
    rotations?: number[];
};
type ChairExportOptions = {
    group?: 'audience' | 'tables';
};
type ChairExportConfig = ChairConfig & {
    color: string;
};
const fixed = (v: number) => Number(v.toFixed(6));
/** Uma cadeira conceitual: assento, encosto e quatro pernas, unidos numa malha. */
function chairMesh(c: ChairConfig) {
    const vertices: number[][] = [];
    const faces: number[][] = [];
    const materialIds: number[] = [];
    const box = (w: number, d: number, h: number, x: number, y: number, z: number, material: number) => {
        const start = vertices.length;
        for (const [sx, sy, sz] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
            vertices.push([fixed(x + sx * w / 2), fixed(y + sy * d / 2), fixed(z + sz * h / 2)]);
        }
        for (const face of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) {
            faces.push(face.map(v => v + start));
            materialIds.push(material);
        }
    };
    box(c.chairWidth, c.chairDepth, .05, 0, 0, c.chairSeatHeight + .025, 0);
    const backHeight = c.chairHeight - c.chairSeatHeight - .05;
    box(c.chairWidth, .04, backHeight, 0, -c.chairDepth / 2 + .02, c.chairSeatHeight + .05 + backHeight / 2, 0);
    for (const x of [-1, 1])
        for (const y of [-1, 1]) {
            box(.03, .03, c.chairSeatHeight, x * (c.chairWidth / 2 - .035), y * (c.chairDepth / 2 - .035), c.chairSeatHeight / 2, 1);
        }
    return { vertices, faces, materialIds };
}
export function blenderChairs(c: ChairExportConfig, layout: ChairLayout, options: ChairExportOptions = {}): string {
    if (!c.chairs || layout.positions.length === 0)
        return '';
    const prefix = options.group === 'tables' ? 'Cadeira_Mesa' : 'Cadeira';
    const functionName = options.group === 'tables' ? 'criar_cadeiras_mesas' : 'criar_cadeiras';
    const angles = layout.positions.map((_, i) => layout.rotations?.[i] ?? 0);
    if (angles.some(a => !Number.isFinite(a)))
        throw new Error('Rotação de cadeira inválida.');
    const mesh = chairMesh(c);
    const positions = layout.positions.map(([x, y]) => [fixed(x), fixed(y)]);
    const rgb = [1, 3, 5].map(i => fixed(parseInt(c.color.slice(i, i + 2), 16) / 255));
    return `
# BIBLIOTECA: CADEIRAS PARAMETRICAS
# ${layout.positions.length} cadeiras; orientacao definida pelas posicoes e rotacoes calculadas.
# Os objetos compartilham a mesma malha. Editar a malha altera todas as cadeiras.
def ${functionName}():
    vertices = ${JSON.stringify(mesh.vertices)}
    faces = ${JSON.stringify(mesh.faces)}
    materiais = ${JSON.stringify(mesh.materialIds)}
    posicoes = ${JSON.stringify(positions)}
    angulos = ${JSON.stringify(angles.map(fixed))}
    mesh = bpy.data.meshes.new('CB_${prefix}_Parametrica')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(material('Cadeira_Assento', (${rgb.join(',')}, 1)))
    mesh.materials.append(acabamento('metal'))
    for poligono, indice in zip(mesh.polygons, materiais):
        poligono.material_index = indice
    for i, (x, y) in enumerate(posicoes, 1):
        obj = bpy.data.objects.new('${prefix}_%04d' % i, mesh)
        colecao.objects.link(obj)
        obj.location = (x, y, .1)
        obj.rotation_euler[2] = angulos[i - 1]

${functionName}()
`;
}
/** Inserir dentro do bloco principal do .ms, antes de 'select criados'. */
export function maxChairs(c: ChairExportConfig, layout: ChairLayout, options: ChairExportOptions = {}): string {
    if (!c.chairs || layout.positions.length === 0)
        return '';
    const prefix = options.group === 'tables' ? 'Cadeira_Mesa' : 'Cadeira';
    const functionName = options.group === 'tables' ? 'criar_cadeiras_mesas' : 'criar_cadeiras';
    const angles = layout.positions.map((_, i) => layout.rotations?.[i] ?? 0);
    if (angles.some(a => !Number.isFinite(a)))
        throw new Error('Rotação de cadeira inválida.');
    const mesh = chairMesh(c);
    const triangles: number[][] = [];
    const ids: number[] = [];
    mesh.faces.forEach((f, i) => {
        triangles.push([f[0] + 1, f[1] + 1, f[2] + 1], [f[0] + 1, f[2] + 1, f[3] + 1]);
        ids.push(mesh.materialIds[i] + 1, mesh.materialIds[i] + 1);
    });
    const rgb = [1, 3, 5].map(i => parseInt(c.color.slice(i, i + 2), 16));
    const array = (items: number[][], scale = false) => '#(' + items.map(v => '[' + v.map(fixed).join(',') + ']' + (scale ? '*METRO' : '')).join(',') + ')';
    return `
-- BIBLIOTECA: CADEIRAS PARAMETRICAS
-- ${layout.positions.length} cadeiras; orientacao definida pelas posicoes e rotacoes calculadas.
-- Instancias compartilham a malha. Alterar a malha altera todas as cadeiras.
undo "Adicionar plateia Code Buddy" on
(
    local matAssento = cbMaterial "plastic"
    matAssento.base_color = color ${rgb.join(' ')}
    local matPernas = cbMaterial "metal"
    local matCadeira = MultiMaterial numsubs:2 name:"CB_Cadeira_Materiais"
    matCadeira.materialList[1] = matAssento
    matCadeira.materialList[2] = matPernas
    local prototipo = mesh name:"CB_${prefix}_Prototipo" vertices:${array(mesh.vertices, true)} faces:${array(triangles)}
    prototipo.material = matCadeira
    local ids = #(${ids.join(',')})
    for i = 1 to ids.count do setFaceMatID prototipo i ids[i]
    update prototipo
    local posicoes = ${array(layout.positions.map(([x, y]) => [x, y, .1]), true)}
    local angulos = #(${angles.map(a => fixed(a * 180 / Math.PI)).join(",")})
    for i = 1 to posicoes.count do
    (
        local obj = instance prototipo
        obj.name = "CB_${prefix}_"+(i as string)
        obj.rotation = (eulerAngles 0 0 angulos[i])
        obj.pos = posicoes[i]
        cbRegistrar obj
    )
    delete prototipo
)
`;
}
