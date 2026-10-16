/** Catálogo dos componentes que já possuem geração no Code Buddy. */
import type { MaterialKind } from "./generator";
export const libraryCatalog = [
    { id: 'coffeeTables', label: 'Mesas de centro', projectTypes: ['stand', 'palco'] },
    { id: 'armchairs', label: 'Poltronas', projectTypes: ['stand', 'palco'] },
    { id: 'puffs', label: 'Puffs', projectTypes: ['stand', 'palco'] },
    { id: 'pedestals', label: 'Pedestais expositores', projectTypes: ['stand', 'palco'] },
    { id: "led", label: "Painel de LED", projectTypes: ["stand", "palco"] },
    { id: "counter", label: "Balcão", projectTypes: ["stand"] },
    { id: "stage", label: "Palco", projectTypes: ["stand", "palco"] },
    { id: "totem", label: "Totem", projectTypes: ["stand"] },
    { id: "spots", label: "Spots laterais", projectTypes: ["stand", "palco"], },
    { id: "chairs", label: "Cadeiras", projectTypes: ["palco"] },
    { id: "roundTables", label: "Mesas Redondas", projectTypes: ["stand", "palco"], },
    { id: "rectTables", label: "Mesas Retangulares", projectTypes: ["stand", "palco"], },
    { id: "bistroTables", label: "Mesas Bistrô", projectTypes: ["stand", "palco"] },
    { id: "stools", label: "Banquetas", projectTypes: ["stand", "palco"] },
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
export function layoutBistroTables(c: BistroTableConfig & {
    width: number;
    depth: number;
}, reservedAreas: ReservedArea[]): RoundTableLayout {
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
        return layoutRoundTables(circularConfig, reservedAreas);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error("Mesas bistrô: " + error.message.replace(/mesas redondas/gi, "mesas bistrô")
                .replace(/mesa redonda/gi, "mesa bistrô"));
        }
        throw error;
    }
}
export type StoolConfig = {
    stoolDistribution: StoolDistribution;
    stoolsPerBistro: number;
    stoolBistroGap: number;
    stools: boolean;
    stoolCount: number;
    stoolSeatDiameter: number;
    stoolSeatHeight: number;
    stoolSeatThickness: number;
    stoolGap: number;
    stoolMat: MaterialKind;
};
export const stoolDefaults: StoolConfig = {
    stoolDistribution: "free",
    stoolsPerBistro: 2,
    stoolBistroGap: 0.15,
    stools: false,
    stoolCount: 2,
    stoolSeatDiameter: 0.4,
    stoolSeatHeight: 0.75,
    stoolSeatThickness: 0.04,
    stoolGap: 0.4,
    stoolMat: "white",
};
export type StoolLayout = {
    positions: [
        number,
        number
    ][];
    generatedCount: number;
};
type StoolContext = StoolConfig & {
    width: number;
    depth: number;
};
/**
 * Distribui banquetas avulsas em uma grade.
 *
 * stoolGap é o vão livre entre as bordas dos assentos.
 * reservedAreas informa os espaços que devem ficar livres.
 */
export function layoutStools(c: StoolContext, reservedAreas: ReservedArea[]): StoolLayout {
    if (!c.stools) {
        return {
            positions: [],
            generatedCount: 0,
        };
    }
    if (!Number.isInteger(c.stoolCount) ||
        c.stoolCount < 1 ||
        c.stoolCount > 100) {
        throw new Error("Banquetas: use uma quantidade inteira de 1 a 100.");
    }
    const dimensions = [
        [c.stoolSeatDiameter, 0.25, 0.8, "Diâmetro do assento"],
        [c.stoolSeatHeight, 0.4, 1, "Altura do assento"],
        [c.stoolSeatThickness, 0.02, 0.12, "Espessura do assento"],
        [c.stoolGap, 0, 3, "Vão entre banquetas"],
    ] as const;
    for (const [value, min, max, label] of dimensions) {
        if (!Number.isFinite(value) ||
            value < min ||
            value > max) {
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
        }
    }
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
    const diameter = c.stoolSeatDiameter;
    const radius = diameter / 2;
    const step = diameter + c.stoolGap;
    const columns = Math.floor((c.width + c.stoolGap + 1e-9) / step);
    const rows = Math.floor((c.depth + c.stoolGap + 1e-9) / step);
    if (columns < 1 || rows < 1) {
        throw new Error("Não cabe uma banqueta na área disponível.");
    }
    const gridWidth = columns * diameter +
        (columns - 1) * c.stoolGap;
    const gridDepth = rows * diameter +
        (rows - 1) * c.stoolGap;
    function overlapsReservedArea(x: number, y: number): boolean {
        return reservedAreas.some((area) => {
            const nearestX = Math.max(area.centerX - area.width / 2, Math.min(x, area.centerX + area.width / 2));
            const nearestY = Math.max(area.centerY - area.depth / 2, Math.min(y, area.centerY + area.depth / 2));
            const dx = x - nearestX;
            const dy = y - nearestY;
            return dx * dx + dy * dy < radius * radius;
        });
    }
    const positions: [
        number,
        number
    ][] = [];
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
            if (positions.length === c.stoolCount) {
                return {
                    positions,
                    generatedCount: positions.length,
                };
            }
        }
    }
    throw new Error(`Foram solicitadas ${c.stoolCount} banquetas, ` +
        `mas esta distribuição comporta ${positions.length}. ` +
        "Ajuste a quantidade, as medidas ou os espaços livres.");
}
/** Distribuição avulsa ou associada aos bistrôs. */
export type StoolDistribution = "free" | "bistro";
export function validateStoolAssociation(c: StoolConfig & BistroTableConfig) {
    if (!c.stools)
        return;
    if (c.stoolDistribution !== "free" && c.stoolDistribution !== "bistro") {
        throw new Error("Selecione uma distribuição válida para as banquetas.");
    }
    if (c.stoolDistribution === "free")
        return;
    if (!c.bistroTables)
        throw new Error("Ative as mesas bistrô para associar as banquetas.");
    if (!Number.isInteger(c.stoolsPerBistro) || c.stoolsPerBistro < 1 || c.stoolsPerBistro > 6) {
        throw new Error("Use uma quantidade inteira de 1 a 6 banquetas por bistrô.");
    }
    if (!Number.isFinite(c.stoolBistroGap) || c.stoolBistroGap < 0 || c.stoolBistroGap > 2) {
        throw new Error("Distância entre tampo e assentos: use um valor entre 0 e 2 m.");
    }
    if (!Number.isInteger(c.bistroTableCount) || c.bistroTableCount < 1 || c.bistroTableCount > 100) {
        throw new Error("Mesas bistrô: use uma quantidade inteira de 1 a 100.");
    }
    if (c.bistroTableCount * c.stoolsPerBistro > 100) {
        throw new Error("O conjunto pode gerar até 100 banquetas. Reduza os bistrôs ou os assentos por mesa.");
    }
}
export function stoolsAroundBistro(centerX: number, centerY: number, tableDiameter: number, seatDiameter: number, count: number, tableSeatGap: number, seatGap: number): [
    number,
    number
][] {
    if (![centerX, centerY, tableDiameter, seatDiameter, tableSeatGap, seatGap].every(Number.isFinite) ||
        tableDiameter <= 0 || seatDiameter <= 0 || tableSeatGap < 0 || seatGap < 0) {
        throw new Error("Confira as medidas e os espaços do conjunto bistrô com banquetas.");
    }
    if (!Number.isInteger(count) || count < 1 || count > 6) {
        throw new Error("Use uma quantidade inteira de 1 a 6 banquetas por bistrô.");
    }
    const radius = tableDiameter / 2 + tableSeatGap + seatDiameter / 2;
    if (count > 1 && 2 * radius * Math.sin(Math.PI / count) + 1e-9 < seatDiameter + seatGap) {
        throw new Error("As banquetas ficam próximas demais. Reduza os assentos por mesa ou aumente a distância entre tampo e assentos.");
    }
    return Array.from({ length: count }, (_, index) => {
        const angle = -Math.PI / 2 + 2 * Math.PI * index / count;
        return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius];
    });
}
/** Reserva uma envoltória circular para a mesa e todos os assentos. */
export function layoutBistroStoolSets(c: BistroTableConfig & StoolConfig & {
    width: number;
    depth: number;
}, reservedAreas: ReservedArea[]): {
    tables: RoundTableLayout;
    stools: StoolLayout;
} {
    validateStoolAssociation(c);
    // Verifica também se a quantidade de assentos respeita o vão entre vizinhos.
    const offsets = stoolsAroundBistro(0, 0, c.bistroTableDiameter, c.stoolSeatDiameter, c.stoolsPerBistro, c.stoolBistroGap, c.stoolGap);
    const radius = c.bistroTableDiameter / 2 + c.stoolBistroGap + c.stoolSeatDiameter;
    const diameter = 2 * radius;
    const gap = Math.max(c.bistroTableGap, c.stoolGap);
    if (![c.width, c.depth, diameter, gap].every(Number.isFinite) ||
        c.width <= 0 || c.depth <= 0 || diameter <= 0 || gap < 0) {
        throw new Error("Confira as medidas da área e do conjunto bistrô com banquetas.");
    }
    for (const a of reservedAreas) {
        if (![a.centerX, a.centerY, a.width, a.depth].every(Number.isFinite) || a.width <= 0 || a.depth <= 0) {
            throw new Error("Existe uma área reservada com medidas inválidas.");
        }
    }
    const step = diameter + gap;
    const columns = Math.floor((c.width + gap + 1e-9) / step);
    const rows = Math.floor((c.depth + gap + 1e-9) / step);
    const gridWidth = columns * diameter + Math.max(0, columns - 1) * gap;
    const gridDepth = rows * diameter + Math.max(0, rows - 1) * gap;
    const positions: [
        number,
        number
    ][] = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const x = -gridWidth / 2 + radius + column * step;
            const y = -gridDepth / 2 + radius + row * step;
            const blocked = reservedAreas.some(a => {
                const dx = Math.max(0, Math.abs(x - a.centerX) - a.width / 2);
                const dy = Math.max(0, Math.abs(y - a.centerY) - a.depth / 2);
                return dx * dx + dy * dy < radius * radius;
            });
            if (blocked)
                continue;
            positions.push([x, y]);
            if (positions.length === c.bistroTableCount)
                break;
        }
        if (positions.length === c.bistroTableCount)
            break;
    }
    if (positions.length !== c.bistroTableCount) {
        throw new Error(`Foram solicitados ${c.bistroTableCount} conjuntos de bistrô com banquetas, mas esta grade comporta ${positions.length}. Ajuste a quantidade, as medidas ou os espaços livres.`);
    }
    const seats: [
        number,
        number
    ][] = [];
    for (const [x, y] of positions)
        for (const [dx, dy] of offsets)
            seats.push([x + dx, y + dy]);
    return {
        tables: { positions, generatedCount: positions.length },
        stools: { positions: seats, generatedCount: seats.length },
    };
}
export type TableChairConfig = {
    roundTableChairs: boolean;
    roundTableChairsPerTable: number;
    rectTableChairs: boolean;
    rectTableChairsPerTable: number;
    tableChairWidth: number;
    tableChairDepth: number;
    tableChairHeight: number;
    tableChairSeatHeight: number;
    tableChairTableGap: number;
    tableChairGap: number;
};
export const tableChairDefaults: TableChairConfig = {
    roundTableChairs: false, roundTableChairsPerTable: 4,
    rectTableChairs: false, rectTableChairsPerTable: 4,
    tableChairWidth: 0.5, tableChairDepth: 0.5,
    tableChairHeight: 0.9, tableChairSeatHeight: 0.45,
    tableChairTableGap: 0.15, tableChairGap: 0.1,
};
export type TableChairLayout = {
    positions: [
        number,
        number
    ][];
    rotations: number[];
    rows: number;
    generatedCount: number;
};
type TableSeatingContext = TableChairConfig & RoundTableConfig & RectTableConfig & {
    width: number;
    depth: number;
    height: number;
};
export function validateTableChairs(c: TableSeatingContext) {
    if (typeof c.roundTableChairs !== 'boolean' || typeof c.rectTableChairs !== 'boolean')
        throw new Error('Seleção de cadeiras das mesas inválida.');
    const round = c.roundTables && c.roundTableChairs;
    const rect = c.rectTables && c.rectTableChairs;
    if (!round && !rect)
        return;
    for (const [v, min, max, label] of [
        [c.tableChairWidth, .3, 1.2, 'Largura das cadeiras das mesas'],
        [c.tableChairDepth, .3, 1.2, 'Profundidade das cadeiras das mesas'],
        [c.tableChairHeight, .65, 1.5, 'Altura das cadeiras das mesas'],
        [c.tableChairSeatHeight, .3, .7, 'Altura do assento das cadeiras das mesas'],
        [c.tableChairTableGap, 0, 2, 'Distância entre mesa e cadeiras'],
        [c.tableChairGap, 0, 2, 'Vão entre cadeiras das mesas'],
    ] as const)
        if (!Number.isFinite(v) || v < min || v > max)
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
    if (c.tableChairHeight < c.tableChairSeatHeight + .15 || c.tableChairHeight > c.height)
        throw new Error('Confira as alturas do assento, do encosto e da montagem para as cadeiras das mesas.');
    let total = 0;
    for (const [active, count, max, tableCount, tableHeight, thickness, label] of [
        [round, c.roundTableChairsPerTable, 10, c.roundTableCount, c.roundTableHeight, c.roundTableTopThickness, 'redonda'],
        [rect, c.rectTableChairsPerTable, 12, c.rectTableCount, c.rectTableHeight, c.rectTableTopThickness, 'retangular'],
    ] as const)
        if (active) {
            if (!Number.isInteger(count) || count < 1 || count > max)
                throw new Error(`Mesa ${label}: use de 1 a ${max} cadeiras por mesa.`);
            if (c.tableChairSeatHeight + .05 >= tableHeight - thickness)
                throw new Error(`O assento das cadeiras deve ficar abaixo da face inferior do tampo da mesa ${label}.`);
            total += count * tableCount;
        }
    if (total > 1000)
        throw new Error('Os conjuntos de mesas podem gerar até 1.000 cadeiras. Reduza as quantidades.');
}
/** Geometria e orientação de um conjunto; +Y é a frente da cadeira. */
export function tableChairFootprint(c: TableSeatingContext, kind: 'round' | 'rect') {
    validateTableChairs(c);
    const count = kind === 'round' ? c.roundTableChairsPerTable : c.rectTableChairsPerTable;
    const offsets: [
        number,
        number,
        number
    ][] = [];
    const w = c.tableChairWidth, d = c.tableChairDepth, gap = c.tableChairTableGap;
    if (kind === 'round') {
        const r = c.roundTableDiameter / 2 + gap + d / 2;
        // Círculos que envolvem cada assento garantem separação, mesmo com rotação.
        if (count > 1 && 2 * r * Math.sin(Math.PI / count) + 1e-9 < Math.hypot(w, d) + c.tableChairGap)
            throw new Error('As cadeiras ficam próximas demais ao redor da mesa redonda. Reduza a quantidade por mesa ou aumente a distância até a mesa.');
        for (let i = 0; i < count; i++) {
            const a = -Math.PI / 2 + 2 * Math.PI * i / count;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            offsets.push([x, y, Math.atan2(x, -y)]);
        }
        const outer = Math.hypot(r + d / 2, w / 2);
        return { width: 2 * outer, depth: 2 * outer, offsets };
    }
    // Retangulares: cadeiras distribuídas nos dois lados paralelos à largura.
    const south = Math.ceil(count / 2), north = count - south;
    for (const [n, sign] of [[south, -1], [north, 1]]) {
        const occupied = n * w + Math.max(0, n - 1) * c.tableChairGap;
        if (occupied > c.rectTableWidth + 1e-9)
            throw new Error('As cadeiras não cabem nos lados da mesa retangular. Aumente a largura da mesa ou reduza as cadeiras e seus vãos.');
        for (let i = 0; i < n; i++)
            offsets.push([-occupied / 2 + w / 2 + i * (w + c.tableChairGap), sign * (c.rectTableDepth / 2 + gap + d / 2), sign < 0 ? 0 : Math.PI]);
    }
    return { width: c.rectTableWidth, depth: c.rectTableDepth + 2 * (gap + d), offsets };
}
/** Reserva um retângulo para mesa e cadeiras; não encolhe os espaços. */
export function layoutTablesWithChairs(c: TableSeatingContext, kind: 'round' | 'rect', reserved: ReservedArea[]) {
    const count = kind === 'round' ? c.roundTableCount : c.rectTableCount;
    // Reaproveita as validações dos parâmetros da mesa com uma unidade.
    if (kind === 'round')
        layoutRoundTables({ ...c, roundTableCount: 1 }, []);
    else
        layoutRectTables({ ...c, rectTableCount: 1 }, []);
    if (!Number.isInteger(count) || count < 1 || count > 100)
        throw new Error('Use de 1 a 100 mesas por tipo.');
    const footprint = tableChairFootprint(c, kind);
    const gap = Math.max(kind === 'round' ? c.roundTableGap : c.rectTableGap, c.tableChairGap);
    const columns = Math.floor((c.width + gap + 1e-9) / (footprint.width + gap));
    const rows = Math.floor((c.depth + gap + 1e-9) / (footprint.depth + gap));
    const fullW = columns * footprint.width + Math.max(0, columns - 1) * gap;
    const fullD = rows * footprint.depth + Math.max(0, rows - 1) * gap;
    const positions: [
        number,
        number
    ][] = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const x = -fullW / 2 + footprint.width / 2 + col * (footprint.width + gap);
            const y = -fullD / 2 + footprint.depth / 2 + row * (footprint.depth + gap);
            if (reserved.some(a => Math.abs(x - a.centerX) < (footprint.width + a.width) / 2 && Math.abs(y - a.centerY) < (footprint.depth + a.depth) / 2))
                continue;
            positions.push([x, y]);
            if (positions.length === count)
                break;
        }
        if (positions.length === count)
            break;
    }
    if (positions.length !== count)
        throw new Error(`Foram solicitados ${count} conjuntos de mesa ${kind === 'round' ? 'redonda' : 'retangular'} com cadeiras, mas esta grade comporta ${positions.length}. Ajuste as medidas ou as quantidades.`);
    const chairs: TableChairLayout = { positions: [], rotations: [], rows: 0, generatedCount: 0 };
    for (const [x, y] of positions)
        for (const [dx, dy, angle] of footprint.offsets) {
            chairs.positions.push([x + dx, y + dy]);
            chairs.rotations.push(angle);
        }
    chairs.generatedCount = chairs.positions.length;
    return { tables: { positions, generatedCount: positions.length }, chairs, footprint };
}
export type PedestalConfig = {
    pedestals: boolean;
    pedestalCount: number;
    pedestalWidth: number;
    pedestalDepth: number;
    pedestalHeight: number;
    pedestalGap: number;
    pedestalMat: MaterialKind;
};
export const pedestalDefaults: PedestalConfig = {
    pedestals: false,
    pedestalCount: 1,
    pedestalWidth: 0.5,
    pedestalDepth: 0.5,
    pedestalHeight: 1,
    pedestalGap: 0.5,
    pedestalMat: 'white',
};
export type PedestalLayout = {
    positions: [
        number,
        number
    ][];
    generatedCount: number;
};
export function layoutPedestals(c: PedestalConfig & {
    width: number;
    depth: number;
    height: number;
}, reserved: ReservedArea[]): PedestalLayout {
    if (!c.pedestals)
        return { positions: [], generatedCount: 0 };
    if (!Number.isInteger(c.pedestalCount) || c.pedestalCount < 1 || c.pedestalCount > 100)
        throw new Error('Pedestais: use uma quantidade inteira de 1 a 100.');
    for (const [v, min, max, label] of [
        [c.pedestalWidth, .2, 3, 'Largura do pedestal'], [c.pedestalDepth, .2, 3, 'Profundidade do pedestal'],
        [c.pedestalHeight, .2, 3, 'Altura do pedestal'], [c.pedestalGap, 0, 3, 'Vão entre pedestais'],
    ] as const)
        if (!Number.isFinite(v) || v < min || v > max)
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
    if (![c.width, c.depth, c.height].every(Number.isFinite) || c.width <= 0 || c.depth <= 0 || c.height <= 0)
        throw new Error('Confira as medidas da área de montagem.');
    if (c.pedestalHeight > c.height)
        throw new Error('O pedestal deve caber na altura da montagem.');
    for (const a of reserved)
        if (![a.centerX, a.centerY, a.width, a.depth].every(Number.isFinite) || a.width <= 0 || a.depth <= 0)
            throw new Error('Existe uma área reservada com medidas inválidas.');
    const w = c.pedestalWidth, d = c.pedestalDepth, gap = c.pedestalGap;
    const cols = Math.floor((c.width + gap + 1e-9) / (w + gap)), rows = Math.floor((c.depth + gap + 1e-9) / (d + gap));
    const fullW = cols * w + Math.max(0, cols - 1) * gap, fullD = rows * d + Math.max(0, rows - 1) * gap;
    const positions: [
        number,
        number
    ][] = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = -fullW / 2 + w / 2 + col * (w + gap), y = -fullD / 2 + d / 2 + row * (d + gap);
            if (reserved.some(a => Math.abs(x - a.centerX) < (w + a.width) / 2 && Math.abs(y - a.centerY) < (d + a.depth) / 2))
                continue;
            positions.push([x, y]);
            if (positions.length === c.pedestalCount)
                return { positions, generatedCount: positions.length };
        }
    }
    throw new Error(`Foram solicitados ${c.pedestalCount} pedestais, mas esta distribuição comporta ${positions.length}. Ajuste a quantidade, as medidas ou os espaços livres.`);
}
export type LoungeConfig = {
    armchairs: boolean;
    armchairCount: number;
    armchairWidth: number;
    armchairDepth: number;
    armchairHeight: number;
    armchairSeatHeight: number;
    armchairGap: number;
    armchairMat: MaterialKind;
    puffs: boolean;
    puffCount: number;
    puffWidth: number;
    puffDepth: number;
    puffHeight: number;
    puffGap: number;
    puffMat: MaterialKind;
};
export const loungeDefaults: LoungeConfig = {
    armchairs: false, armchairCount: 1, armchairWidth: .85, armchairDepth: .8,
    armchairHeight: .9, armchairSeatHeight: .45, armchairGap: .6, armchairMat: 'plastic',
    puffs: false, puffCount: 2, puffWidth: .5, puffDepth: .5, puffHeight: .45, puffGap: .4, puffMat: 'plastic',
};
export type LoungeLayout = {
    positions: [
        number,
        number
    ][];
    generatedCount: number;
};
type LoungeContext = LoungeConfig & {
    width: number;
    depth: number;
    height: number;
};
export function validateLounge(c: LoungeContext) {
    for (const [active, count, label] of [[c.armchairs, c.armchairCount, 'Poltronas'], [c.puffs, c.puffCount, 'Puffs']] as const) {
        if (typeof active !== 'boolean')
            throw new Error('Seleção de poltronas e puffs inválida.');
        if (active && (!Number.isInteger(count) || count < 1 || count > 100))
            throw new Error(`${label}: use uma quantidade inteira de 1 a 100.`);
    }
    const check = (value: number, min: number, max: number, label: string) => {
        if (!Number.isFinite(value) || value < min || value > max)
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
    };
    if (c.armchairs) {
        check(c.armchairWidth, .6, 1.5, 'Largura da poltrona');
        check(c.armchairDepth, .6, 1.5, 'Profundidade da poltrona');
        check(c.armchairHeight, .7, 1.5, 'Altura total da poltrona');
        check(c.armchairSeatHeight, .3, .65, 'Altura do assento da poltrona');
        check(c.armchairGap, 0, 3, 'Vão entre poltronas');
        if (c.armchairHeight < c.armchairSeatHeight + .2)
            throw new Error('A altura total da poltrona deve ser pelo menos 0,20 m maior que a altura do assento.');
        if (c.armchairHeight > c.height)
            throw new Error('A poltrona deve caber na altura da montagem.');
    }
    if (c.puffs) {
        check(c.puffWidth, .3, 2, 'Largura do puff');
        check(c.puffDepth, .3, 2, 'Profundidade do puff');
        check(c.puffHeight, .2, .8, 'Altura do puff');
        check(c.puffGap, 0, 3, 'Vão entre puffs');
        if (c.puffHeight > c.height)
            throw new Error('O puff deve caber na altura da montagem.');
    }
}
export function layoutArmchairs(c: LoungeContext, reserved: ReservedArea[]): LoungeLayout {
    if (!c.armchairs)
        return { positions: [], generatedCount: 0 };
    validateLounge(c);
    try {
        return layoutPedestals({ width: c.width, depth: c.depth, height: c.height, pedestals: true,
            pedestalCount: c.armchairCount, pedestalWidth: c.armchairWidth, pedestalDepth: c.armchairDepth,
            pedestalHeight: c.armchairHeight, pedestalGap: c.armchairGap, pedestalMat: c.armchairMat }, reserved);
    }
    catch (error) {
        if (error instanceof Error)
            throw new Error(error.message.replace(/Foram solicitados/g, 'Foram solicitadas').replace(/pedestais/gi, 'poltronas').replace(/pedestal/gi, 'poltrona'));
        throw error;
    }
}
export function layoutPuffs(c: LoungeContext, reserved: ReservedArea[]): LoungeLayout {
    if (!c.puffs)
        return { positions: [], generatedCount: 0 };
    validateLounge(c);
    try {
        return layoutPedestals({ width: c.width, depth: c.depth, height: c.height, pedestals: true,
            pedestalCount: c.puffCount, pedestalWidth: c.puffWidth, pedestalDepth: c.puffDepth,
            pedestalHeight: c.puffHeight, pedestalGap: c.puffGap, pedestalMat: c.puffMat }, reserved);
    }
    catch (error) {
        if (error instanceof Error)
            throw new Error(error.message.replace(/pedestais/gi, 'puffs').replace(/pedestal/gi, 'puff'));
        throw error;
    }
}
export type CoffeeTableConfig = {
    coffeeTables: boolean;
    coffeeTableCount: number;
    coffeeTableWidth: number;
    coffeeTableDepth: number;
    coffeeTableHeight: number;
    coffeeTableTopThickness: number;
    coffeeTableGap: number;
    coffeeTableMat: MaterialKind;
};
export const coffeeTableDefaults: CoffeeTableConfig = {
    coffeeTables: false, coffeeTableCount: 1, coffeeTableWidth: .9, coffeeTableDepth: .5,
    coffeeTableHeight: .4, coffeeTableTopThickness: .03, coffeeTableGap: .5, coffeeTableMat: 'wood',
};
export type CoffeeTableLayout = {
    positions: [
        number,
        number
    ][];
    generatedCount: number;
};
export function layoutCoffeeTables(c: CoffeeTableConfig & {
    width: number;
    depth: number;
    height: number;
}, reserved: ReservedArea[]): CoffeeTableLayout {
    if (!c.coffeeTables)
        return { positions: [], generatedCount: 0 };
    if (!Number.isInteger(c.coffeeTableCount) || c.coffeeTableCount < 1 || c.coffeeTableCount > 100)
        throw new Error('Mesas de centro: use uma quantidade inteira de 1 a 100.');
    for (const [v, min, max, label] of [
        [c.coffeeTableWidth, .4, 2.5, 'Largura da mesa de centro'], [c.coffeeTableDepth, .3, 1.5, 'Profundidade da mesa de centro'],
        [c.coffeeTableHeight, .2, .65, 'Altura da mesa de centro'], [c.coffeeTableTopThickness, .02, .12, 'Espessura do tampo da mesa de centro'],
        [c.coffeeTableGap, 0, 3, 'Vão entre mesas de centro'],
    ] as const)
        if (!Number.isFinite(v) || v < min || v > max)
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
    try {
        return layoutPedestals({ width: c.width, depth: c.depth, height: c.height, pedestals: true,
            pedestalCount: c.coffeeTableCount, pedestalWidth: c.coffeeTableWidth, pedestalDepth: c.coffeeTableDepth,
            pedestalHeight: c.coffeeTableHeight, pedestalGap: c.coffeeTableGap, pedestalMat: c.coffeeTableMat }, reserved);
    }
    catch (error) {
        if (error instanceof Error)
            throw new Error(error.message.replace(/Foram solicitados/g, 'Foram solicitadas').replace(/pedestais/gi, 'mesas de centro').replace(/pedestal/gi, 'mesa de centro'));
        throw error;
    }
}
