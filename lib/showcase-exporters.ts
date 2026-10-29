import type { ShowcaseDetailConfig } from './showcase';
import { blenderDetailedShowcases, maxDetailedShowcases } from './showcase-detail-exporters';
import type { ShowcaseConfig, ShowcaseLayout } from './library';
// Width, depth, height, local X/Y, center Z, material (base=0, glass=1).
type Part = [
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
function parts(c: ShowcaseConfig): Part[] {
    const w = c.showcaseWidth, d = c.showcaseDepth, h = c.showcaseHeight, b = c.showcaseBaseHeight, t = c.showcaseGlassThickness;
    const glassHeight = h - b - t, z = .1 + b + glassHeight / 2;
    const result: Part[] = [
        [w, d, b, 0, 0, .1 + b / 2, 0],
        [t, d, glassHeight, -w / 2 + t / 2, 0, z, 1],
        [t, d, glassHeight, w / 2 - t / 2, 0, z, 1],
        [w - 2 * t, t, glassHeight, 0, -d / 2 + t / 2, z, 1],
        [w - 2 * t, t, glassHeight, 0, d / 2 - t / 2, z, 1],
        [w, d, t, 0, 0, .1 + h - t / 2, 1],
    ];
    for (let i = 1; i <= c.showcaseShelfCount; i++)
        result.push([w - 2 * t, d - 2 * t, t, 0, 0, .1 + b + glassHeight * i / (c.showcaseShelfCount + 1), 1]);
    return result;
}
export function blenderShowcases(c: ShowcaseConfig & ShowcaseDetailConfig, layout: ShowcaseLayout, options: { grouped?: boolean } = {}): string {
    if (c.showcaseDetailed) return blenderDetailedShowcases(c, layout, options);
    if (!c.showcases || !layout.positions.length)
        return '';
    return `
# BIBLIOTECA: VITRINES EXPOSITORAS
def criar_vitrines():
    posicoes = ${JSON.stringify(layout.positions)}
    pecas = ${JSON.stringify(parts(c))}
    materiais = [acabamento('${c.showcaseBaseMat}'), acabamento('glass')]
    for i, (x, y) in enumerate(posicoes, 1):
        for j, (w, d, h, dx, dy, z, material_id) in enumerate(pecas, 1):
            caixa('Vitrine_%03d_Peca_%d' % (i, j), (w, d, h),
                  (x + dx, y + dy, z), materiais[int(material_id)])

criar_vitrines()
`;
}
export function maxShowcases(c: ShowcaseConfig & ShowcaseDetailConfig, layout: ShowcaseLayout, options: { grouped?: boolean } = {}): string {
    if (c.showcaseDetailed) return maxDetailedShowcases(c, layout, options);
    if (!c.showcases || !layout.positions.length)
        return '';
    const pos = '#(' + layout.positions.map(([x, y]) => `[${x},${y},0]`).join(',') + ')';
    const pieces = '#(' + parts(c).map(p => '#(' + p.join(',') + ')').join(',') + ')';
    return `
-- BIBLIOTECA: VITRINES EXPOSITORAS
undo "Adicionar vitrines Code Buddy" on
(
    local posicoesVitrines = ${pos}
    local pecasVitrines = ${pieces}
    local materiaisVitrines = #(cbMaterial "${c.showcaseBaseMat}", cbMaterial "glass")
    for i = 1 to posicoesVitrines.count do
    (
        local ponto = posicoesVitrines[i]
        for j = 1 to pecasVitrines.count do
        (
            local peca = pecasVitrines[j]
            local indice = (peca[7] as integer) + 1
            local nome = "Vitrine_" + (i as string) + "_Peca_" + (j as string)
            cbCaixa nome peca[1] peca[2] peca[3] (ponto.x + peca[4]) (ponto.y + peca[5]) peca[6] materiaisVitrines[indice]
        )
    )
)
`;
}
