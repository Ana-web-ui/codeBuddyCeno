import { receptionFinishDefaults, receptionDetails, validateReceptionFinishFields } from './reception-finish';
import type { ReceptionFinishConfig } from './reception-finish';

export type ReceptionQueueConfig = {
    receptionQueueEnabled: boolean;
    receptionQueueWidth: number;
    receptionQueueDepth: number;
    receptionExitSide: 'left' | 'right';
}


export const receptionQueueDefaults: ReceptionQueueConfig = {
    receptionQueueEnabled: false,
    receptionQueueWidth: 1,
    receptionQueueDepth: 1.5,
    receptionExitSide: 'right'
}


export type ReceptionConfig = ReceptionQueueConfig & ReceptionFinishConfig & {
    receptionCounterGap: number;
    receptionRowY: number;
    receptionServiceDepth: number;
    receptionTeamDepth: number;
    receptionSideAccessWidth: number;
};

export const receptionDefaults: ReceptionConfig = {
    ...receptionQueueDefaults,
    ...receptionFinishDefaults,
    receptionCounterGap: 0.4,
    receptionRowY: 0.5,
    receptionServiceDepth: 1.2,
    receptionTeamDepth: 1.2,
    receptionSideAccessWidth: 1.2,
};

type ReceptionInput = ReceptionConfig & {
    projectType: string;
    width: number;
    depth: number;
    counter: boolean;
    counterCount: number;
    counterWidth: number;
    counterDepth: number;
    height: number;
};

export type ReceptionZone = {
    name: string;
    x: number;
    y: number;
    width: number;
    depth: number;
};

type ReceptionPoint = {
    x: number;
    y: number;
};

type ReceptionRoute = {
    name: string;
    points: ReceptionPoint[];
};

function receptionFlow(
    c: ReceptionInput,
    rowWidth: number,
    service: ReceptionZone,
    counters: {
        name: string;
        x: number;
        y: number;
        depth: number;
    }[],
) {
    const width = c.receptionQueueWidth;
    const sign = c.receptionExitSide === 'left' ? -1 : 1;

    // Fila e saída ocupam lados opostos da faixa pública.
    const queueX = -sign * (rowWidth - width) / 2;
    const exitX = sign * (rowWidth - width) / 2;

    const serviceFront = service.y - service.depth / 2;
    const distributionY = serviceFront + width / 2;

    const queueFront =
        serviceFront - c.receptionQueueDepth;

    // Mantém o fluxo dentro da margem de 50 cm do projeto.
    const frontY = -c.depth / 2 + 0.5 + width / 2;

    const entrance: ReceptionPoint = {
        x: queueX,
        y: frontY,
    };

    const exit: ReceptionPoint = {
        x: exitX,
        y: frontY,
    };

    const queue: ReceptionZone = {
        name: 'Fila',
        x: queueX,
        y: serviceFront - c.receptionQueueDepth / 2,
        width,
        depth: c.receptionQueueDepth,
    };

    const queueStart: ReceptionPoint = {
        x: queueX,
        y: queueFront + width / 2,
    };

    const distributionStart: ReceptionPoint = {
        x: queueX,
        y: distributionY,
    };

    const distributionEnd: ReceptionPoint = {
        x: exitX,
        y: distributionY,
    };

    const routes: ReceptionRoute[] = [
        {
            name: 'Entrada',
            points: [entrance, queueStart],
        },
        {
            name: 'Fila',
            points: [queueStart, distributionStart],
        },
        {
            name: 'Distribuição',
            points: [distributionStart, distributionEnd],
        },
        ...counters.map(counter => ({
            name: `Acesso ao ${counter.name.toLowerCase()}`,
            points: [
                {
                    x: counter.x,
                    y: distributionY,
                },
                {
                    x: counter.x,
                    y:
                        counter.y -
                        counter.depth / 2 -
                        width / 2,
                },
            ],
        })),
        {
            name: 'Saída',
            points: [distributionEnd, exit],
        },
    ];

    // Retângulos com a largura real de cada trecho.
    const corridors: ReceptionZone[] = routes.flatMap(route =>
        route.points.slice(1).map((end, index) => {
            const start = route.points[index];

            return {
                name: route.name,
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2,
                width: Math.abs(end.x - start.x) + width,
                depth: Math.abs(end.y - start.y) + width,
            };
        }),
    );

    return {
        queue,
        entrance,
        exit,
        routes,
        corridors,
    };
}

export function receptionGeometry(c: ReceptionInput) {
    if (c.projectType !== 'reception') return null;

    // O tampo avança 4 cm para cada lado do corpo.
    const counterWidth = c.counterWidth + 0.08;
    const counterDepth = c.counterDepth + 0.08;
    const count = Math.min(6, Math.max(0, Math.trunc(c.counterCount)));

    const pitch = counterWidth + c.receptionCounterGap;
    const rowWidth =
        count * counterWidth +
        Math.max(0, count - 1) * c.receptionCounterGap;

    const counters = Array.from({ length: count }, (_, index) => ({
        id: `receptionCounter:${index}`,
        name: `Balcão ${index + 1}`,
        x: (index - (count - 1) / 2) * pitch,
        y: c.receptionRowY,
        width: counterWidth,
        depth: counterDepth,
    }));

    // No projeto, Y negativo aponta para a frente.
    const service: ReceptionZone = {
        name: 'Atendimento',
        x: 0,
        y:
            c.receptionRowY -
            counterDepth / 2 -
            c.receptionServiceDepth / 2,
        width: rowWidth,
        depth: c.receptionServiceDepth,
    };

    const team: ReceptionZone = {
        name: 'Equipe',
        x: 0,
        y:
            c.receptionRowY +
            counterDepth / 2 +
            c.receptionTeamDepth / 2,
        width: rowWidth,
        depth: c.receptionTeamDepth,
    };

    const front = service.y - service.depth / 2;
    const back = team.y + team.depth / 2;

    const sideAccesses: ReceptionZone[] = [-1, 1].map(sign => ({
        name: sign < 0 ? 'Acesso esquerdo' : 'Acesso direito',
        x: sign * (rowWidth / 2 + c.receptionSideAccessWidth / 2),
        y: (front + back) / 2,
        width: c.receptionSideAccessWidth,
        depth: back - front,
    }));

    const flow = c.receptionQueueEnabled
        ? receptionFlow(c, rowWidth, service, counters) : null;
    const details = receptionDetails(c, { service, team, flow });
    return {
        counters,
        rowWidth,
        service,
        team,
        sideAccesses,
        zones: [service, team, ...sideAccesses],
        flow,
        details,
    };
}

export function validateReception(c: ReceptionInput) {
    if (c.projectType !== 'reception') return;
    validateReceptionFinishFields(c);

    if (!c.counter) {
        throw new Error('A recepção precisa incluir os balcões.');
    }

    if (
        !Number.isInteger(c.counterCount) ||
        c.counterCount < 1 ||
        c.counterCount > 6
    ) {
        throw new Error('Use de 1 a 6 balcões na recepção.');
    }

    for (const value of [c.counterWidth, c.counterDepth]) {
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error('Informe dimensões válidas para os balcões.');
        }
    }

    const fields = [
        ['receptionCounterGap', 0.1, 2, 'Espaço entre balcões'],
        ['receptionRowY', -15, 15, 'Posição Y da fileira'],
        ['receptionServiceDepth', 0.8, 5, 'Área de atendimento'],
        ['receptionTeamDepth', 0.8, 5, 'Área da equipe'],
        ['receptionSideAccessWidth', 0.8, 3, 'Acessos laterais'],
    ] as const;

    for (const [key, min, max, label] of fields) {
        const value = c[key];

        if (!Number.isFinite(value) || value < min || value > max) {
            throw new Error(
                `${label}: use um valor entre ${min} e ${max} m.`,
            );
        }
    }
    if (typeof c.receptionQueueEnabled !== 'boolean') {
        throw new Error('Informe se a fila está ativada.');
    }

    if (c.receptionQueueEnabled) {
        if (!['left', 'right'].includes(c.receptionExitSide)) {
            throw new Error('Selecione um lado válido para a saída.');
        }

        if (
            !Number.isFinite(c.receptionQueueWidth) ||
            c.receptionQueueWidth < 0.8 ||
            c.receptionQueueWidth > 2
        ) {
            throw new Error('Use uma largura de fila entre 0,8 e 2 m.');
        }

        if (
            !Number.isFinite(c.receptionQueueDepth) ||
            c.receptionQueueDepth < c.receptionQueueWidth ||
            c.receptionQueueDepth > 6
        ) {
            throw new Error(
                'O comprimento da fila deve ser igual ou maior ' +
                'que sua largura, com máximo de 6 m.',
            );
        }

        if (c.receptionServiceDepth < c.receptionQueueWidth) {
            throw new Error(
                'A profundidade do atendimento deve comportar ' +
                'a largura do percurso.',
            );
        }
    }
    const layout = receptionGeometry(c)!;
    const margin = 0.5;
    const epsilon = 1e-7;

    for (const zone of [...layout.counters, ...layout.zones]) {
        if (
            Math.abs(zone.x) + zone.width / 2 >
                c.width / 2 - margin + epsilon ||
            Math.abs(zone.y) + zone.depth / 2 >
                c.depth / 2 - margin + epsilon
        ) {
            throw new Error(
                `${zone.name} não cabe na área da recepção. ` +
                'Aumente a área, reduza as medidas ou ajuste a posição da fileira.',
            );
        }
    }
    const occupied = [...layout.counters, ...layout.zones,
        ...(layout.flow ? [layout.flow.queue, ...layout.flow.corridors] : [])];
    for (const [index, zone] of layout.details.footprints.entries()) {
        if (Math.abs(zone.x) + zone.width / 2 > c.width / 2 - margin + epsilon ||
            Math.abs(zone.y) + zone.depth / 2 > c.depth / 2 - margin + epsilon) {
            throw new Error(`${zone.name} não cabe na recepção. Aumente a área ou ajuste as medidas.`);
        }
        const overlaps = (other: typeof zone) =>
            Math.abs(zone.x - other.x) < (zone.width + other.width) / 2 - epsilon &&
            Math.abs(zone.y - other.y) < (zone.depth + other.depth) / 2 - epsilon;
        const obstacle = [...occupied, ...layout.details.footprints.slice(0, index)].find(overlaps);
        if (obstacle) throw new Error(`${zone.name} invade ${obstacle.name.toLowerCase()}. Ajuste a fila, a sinalização ou a área disponível.`);
    }
    if (layout.flow) {
        const flow = layout.flow;
        const width = c.receptionQueueWidth;

        // Mantém fila e saída separadas por pelo menos 20 cm.
        if (layout.rowWidth < 2 * width + 0.2 - epsilon) {
            throw new Error(
                'A fileira precisa ser mais larga para separar fila e saída. ' +
                'Aumente a largura ou a quantidade de balcões.',
            );
        }

        const queueFront =
            flow.queue.y - flow.queue.depth / 2;

        const frontLimit = -c.depth / 2 + margin;

        if (queueFront < frontLimit + 0.2 - epsilon) {
            throw new Error(
                'Falta espaço para conectar a entrada à fila. ' +
                'Reduza seu comprimento, aumente a profundidade do projeto ' +
                'ou mova os balcões para o fundo.',
            );
        }

        const overlaps = (
            a: ReceptionZone,
            b: ReceptionZone,
        ) =>
            Math.abs(a.x - b.x) <
                (a.width + b.width) / 2 - epsilon &&
            Math.abs(a.y - b.y) <
                (a.depth + b.depth) / 2 - epsilon;

        const obstacles = [
            ...layout.counters,
            layout.team,
            ...layout.sideAccesses,
        ];

        for (const zone of [flow.queue, ...flow.corridors]) {
            if (
                Math.abs(zone.x) + zone.width / 2 >
                    c.width / 2 - margin + epsilon ||
                Math.abs(zone.y) + zone.depth / 2 >
                    c.depth / 2 - margin + epsilon
            ) {
                throw new Error(
                    `${zone.name} ultrapassa a área disponível da recepção.`,
                );
            }

            const obstacle = obstacles.find(item =>
                overlaps(zone, item),
            );

            if (obstacle) {
                throw new Error(
                    `${zone.name} invade ${obstacle.name.toLowerCase()}. ` +
                    'Ajuste as medidas da recepção.',
                );
            }
        }
    }
}
