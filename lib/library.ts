/** Catálogo dos componentes que já possuem geração no Code Buddy. */
export const libraryCatalog = [
  { id: 'led', label: 'Painel de LED', projectTypes: ['stand', 'palco'] },
  { id: 'counter', label: 'Balcão', projectTypes: ['stand'] },
  { id: 'stage', label: 'Palco', projectTypes: ['stand', 'palco'] },
  { id: 'totem', label: 'Totem', projectTypes: ['stand'] },
  { id: 'spots', label: 'Spots laterais', projectTypes: ['stand', 'palco'] },
  { id: 'chairs', label: 'Cadeiras', projectTypes: ['palco'] },
] as const;

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
};

type LayoutContext = ChairConfig & {
  projectType: 'stand' | 'palco';
  width: number;
  depth: number;
  height: number;
  stage: boolean;
  stageDepth: number;
};
export type ChairLayout = {
  positions: [number, number][];
  rows: number;
  width: number;
  depth: number;
};

/**
 * +Y aponta para o palco. Primeira fila fica perto do palco.
 * Os gaps são vãos livres, medidos entre as bordas dos objetos.
 * Corredor central substitui o vão entre os dois blocos de cadeiras.
 * Checagem geométrica, sem interpretar normas ou lotação do local.
 */
export function layoutChairs(c: LayoutContext, stageY: number): ChairLayout {
  if (!c.chairs) return { positions: [], rows: 0, width: 0, depth: 0 };
  if (c.projectType !== 'palco' || !c.stage) {
    throw new Error('Nesta versão, cadeiras estão disponíveis em Palco / plenária, com o palco ativo.');
  }
  const integer = (v: number, max: number, label: string) => {
    if (!Number.isInteger(v) || v < 1 || v > max) {
      throw new Error(`${label}: use um número inteiro de 1 a ${max}.`);
    }
  };
  const range = (v: number, min: number, max: number, label: string) => {
    if (!Number.isFinite(v) || v < min || v > max) {
      throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
    }
  };
  integer(c.chairCount, 1000, 'Quantidade de cadeiras');
  integer(c.chairColumns, 60, 'Cadeiras por fila');
  range(c.chairWidth, .3, 1.2, 'Largura da cadeira');
  range(c.chairDepth, .3, 1.2, 'Profundidade da cadeira');
  range(c.chairHeight, .65, 1.5, 'Altura total da cadeira');
  range(c.chairSeatHeight, .3, .7, 'Altura do assento');
  if (c.chairHeight < c.chairSeatHeight + .15 || c.chairHeight > c.height) {
    throw new Error('A altura total precisa comportar o assento e o encosto e caber na altura de montagem.');
  }
  range(c.chairGapX, 0, 2, 'Vão entre cadeiras');
  range(c.chairRowGap, .1, 3, 'Vão entre filas');
  range(c.chairAisleWidth, 0, 5, 'Corredor central');
  range(c.chairStageGap, .5, 5, 'Distância do palco');
  range(c.chairSideMargin, .5, 5, 'Margem lateral');
  range(c.chairFrontMargin, .2, 5, 'Margem na entrada');
  if (![c.width, c.depth, stageY, c.stageDepth].every(Number.isFinite)) {
    throw new Error('Confira as medidas da área de montagem e do palco.');
  }

  const rows = Math.ceil(c.chairCount / c.chairColumns);
  const positions: [number, number][] = [];
  const stageFront = stageY - c.stageDepth / 2;
  const firstY = stageFront - c.chairStageGap - c.chairDepth / 2;
  let maxWidth = 0;

  for (let row = 0; row < rows; row++) {
    const count = Math.min(c.chairColumns, c.chairCount - row * c.chairColumns);
    const split = c.chairAisleWidth > 0 && count > 1;
    const left = split ? Math.ceil(count / 2) : count;
    const right = count - left;
    const blockWidth = (n: number) => n === 0 ? 0 : n * c.chairWidth + (n - 1) * c.chairGapX;
    const leftWidth = blockWidth(left);
    const rowWidth = leftWidth + blockWidth(right) + (split ? c.chairAisleWidth : 0);
    maxWidth = Math.max(maxWidth, rowWidth);
    const y = firstY - row * (c.chairDepth + c.chairRowGap);
    for (let col = 0; col < count; col++) {
      const x = col < left
        ? -rowWidth / 2 + c.chairWidth / 2 + col * (c.chairWidth + c.chairGapX)
        : -rowWidth / 2 + leftWidth + c.chairAisleWidth + c.chairWidth / 2 + (col - left) * (c.chairWidth + c.chairGapX);
      positions.push([x, y]);
    }
  }
  if (maxWidth > c.width - 2 * c.chairSideMargin) {
    throw new Error('As cadeiras não cabem na largura. Reduza as cadeiras por fila ou aumente a área de montagem.');
  }
  const lastY = firstY - (rows - 1) * (c.chairDepth + c.chairRowGap);
  if (lastY - c.chairDepth / 2 < -c.depth / 2 + c.chairFrontMargin) {
    throw new Error('As filas não cabem na profundidade. Aumente a área, ajuste as cadeiras por fila ou reduza a quantidade.');
  }
  return { positions, rows, width: maxWidth, depth: rows * c.chairDepth + (rows - 1) * c.chairRowGap };
}
