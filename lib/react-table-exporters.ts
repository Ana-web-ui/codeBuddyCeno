import type { RectTableConfig } from "./library";

type ReactTableExportLayout = {
  positions: [number, number][];
  generatedCount: number;
};

/**
 * Cada peça contém:
 * largura, profundidade, altura,
 * centro X, centro Y, centro Z e material.
 *
 * Material 0: acabamento escolhido.
 * Material 1: metal.
 */
function tableParts(c: RectTableConfig): number[][] {
  const floorZ = 0.1;
  const legSize = 0.04;

  const legHeight =
    c.rectTableHeight - c.rectTableTopThickness;

  const parts: number[][] = [
    [
      c.rectTableWidth,
      c.rectTableDepth,
      c.rectTableTopThickness,
      0,
      0,
      floorZ +
        c.rectTableHeight -
        c.rectTableTopThickness / 2,
      0,
    ],
  ];

  const legX = c.rectTableWidth / 2 - 0.08;
  const legY = c.rectTableDepth / 2 - 0.08;

  for (const signX of [-1, 1]) {
    for (const signY of [-1, 1]) {
      parts.push([
        legSize,
        legSize,
        legHeight,
        signX * legX,
        signY * legY,
        floorZ + legHeight / 2,
        1,
      ]);
    }
  }

  return parts;
}

export function blenderRectTables(
  c: RectTableConfig,
  layout: ReactTableExportLayout,
): string {
  if (!c.rectTables || layout.positions.length === 0) {
    return "";
  }

  return `
# BIBLIOTECA: MESAS RETANGULARES PARAMETRICAS
# Quantidade: ${layout.generatedCount}

def criar_mesas_retangulares():
    posicoes = ${JSON.stringify(layout.positions)}
    pecas = ${JSON.stringify(tableParts(c))}

    materiais = [
        acabamento('${c.rectTableMat}'),
        acabamento('metal'),
    ]

    for i, (x, y) in enumerate(posicoes, 1):
        for j, peca in enumerate(pecas):
            largura, profundidade, altura, dx, dy, z, material_id = peca

            nome = 'Mesa_Retangular_%03d_Peca_%d' % (i, j + 1)

            caixa(
                nome,
                (largura, profundidade, altura),
                (x + dx, y + dy, z),
                materiais[int(material_id)],
            )

criar_mesas_retangulares()
`;
}

export function maxRectTables(
  c: RectTableConfig,
  layout: ReactTableExportLayout,
): string {
  if (!c.rectTables || layout.positions.length === 0) {
    return "";
  }

  const positions =
    "#(" +
    layout.positions
      .map(([x, y]) => `[${x},${y},0]`)
      .join(",") +
    ")";

  const parts =
    "#(" +
    tableParts(c)
      .map((part) => `#(${part.join(",")})`)
      .join(",") +
    ")";

  return `
-- BIBLIOTECA: MESAS RETANGULARES PARAMETRICAS
-- Quantidade: ${layout.generatedCount}

undo "Adicionar mesas retangulares Code Buddy" on
(
    local posicoesRetangulares = ${positions}
    local pecasRetangulares = ${parts}

    local materiaisRetangulares = #(
        cbMaterial "${c.rectTableMat}",
        cbMaterial "metal"
    )

    for i = 1 to posicoesRetangulares.count do
    (
        local ponto = posicoesRetangulares[i]

        for j = 1 to pecasRetangulares.count do
        (
            local peca = pecasRetangulares[j]
            local indiceMaterial = (peca[7] as integer) + 1

            local nome = "Mesa_Retangular_" + (i as string) + "_Peca_" + (j as string)

            cbCaixa nome peca[1] peca[2] peca[3] (ponto.x + peca[4]) (ponto.y + peca[5]) peca[6] materiaisRetangulares[indiceMaterial]
        )
    )
)
`;
}