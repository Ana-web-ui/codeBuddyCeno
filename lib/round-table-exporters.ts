import type { RoundTableConfig, RoundTableLayout } from "./library";

/**
 * Cada peça contém:
 * raio, altura, base em Z e índice do material.
 *
 * Material 0: acabamento escolhido.
 * Material 1: metal.
 *
 * O piso existente termina em Z = 0.1 m.
 */
function tableParts(c: RoundTableConfig): number[][] {
  const floorZ = 0.1;
  const baseHeight = 0.04;

  const columnHeight =
    c.roundTableHeight -
    c.roundTableTopThickness -
    baseHeight;

  return [
    // Tampo.
    [
      c.roundTableDiameter / 2,
      c.roundTableTopThickness,
      floorZ +
        c.roundTableHeight -
        c.roundTableTopThickness,
      0,
    ],

    // Coluna central.
    [
      0.04,
      columnHeight,
      floorZ + baseHeight,
      1,
    ],

    // Base circular.
    [
      c.roundTableDiameter * 0.3,
      baseHeight,
      floorZ,
      1,
    ],
  ];
}

export function blenderRoundTables(
  c: RoundTableConfig,
  layout: RoundTableLayout,
): string {
  if (!c.roundTables || layout.positions.length === 0) {
    return "";
  }

  return `
# BIBLIOTECA: MESAS REDONDAS PARAMETRICAS
# Quantidade: ${layout.generatedCount}

def criar_mesas_redondas():
    posicoes = ${JSON.stringify(layout.positions)}
    pecas = ${JSON.stringify(tableParts(c))}

    materiais = [
        acabamento('${c.roundTableMat}'),
        acabamento('metal'),
    ]

    nomes = ['Tampo', 'Coluna', 'Base']

    for i, (x, y) in enumerate(posicoes, 1):
        for j, (raio, altura, base_z, material_id) in enumerate(pecas):
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=48,
                radius=raio,
                depth=altura,
                location=(x, y, base_z + altura / 2),
            )

            obj = organizar(bpy.context.object)
            obj.name = 'Mesa_Redonda_%03d_%s' % (i, nomes[j])
            obj.data.materials.append(materiais[int(material_id)])

            for face in obj.data.polygons:
                face.use_smooth = len(face.vertices) == 4

criar_mesas_redondas()
`;
}

/**
 * Inserir dentro do bloco principal do MaxScript,
 * antes de "select criados".
 *
 * Reutiliza METRO, cbMaterial e cbRegistrar,
 * assim como o exportador das cadeiras.
 */
export function maxRoundTables(
  c: RoundTableConfig,
  layout: RoundTableLayout,
): string {
  if (!c.roundTables || layout.positions.length === 0) {
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
-- BIBLIOTECA: MESAS REDONDAS PARAMETRICAS
-- Quantidade: ${layout.generatedCount}

undo "Adicionar mesas redondas Code Buddy" on
(
    local posicoesMesas = ${positions}
    local pecasMesas = ${parts}

    local materiaisMesas = #(
        cbMaterial "${c.roundTableMat}",
        cbMaterial "metal"
    )

    local nomesPecas = #("Tampo", "Coluna", "Base")

    for i = 1 to posicoesMesas.count do
    (
        local ponto = posicoesMesas[i]

        for j = 1 to pecasMesas.count do
        (
            local peca = pecasMesas[j]

            local obj = cylinder \
radius:(peca[1]*METRO) \
height:(peca[2]*METRO) \
sides:48 \
heightsegs:1 \
capsegs:1 \
pos:[ponto.x*METRO,ponto.y*METRO,peca[3]*METRO]

            obj.name = "CB_Mesa_Redonda_" + \
(i as string) + "_" + nomesPecas[j]

            local indiceMaterial = (peca[4] as integer) + 1
            obj.material = materiaisMesas[indiceMaterial]

            cbRegistrar obj
        )
    )
)
`;
}