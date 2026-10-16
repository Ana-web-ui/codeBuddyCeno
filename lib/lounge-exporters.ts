import type { LoungeConfig, LoungeLayout } from './library';
import type { MaterialKind } from './generator';
// Width, depth, height, local center X/Y/Z, material (0=chosen, 1=metal).
type Part = [
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
function armchairParts(c: LoungeConfig): Part[] {
    const w = c.armchairWidth, d = c.armchairDepth, h = c.armchairHeight, seat = c.armchairSeatHeight;
    const seatThickness = .12, backThickness = .12, armWidth = .1, armHeight = .2;
    const parts: Part[] = [
        [w - 2 * armWidth, d - backThickness, seatThickness, 0, backThickness / 2, .1 + seat - seatThickness / 2, 0],
        [w, backThickness, h - seat, 0, -d / 2 + backThickness / 2, .1 + seat + (h - seat) / 2, 0],
        [armWidth, d - backThickness, armHeight, -w / 2 + armWidth / 2, backThickness / 2, .1 + seat + armHeight / 2, 0],
        [armWidth, d - backThickness, armHeight, w / 2 - armWidth / 2, backThickness / 2, .1 + seat + armHeight / 2, 0],
    ];
    const legHeight = seat - seatThickness;
    for (const sx of [-1, 1])
        for (const sy of [-1, 1])
            parts.push([.06, .06, legHeight, sx * (w / 2 - .08), sy * (d / 2 - .08), .1 + legHeight / 2, 1]);
    return parts;
}
function puffParts(c: LoungeConfig): Part[] { return [[c.puffWidth, c.puffDepth, c.puffHeight, 0, 0, .1 + c.puffHeight / 2, 0]]; }
function blenderObjects(name: string, positions: [
    number,
    number
][], parts: Part[], mat: MaterialKind): string {
    if (!positions.length)
        return '';
    return `
# BIBLIOTECA: ${name.toUpperCase()}
def criar_${name.toLowerCase()}():
    posicoes = ${JSON.stringify(positions)}
    pecas = ${JSON.stringify(parts)}
    materiais = [acabamento('${mat}'), acabamento('metal')]
    for i, (x, y) in enumerate(posicoes, 1):
        for j, (w, d, h, dx, dy, z, material_id) in enumerate(pecas, 1):
            caixa('${name}_%03d_Peca_%d' % (i, j), (w, d, h),
                  (x + dx, y + dy, z), materiais[int(material_id)], 0.02)

criar_${name.toLowerCase()}()
`;
}
function maxObjects(name: string, positions: [
    number,
    number
][], parts: Part[], mat: MaterialKind): string {
    if (!positions.length)
        return '';
    const pos = '#(' + positions.map(([x, y]) => `[${x},${y},0]`).join(',') + ')';
    const pieces = '#(' + parts.map(p => '#(' + p.join(',') + ')').join(',') + ')';
    return `
-- BIBLIOTECA: ${name.toUpperCase()}
undo "Adicionar ${name} Code Buddy" on
(
    local posicoesLounge = ${pos}
    local pecasLounge = ${pieces}
    local materiaisLounge = #(cbMaterial "${mat}", cbMaterial "metal")
    for i = 1 to posicoesLounge.count do
    (
        local ponto = posicoesLounge[i]
        for j = 1 to pecasLounge.count do
        (
            local peca = pecasLounge[j]
            local indice = (peca[7] as integer) + 1
            local nome = "${name}_" + (i as string) + "_Peca_" + (j as string)
            cbCaixa nome peca[1] peca[2] peca[3] (ponto.x + peca[4]) (ponto.y + peca[5]) peca[6] materiaisLounge[indice]
        )
    )
)
`;
}
type Layouts = {
    armchairs: LoungeLayout;
    puffs: LoungeLayout;
};
export function blenderLounge(c: LoungeConfig, layout: Layouts): string {
    return (c.armchairs ? blenderObjects('Poltrona', layout.armchairs.positions, armchairParts(c), c.armchairMat) : '') +
        (c.puffs ? blenderObjects('Puff', layout.puffs.positions, puffParts(c), c.puffMat) : '');
}
export function maxLounge(c: LoungeConfig, layout: Layouts): string {
    return (c.armchairs ? maxObjects('Poltrona', layout.armchairs.positions, armchairParts(c), c.armchairMat) : '') +
        (c.puffs ? maxObjects('Puff', layout.puffs.positions, puffParts(c), c.puffMat) : '');
}
