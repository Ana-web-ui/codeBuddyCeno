import type { PedestalConfig, PedestalLayout } from './library';
export function blenderPedestals(c: PedestalConfig, layout: PedestalLayout): string {
    if (!c.pedestals || layout.positions.length === 0)
        return '';
    return `
# BIBLIOTECA: PEDESTAIS EXPOSITORES
def criar_pedestais():
    posicoes = ${JSON.stringify(layout.positions)}
    mat = acabamento('${c.pedestalMat}')
    for i, (x, y) in enumerate(posicoes, 1):
        caixa('Pedestal_%03d' % i,
              (${c.pedestalWidth}, ${c.pedestalDepth}, ${c.pedestalHeight}),
              (x, y, ${0.1 + c.pedestalHeight / 2}), mat)

criar_pedestais()
`;
}
export function maxPedestals(c: PedestalConfig, layout: PedestalLayout): string {
    if (!c.pedestals || layout.positions.length === 0)
        return '';
    const positions = '#(' + layout.positions.map(([x, y]) => `[${x},${y},0]`).join(',') + ')';
    return `
-- BIBLIOTECA: PEDESTAIS EXPOSITORES
undo "Adicionar pedestais Code Buddy" on
(
    local posicoesPedestais = ${positions}
    local materialPedestais = cbMaterial "${c.pedestalMat}"
    for i = 1 to posicoesPedestais.count do
    (
        local ponto = posicoesPedestais[i]
        local nome = "Pedestal_" + (i as string)
        cbCaixa nome ${c.pedestalWidth} ${c.pedestalDepth} ${c.pedestalHeight} ponto.x ponto.y ${0.1 + c.pedestalHeight / 2} materialPedestais
    )
)
`;
}
