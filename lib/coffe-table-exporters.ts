import type { CoffeeTableConfig, CoffeeTableLayout } from './library';
type Part = [
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
function parts(c: CoffeeTableConfig): Part[] {
    const h = c.coffeeTableHeight - c.coffeeTableTopThickness;
    const result: Part[] = [[c.coffeeTableWidth, c.coffeeTableDepth, c.coffeeTableTopThickness, 0, 0, .1 + c.coffeeTableHeight - c.coffeeTableTopThickness / 2, 0]];
    for (const sx of [-1, 1])
        for (const sy of [-1, 1])
            result.push([.04, .04, h, sx * (c.coffeeTableWidth / 2 - .06), sy * (c.coffeeTableDepth / 2 - .06), .1 + h / 2, 1]);
    return result;
}
export function blenderCoffeeTables(c: CoffeeTableConfig, layout: CoffeeTableLayout): string {
    if (!c.coffeeTables || !layout.positions.length)
        return '';
    return `
# BIBLIOTECA: MESAS DE CENTRO
def criar_mesas_centro():
    posicoes = ${JSON.stringify(layout.positions)}
    pecas = ${JSON.stringify(parts(c))}
    materiais = [acabamento('${c.coffeeTableMat}'), acabamento('metal')]
    for i, (x, y) in enumerate(posicoes, 1):
        for j, (w, d, h, dx, dy, z, material_id) in enumerate(pecas, 1):
            caixa('Mesa_Centro_%03d_Peca_%d' % (i, j), (w, d, h),
                  (x + dx, y + dy, z), materiais[int(material_id)])

criar_mesas_centro()
`;
}
export function maxCoffeeTables(c: CoffeeTableConfig, layout: CoffeeTableLayout): string {
    if (!c.coffeeTables || !layout.positions.length)
        return '';
    const pos = '#(' + layout.positions.map(([x, y]) => `[${x},${y},0]`).join(',') + ')';
    const pieces = '#(' + parts(c).map(p => '#(' + p.join(',') + ')').join(',') + ')';
    return `
-- BIBLIOTECA: MESAS DE CENTRO
undo "Adicionar mesas de centro Code Buddy" on
(
    local posicoesCentro = ${pos}
    local pecasCentro = ${pieces}
    local materiaisCentro = #(cbMaterial "${c.coffeeTableMat}", cbMaterial "metal")
    for i = 1 to posicoesCentro.count do
    (
        local ponto = posicoesCentro[i]
        for j = 1 to pecasCentro.count do
        (
            local peca = pecasCentro[j]
            local indice = (peca[7] as integer) + 1
            local nome = "Mesa_Centro_" + (i as string) + "_Peca_" + (j as string)
            cbCaixa nome peca[1] peca[2] peca[3] (ponto.x + peca[4]) (ponto.y + peca[5]) peca[6] materiaisCentro[indice]
        )
    )
)
`;
}
