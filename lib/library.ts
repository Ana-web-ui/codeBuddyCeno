/** Catálogo dos componentes que já possuem geração no Code Buddy. */
export const libraryCatalog = [
  { id: "led", label: "Painel de LED", projectTypes: ["stand", "palco"] },
  { id: "counter", label: "Balcão", projectTypes: ["stand"] },
  { id: "stage", label: "Palco", projectTypes: ["stand", "palco"] },
  { id: "totem", label: "Totem", projectTypes: ["stand"] },
  {
    id: "spots",
    label: "Spots laterais",
    projectTypes: ["stand", "palco"],
  },
  { id: "chairs", label: "Cadeiras", projectTypes: ["palco"] },
] as const;

export type ChairDistribution = "central" | "lateral";

export type ChairConfig = {
  chairs: boolean;
  chairCount: number;
  chairColumns: number;
  chairWidth: number;
  chairDepth: number;
  chairHeight: number;
  chairSeatHeight: number;
  chairGapX: number;
  chairRowGap: number;
  chairAisleWidth: number;
  chairStageGap: number;
  chairSideMargin: number;
  chairFrontMargin: number;
  chairDistribution: ChairDistribution;
};

export const chairDefaults: ChairConfig = {
  chairs: false,
  chairCount: 300,
  chairColumns: 15,
  chairWidth: 0.5,
  chairDepth: 0.5,
  chairHeight: 0.9,
  chairSeatHeight: 0.45,
  chairGapX: 0.15,
  chairRowGap: 0.4,
  chairAisleWidth: 1.2,
  chairStageGap: 1.5,
  chairSideMargin: 0.7,
  chairFrontMargin: 0.5,
  chairDistribution: "central",
};

type LayoutContext = ChairConfig & {
  projectType: "stand" | "palco";
  width: number;
  depth: number;
  height: number;
  stage: boolean;
  stageDepth: number;
};

export type ChairLayout = {
  positions: [number, number][];
  rows: number;
  columns: number;
  width: number;
  depth: number;
  requestedCount: number;
  generatedCount: number;
  missingCount: number;
  capacity: number;
};

/**
 * +Y aponta para o palco.
 * A primeira fila fica perto do palco.
 * Os gaps são vãos livres entre as bordas dos objetos.
 *
 * Central: dois blocos separados por um corredor.
 * Lateral: um bloco central com um corredor de cada lado,
 * além das margens laterais.
 *
 * Checagem geométrica, sem interpretar normas ou lotação do local.
 */
export function layoutChairs(
  c: LayoutContext,
  stageY: number,
): ChairLayout {
  if (!c.chairs) {
    return {
      positions: [],
      rows: 0,
      columns: 0,
      width: 0,
      depth: 0,
      requestedCount: 0,
      generatedCount: 0,
      missingCount: 0,
      capacity: 0,
    };
  }

  if (c.projectType !== "palco" || !c.stage) {
    throw new Error(
      "Nesta versão, cadeiras estão disponíveis em " +
        "Palco / plenária, com o palco ativo.",
    );
  }

  if (
    c.chairDistribution !== "central" &&
    c.chairDistribution !== "lateral"
  ) {
    throw new Error(
      "Selecione uma distribuição válida para a plateia.",
    );
  }

  const integer = (
    value: number,
    max: number,
    label: string,
  ) => {
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > max
    ) {
      throw new Error(
        `${label}: use um número inteiro de 1 a ${max}.`,
      );
    }
  };

  const range = (
    value: number,
    min: number,
    max: number,
    label: string,
  ) => {
    if (
      !Number.isFinite(value) ||
      value < min ||
      value > max
    ) {
      throw new Error(
        `${label}: use um valor entre ${min} e ${max} m.`,
      );
    }
  };

  integer(c.chairCount, 1000, "Quantidade de cadeiras");
  integer(c.chairColumns, 60, "Máximo de cadeiras por fila");

  range(c.chairWidth, 0.3, 1.2, "Largura da cadeira");
  range(c.chairDepth, 0.3, 1.2, "Profundidade da cadeira");
  range(c.chairHeight, 0.65, 1.5, "Altura total da cadeira");
  range(c.chairSeatHeight, 0.3, 0.7, "Altura do assento");

  if (
    c.chairHeight < c.chairSeatHeight + 0.15 ||
    c.chairHeight > c.height
  ) {
    throw new Error(
      "A altura total precisa comportar o assento e o encosto " +
        "e caber na altura de montagem.",
    );
  }

  range(c.chairGapX, 0, 2, "Vão entre cadeiras");
  range(c.chairRowGap, 0.1, 3, "Vão entre filas");
  range(c.chairAisleWidth, 0, 5, "Largura de cada corredor");
  range(c.chairStageGap, 0.5, 5, "Distância do palco");
  range(c.chairSideMargin, 0.5, 5, "Margem lateral");
  range(c.chairFrontMargin, 0.2, 5, "Margem na entrada");

  if (
    ![
      c.width,
      c.depth,
      c.height,
      stageY,
      c.stageDepth,
    ].every(Number.isFinite) ||
    c.width <= 0 ||
    c.depth <= 0 ||
    c.height <= 0 ||
    c.stageDepth <= 0
  ) {
    throw new Error(
      "Confira as medidas da área de montagem e do palco.",
    );
  }

  // No modo lateral, reserva um corredor de cada lado.
  const lateralCorridorsWidth =
    c.chairDistribution === "lateral"
      ? 2 * c.chairAisleWidth
      : 0;

  const availableWidth =
    c.width -
    2 * c.chairSideMargin -
    lateralCorridorsWidth;

  const blockWidth = (count: number) =>
    count === 0
      ? 0
      : count * c.chairWidth +
        (count - 1) * c.chairGapX;

  function rowPositions(count: number): number[] {
    if (count <= 0) {
      return [];
    }

    const step = c.chairWidth + c.chairGapX;

    // Bloco único centralizado.
    if (
      c.chairDistribution === "lateral" ||
      c.chairAisleWidth === 0
    ) {
      const width = blockWidth(count);

      return Array.from(
        { length: count },
        (_, i) =>
          -width / 2 +
          c.chairWidth / 2 +
          i * step,
      );
    }

    // Dois blocos separados pelo corredor central.
    const leftCount = Math.ceil(count / 2);
    const rightCount = count - leftCount;
    const leftWidth = blockWidth(leftCount);

    const left = Array.from(
      { length: leftCount },
      (_, i) =>
        -c.chairAisleWidth / 2 -
        leftWidth +
        c.chairWidth / 2 +
        i * step,
    );

    const right = Array.from(
      { length: rightCount },
      (_, i) =>
        c.chairAisleWidth / 2 +
        c.chairWidth / 2 +
        i * step,
    );

    return [...left, ...right];
  }

  // Preserva os vãos e corredores.
  // Reduz apenas a quantidade de cadeiras por fila.
  let columns = c.chairColumns;

  while (columns > 0) {
    const xs = rowPositions(columns);

    const fits = xs.every(
      (x) =>
        Math.abs(x) + c.chairWidth / 2 <=
        availableWidth / 2 + 1e-9,
    );

    if (fits) {
      break;
    }

    columns--;
  }

  if (columns === 0) {
    throw new Error(
      "Não cabe nenhuma cadeira na largura disponível. " +
        "Ajuste a área, as margens ou os corredores.",
    );
  }

  const stageFront = stageY - c.stageDepth / 2;

  const firstY =
    stageFront -
    c.chairStageGap -
    c.chairDepth / 2;

  const lastAllowedY =
    -c.depth / 2 +
    c.chairFrontMargin +
    c.chairDepth / 2;

  const rowStep = c.chairDepth + c.chairRowGap;

  const maximumRows = Math.max(
    0,
    Math.floor(
      (firstY - lastAllowedY + 1e-9) / rowStep,
    ) + 1,
  );

  if (maximumRows === 0) {
    throw new Error(
      "Não cabe nenhuma fila entre o palco e a entrada. " +
        "Ajuste as medidas ou os espaços livres.",
    );
  }

  const capacity = columns * maximumRows;
  const requestedCount = c.chairCount;
  const generatedCount = Math.min(requestedCount, capacity);
  const missingCount = requestedCount - generatedCount;
  const rows = Math.ceil(generatedCount / columns);

  const positions: [number, number][] = [];

  for (let row = 0; row < rows; row++) {
    const count = Math.min(
      columns,
      generatedCount - row * columns,
    );

    const y = firstY - row * rowStep;

    for (const x of rowPositions(count)) {
      positions.push([x, y]);
    }
  }

  const xs = positions.map(([x]) => x);

  const occupiedWidth =
    Math.max(...xs) -
    Math.min(...xs) +
    c.chairWidth;

  return {
    positions,
    rows,
    columns,
    width: occupiedWidth,
    depth:
      rows * c.chairDepth +
      (rows - 1) * c.chairRowGap,
    requestedCount,
    generatedCount,
    missingCount,
    capacity,
  };
}