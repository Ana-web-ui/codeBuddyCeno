/** Catálogo dos componentes que já possuem geração no Code Buddy. */
import type { MaterialKind } from "./generator";
export const libraryCatalog = [
    { id: "led", label: "Painel de LED", projectTypes: ["stand", "palco"] },
    { id: "counter", label: "Balcão", projectTypes: ["stand"] },
    { id: "stage", label: "Palco", projectTypes: ["stand", "palco"] },
    { id: "totem", label: "Totem", projectTypes: ["stand"] },
    { id: "spots", label: "Spots laterais", projectTypes: ["stand", "palco"], },
    { id: "chairs", label: "Cadeiras", projectTypes: ["palco"] },
    { id: "roundTables", label: "Mesas Redondas", projectTypes: ["stand", "palco"], },
    { id: "rectTables", label: "Mesas Retangulares", projectTypes: ["stand", "palco"], },
    { id: "bistroTables", label: "Mesas Bistrô", projectTypes: ["stand", "palco"] },
] as const;
export type ChairDistribution = "central" | "lateral";
export type ChairGenerationMode = "quantity" | "fill";
export type ChairConfig = {
    chairs: boolean;
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
    chairGenerationMode: ChairGenerationMode;
    attendeeCount: number;
    chairExtraCount: number;
};
export const chairDefaults: ChairConfig = {
    chairs: false,
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
    attendeeCount: 300,
    chairExtraCount: 0,
    chairGenerationMode: "quantity",
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
    positions: [
        number,
        number
    ][];
    rows: number;
    columns: number;
    width: number;
    depth: number;
    requestedCount: number;
    generatedCount: number;
    missingCount: number;
    capacity: number;
    attendeeCount: number;
    extraRequestedCount: number;
    unseatedCount: number;
    extraGeneratedCount: number;
    extraMissingCount: number;
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
export function layoutChairs(c: LayoutContext, stageY: number): ChairLayout {
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
            attendeeCount: 0,
            extraRequestedCount: 0,
            unseatedCount: 0,
            extraGeneratedCount: 0,
            extraMissingCount: 0,
        };
    }
    if (c.projectType !== "palco" || !c.stage) {
        throw new Error("Nesta versão, cadeiras estão disponíveis em " +
            "Palco / plenária, com o palco ativo.");
    }
    if (c.chairDistribution !== "central" &&
        c.chairDistribution !== "lateral") {
        throw new Error("Selecione uma distribuição válida para a plateia.");
    }
    const integer = (value: number, max: number, label: string) => {
        if (!Number.isInteger(value) ||
            value < 1 ||
            value > max) {
            throw new Error(`${label}: use um número inteiro de 1 a ${max}.`);
        }
    };
    const range = (value: number, min: number, max: number, label: string) => {
        if (!Number.isFinite(value) ||
            value < min ||
            value > max) {
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
        }
    };
    let requestedCount = 0;
    if (c.chairGenerationMode === "quantity") {
        integer(c.attendeeCount, 1000, "Quantidade de pessoas");
        if (!Number.isInteger(c.chairExtraCount) ||
            c.chairExtraCount < 0 ||
            c.chairExtraCount > 1000) {
            throw new Error("Cadeiras extras: use um número inteiro de 0 a 1000.");
        }
        requestedCount =
            c.attendeeCount + c.chairExtraCount;
        if (requestedCount > 1000) {
            throw new Error("Nesta versão, a soma de pessoas e cadeiras extras " +
                "deve ser de até 1000.");
        }
    }
    integer(c.chairColumns, 60, "Máximo de cadeiras por fila");
    range(c.chairWidth, 0.3, 1.2, "Largura da cadeira");
    range(c.chairDepth, 0.3, 1.2, "Profundidade da cadeira");
    range(c.chairHeight, 0.65, 1.5, "Altura total da cadeira");
    range(c.chairSeatHeight, 0.3, 0.7, "Altura do assento");
    if (c.chairHeight < c.chairSeatHeight + 0.15 ||
        c.chairHeight > c.height) {
        throw new Error("A altura total precisa comportar o assento e o encosto " +
            "e caber na altura de montagem.");
    }
    range(c.chairGapX, 0, 2, "Vão entre cadeiras");
    range(c.chairRowGap, 0.1, 3, "Vão entre filas");
    range(c.chairAisleWidth, 0, 5, "Largura de cada corredor");
    range(c.chairStageGap, 0.5, 5, "Distância do palco");
    range(c.chairSideMargin, 0.5, 5, "Margem lateral");
    range(c.chairFrontMargin, 0.2, 5, "Margem na entrada");
    if (![
        c.width,
        c.depth,
        c.height,
        stageY,
        c.stageDepth,
    ].every(Number.isFinite) ||
        c.width <= 0 ||
        c.depth <= 0 ||
        c.height <= 0 ||
        c.stageDepth <= 0) {
        throw new Error("Confira as medidas da área de montagem e do palco.");
    }
    // No modo lateral, reserva um corredor de cada lado.
    const lateralCorridorsWidth = c.chairDistribution === "lateral"
        ? 2 * c.chairAisleWidth
        : 0;
    const availableWidth = c.width -
        2 * c.chairSideMargin -
        lateralCorridorsWidth;
    const blockWidth = (count: number) => count === 0
        ? 0
        : count * c.chairWidth +
            (count - 1) * c.chairGapX;
    function rowPositions(count: number): number[] {
        if (count <= 0) {
            return [];
        }
        const step = c.chairWidth + c.chairGapX;
        // Bloco único centralizado.
        if (c.chairDistribution === "lateral" ||
            c.chairAisleWidth === 0) {
            const width = blockWidth(count);
            return Array.from({ length: count }, (_, i) => -width / 2 +
                c.chairWidth / 2 +
                i * step);
        }
        // Dois blocos separados pelo corredor central.
        const leftCount = Math.ceil(count / 2);
        const rightCount = count - leftCount;
        const leftWidth = blockWidth(leftCount);
        const left = Array.from({ length: leftCount }, (_, i) => -c.chairAisleWidth / 2 -
            leftWidth +
            c.chairWidth / 2 +
            i * step);
        const right = Array.from({ length: rightCount }, (_, i) => c.chairAisleWidth / 2 +
            c.chairWidth / 2 +
            i * step);
        return [...left, ...right];
    }
    // Preserva os vãos e corredores.
    // Reduz apenas a quantidade de cadeiras por fila.
    let columns = c.chairColumns;
    while (columns > 0) {
        const xs = rowPositions(columns);
        const fits = xs.every((x) => Math.abs(x) + c.chairWidth / 2 <=
            availableWidth / 2 + 1e-9);
        if (fits) {
            break;
        }
        columns--;
    }
    if (columns === 0) {
        throw new Error("Não cabe nenhuma cadeira na largura disponível. " +
            "Ajuste a área, as margens ou os corredores.");
    }
    const stageFront = stageY - c.stageDepth / 2;
    const firstY = stageFront -
        c.chairStageGap -
        c.chairDepth / 2;
    const lastAllowedY = -c.depth / 2 +
        c.chairFrontMargin +
        c.chairDepth / 2;
    const rowStep = c.chairDepth + c.chairRowGap;
    const maximumRows = Math.max(0, Math.floor((firstY - lastAllowedY + 1e-9) / rowStep) + 1);
    if (maximumRows === 0) {
        throw new Error("Não cabe nenhuma fila entre o palco e a entrada. " +
            "Ajuste as medidas ou os espaços livres.");
    }
    const capacity = columns * maximumRows;
    const isFillMode = c.chairGenerationMode === "fill";
    if (isFillMode) {
        if (capacity > 1000) {
            throw new Error(`Cabem ${capacity} cadeiras nesta configuração, ` +
                "mas esta versão permite gerar até 1000. " +
                "Use o modo por quantidade ou ajuste os parâmetros.");
        }
        requestedCount = capacity;
    }
    const generatedCount = Math.min(requestedCount, capacity);
    const missingCount = requestedCount - generatedCount;
    const attendeeCount = isFillMode ? 0 : c.attendeeCount;
    const extraRequestedCount = isFillMode ? 0 : c.chairExtraCount;
    const unseatedCount = Math.max(0, attendeeCount - generatedCount);
    const extraGeneratedCount = isFillMode
        ? 0
        : Math.max(0, generatedCount - attendeeCount);
    const extraMissingCount = Math.max(0, extraRequestedCount - extraGeneratedCount);
    const rows = Math.ceil(generatedCount / columns);
    const positions: [
        number,
        number
    ][] = [];
    for (let row = 0; row < rows; row++) {
        const count = Math.min(columns, generatedCount - row * columns);
        const y = firstY - row * rowStep;
        for (const x of rowPositions(count)) {
            positions.push([x, y]);
        }
    }
    const xs = positions.map(([x]) => x);
    const occupiedWidth = Math.max(...xs) -
        Math.min(...xs) +
        c.chairWidth;
    return {
        positions,
        rows,
        columns,
        width: occupiedWidth,
        depth: rows * c.chairDepth +
            (rows - 1) * c.chairRowGap,
        requestedCount: requestedCount,
        generatedCount,
        missingCount,
        capacity,
        attendeeCount: attendeeCount,
        extraRequestedCount: extraRequestedCount,
        unseatedCount: unseatedCount,
        extraGeneratedCount: extraGeneratedCount,
        extraMissingCount: extraMissingCount,
    };
}
export type RoundTableConfig = {
    roundTables: boolean;
    roundTableCount: number;
    roundTableDiameter: number;
    roundTableHeight: number;
    roundTableTopThickness: number;
    roundTableGap: number;
    roundTableMat: MaterialKind;
};
export const roundTableDefaults: RoundTableConfig = {
    roundTables: false,
    roundTableCount: 1,
    roundTableDiameter: 0.8,
    roundTableHeight: 0.75,
    roundTableTopThickness: 0.03,
    roundTableGap: 0.8,
    roundTableMat: "white",
};
export type ReservedArea = {
    centerX: number;
    centerY: number;
    width: number;
    depth: number;
};
export type RoundTableLayout = {
    positions: [
        number,
        number
    ][];
    generatedCount: number;
};
type RoundTableContext = RoundTableConfig & {
    width: number;
    depth: number;
};
/**
 * Distribui mesas em uma grade centralizada na área.
 *
 * roundTableGap é o vão livre entre os tampos.
 * As áreas reservadas devem incluir os espaços
 * que precisam permanecer livres ao redor dos objetos.
 */
export function layoutRoundTables(c: RoundTableContext, reservedAreas: ReservedArea[]): RoundTableLayout {
    if (!c.roundTables) {
        return {
            positions: [],
            generatedCount: 0,
        };
    }
    if (!Number.isInteger(c.roundTableCount) ||
        c.roundTableCount < 1 ||
        c.roundTableCount > 100) {
        throw new Error("Mesas redondas: use uma quantidade inteira de 1 a 100.");
    }
    const checkRange = (value: number, min: number, max: number, label: string) => {
        if (!Number.isFinite(value) ||
            value < min ||
            value > max) {
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
        }
    };
    checkRange(c.roundTableDiameter, 0.4, 3, "Diâmetro da mesa");
    checkRange(c.roundTableHeight, 0.4, 1.2, "Altura da mesa");
    checkRange(c.roundTableTopThickness, 0.01, 0.15, "Espessura do tampo");
    checkRange(c.roundTableGap, 0, 5, "Vão entre mesas");
    if (!Number.isFinite(c.width) ||
        !Number.isFinite(c.depth) ||
        c.width <= 0 ||
        c.depth <= 0) {
        throw new Error("Confira a largura e a profundidade da área.");
    }
    for (const area of reservedAreas) {
        if (![
            area.centerX,
            area.centerY,
            area.width,
            area.depth,
        ].every(Number.isFinite) ||
            area.width <= 0 ||
            area.depth <= 0) {
            throw new Error("Existe uma área reservada com medidas inválidas.");
        }
    }
    const diameter = c.roundTableDiameter;
    const radius = diameter / 2;
    const step = diameter + c.roundTableGap;
    const columns = Math.floor((c.width + c.roundTableGap + 1e-9) / step);
    const rows = Math.floor((c.depth + c.roundTableGap + 1e-9) / step);
    if (columns < 1 || rows < 1) {
        throw new Error("Não cabe uma mesa redonda na área disponível.");
    }
    const gridWidth = columns * diameter +
        (columns - 1) * c.roundTableGap;
    const gridDepth = rows * diameter +
        (rows - 1) * c.roundTableGap;
    function overlapsReservedArea(x: number, y: number): boolean {
        return reservedAreas.some((area) => {
            const minX = area.centerX - area.width / 2;
            const maxX = area.centerX + area.width / 2;
            const minY = area.centerY - area.depth / 2;
            const maxY = area.centerY + area.depth / 2;
            const nearestX = Math.max(minX, Math.min(x, maxX));
            const nearestY = Math.max(minY, Math.min(y, maxY));
            const distanceX = x - nearestX;
            const distanceY = y - nearestY;
            return (distanceX * distanceX +
                distanceY * distanceY <
                radius * radius);
        });
    }
    const positions: [
        number,
        number
    ][] = [];
    // Começa pela frente da área, onde Y é negativo.
    for (let row = 0; row < rows; row++) {
        const y = -gridDepth / 2 +
            radius +
            row * step;
        for (let column = 0; column < columns; column++) {
            const x = -gridWidth / 2 +
                radius +
                column * step;
            if (overlapsReservedArea(x, y)) {
                continue;
            }
            positions.push([x, y]);
            if (positions.length === c.roundTableCount) {
                return {
                    positions,
                    generatedCount: positions.length,
                };
            }
        }
    }
    throw new Error(`Foram solicitadas ${c.roundTableCount} mesas, ` +
        `mas esta distribuição comporta ${positions.length}. ` +
        "Ajuste a quantidade, as medidas ou os espaços livres.");
}
export type RectTableConfig = {
    rectTables: boolean;
    rectTableCount: number;
    rectTableWidth: number;
    rectTableDepth: number;
    rectTableHeight: number;
    rectTableTopThickness: number;
    rectTableGap: number;
    rectTableMat: MaterialKind;
};
export const rectTableDefaults: RectTableConfig = {
    rectTables: false,
    rectTableCount: 1,
    rectTableWidth: 1.2,
    rectTableDepth: 0.6,
    rectTableHeight: 0.75,
    rectTableTopThickness: 0.03,
    rectTableGap: 0.8,
    rectTableMat: "white",
};
export type RectTableLayout = {
    positions: [
        number,
        number
    ][];
    generatedCount: number;
};
type RectTableContext = RectTableConfig & {
    width: number;
    depth: number;
};
/**
 * Distribui mesas retangulares sem rotação.
 *
 * A largura acompanha o eixo X.
 * A profundidade acompanha o eixo Y.
 * O vão é medido entre as bordas dos tampos.
 */
export function layoutRectTables(c: RectTableContext, reservedAreas: ReservedArea[]): RectTableLayout {
    if (!c.rectTables) {
        return {
            positions: [],
            generatedCount: 0,
        };
    }
    if (!Number.isInteger(c.rectTableCount) ||
        c.rectTableCount < 1 ||
        c.rectTableCount > 100) {
        throw new Error("Mesas retangulares: use uma quantidade inteira de 1 a 100.");
    }
    const checkRange = (value: number, min: number, max: number, label: string) => {
        if (!Number.isFinite(value) ||
            value < min ||
            value > max) {
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
        }
    };
    checkRange(c.rectTableWidth, 0.4, 4, "Largura da mesa retangular");
    checkRange(c.rectTableDepth, 0.4, 2, "Profundidade da mesa retangular");
    checkRange(c.rectTableHeight, 0.4, 1.2, "Altura da mesa retangular");
    checkRange(c.rectTableTopThickness, 0.01, 0.15, "Espessura do tampo");
    checkRange(c.rectTableGap, 0, 5, "Vão entre mesas retangulares");
    if (!Number.isFinite(c.width) ||
        !Number.isFinite(c.depth) ||
        c.width <= 0 ||
        c.depth <= 0) {
        throw new Error("Confira a largura e a profundidade da área.");
    }
    for (const area of reservedAreas) {
        if (![
            area.centerX,
            area.centerY,
            area.width,
            area.depth,
        ].every(Number.isFinite) ||
            area.width <= 0 ||
            area.depth <= 0) {
            throw new Error("Existe uma área reservada com medidas inválidas.");
        }
    }
    const tableWidth = c.rectTableWidth;
    const tableDepth = c.rectTableDepth;
    const gap = c.rectTableGap;
    const stepX = tableWidth + gap;
    const stepY = tableDepth + gap;
    const columns = Math.floor((c.width + gap + 1e-9) / stepX);
    const rows = Math.floor((c.depth + gap + 1e-9) / stepY);
    if (columns < 1 || rows < 1) {
        throw new Error("Não cabe uma mesa retangular na área disponível.");
    }
    const gridWidth = columns * tableWidth +
        (columns - 1) * gap;
    const gridDepth = rows * tableDepth +
        (rows - 1) * gap;
    function overlapsReservedArea(x: number, y: number): boolean {
        return reservedAreas.some((area) => {
            const overlapsX = Math.abs(x - area.centerX) <
                (tableWidth + area.width) / 2;
            const overlapsY = Math.abs(y - area.centerY) <
                (tableDepth + area.depth) / 2;
            return overlapsX && overlapsY;
        });
    }
    const positions: [
        number,
        number
    ][] = [];
    // Começa pela frente da área, onde Y é negativo.
    for (let row = 0; row < rows; row++) {
        const y = -gridDepth / 2 +
            tableDepth / 2 +
            row * stepY;
        for (let column = 0; column < columns; column++) {
            const x = -gridWidth / 2 +
                tableWidth / 2 +
                column * stepX;
            if (overlapsReservedArea(x, y)) {
                continue;
            }
            positions.push([x, y]);
            if (positions.length === c.rectTableCount) {
                return {
                    positions,
                    generatedCount: positions.length,
                };
            }
        }
    }
    throw new Error(`Foram solicitadas ${c.rectTableCount} mesas retangulares, ` +
        `mas esta distribuição comporta ${positions.length}. ` +
        "Ajuste a quantidade, as medidas ou os espaços livres.");
}

export type BistroTableConfig = {
  bistroTables: boolean;
  bistroTableCount: number;
  bistroTableDiameter: number;
  bistroTableHeight: number;
  bistroTableTopThickness: number;
  bistroTableGap: number;
  bistroTableMat: MaterialKind;
};

export const bistroTableDefaults: BistroTableConfig = {
  bistroTables: false,
  bistroTableCount: 1,
  bistroTableDiameter: 0.6,
  bistroTableHeight: 1.05,
  bistroTableTopThickness: 0.03,
  bistroTableGap: 0.8,
  bistroTableMat: "white",
};
export function layoutBistroTables(
  c: BistroTableConfig & {
    width: number;
    depth: number;
  },
  reservedAreas: ReservedArea[],
): RoundTableLayout {
  const circularConfig: RoundTableContext = {
    width: c.width,
    depth: c.depth,

    roundTables: c.bistroTables,
    roundTableCount: c.bistroTableCount,
    roundTableDiameter: c.bistroTableDiameter,
    roundTableHeight: c.bistroTableHeight,
    roundTableTopThickness: c.bistroTableTopThickness,
    roundTableGap: c.bistroTableGap,
    roundTableMat: c.bistroTableMat,
  };

  try {
    return layoutRoundTables(
      circularConfig,
      reservedAreas,
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        "Mesas bistrô: " + error.message.replace(/mesas redondas/gi, "mesas bistrô")
          .replace(/mesa redonda/gi, "mesa bistrô"),
      );
    }

    throw error;
  }
}