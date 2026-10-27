export type ReceptionConfig = {
    receptionCounterGap: number;
    receptionRowY: number;
    receptionServiceDepth: number;
    receptionTeamDepth: number;
    receptionSideAccessWidth: number;
};

export const receptionDefaults: ReceptionConfig = {
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
};

export type ReceptionZone = {
    name: string;
    x: number;
    y: number;
    width: number;
    depth: number;
};

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

    return {
        counters,
        rowWidth,
        service,
        team,
        sideAccesses,
        zones: [service, team, ...sideAccesses],
    };
}

export function validateReception(c: ReceptionInput) {
    if (c.projectType !== 'reception') return;

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
}