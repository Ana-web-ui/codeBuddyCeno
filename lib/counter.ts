import type { MaterialKind } from './generator';

export type CounterConfig = {
    counterDetailed: boolean;
    counterTopThickness: number;
    counterBaseHeight: number;
    counterBaseInset: number;
    counterTopMat: MaterialKind;
    counterBaseMat: MaterialKind;
};

/** Padrões de migração mantêm a construção dos arquivos anteriores. */
export const counterDefaults: CounterConfig = {
    counterDetailed: false,
    counterTopThickness: 0.06,
    counterBaseHeight: 0.08,
    counterBaseInset: 0.03,
    counterTopMat: 'white',
    counterBaseMat: 'metal',
};

type CounterInput = CounterConfig & {
    counter: boolean;
    counterWidth: number;
    counterDepth: number;
    counterHeight: number;
    counterMat: MaterialKind;
};

export function validateCounter(c: CounterInput) {
    if (typeof c.counterDetailed !== 'boolean') throw new Error('Selecione um acabamento válido para o balcão.');
    for (const [key, min, max, label] of [
        ['counterTopThickness', .02, .15, 'Espessura do tampo'],
        ['counterBaseHeight', .02, .2, 'Altura do rodapé'],
        ['counterBaseInset', 0, .1, 'Recuo do rodapé'],
    ] as const) {
        if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max) {
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
        }
    }
    if (!c.counter || !c.counterDetailed) return;
    if (c.counterHeight - c.counterTopThickness - c.counterBaseHeight < .1 - 1e-7) {
        throw new Error('O balcão precisa reservar pelo menos 10 cm para o corpo, além do tampo e do rodapé.');
    }
    if (Math.min(c.counterWidth, c.counterDepth) - 2 * c.counterBaseInset < .04 - 1e-7) {
        throw new Error('Reduza o recuo do rodapé para que ele caiba sob o balcão.');
    }
}

/** O acabamento divide a altura existente sem alterar o volume externo do balcão. */
export function counterParts(c: CounterInput) {
    const base = c.counterDetailed ? c.counterBaseHeight : 0;
    const top = c.counterDetailed ? c.counterTopThickness : .06;
    const bodyHeight = c.counterHeight - top - base;
    const parts = [
        { name: 'Balcao_Corpo', role: 'counter_body',
            size: [c.counterWidth, c.counterDepth, bodyHeight],
            z: .1 + base + bodyHeight / 2, material: c.counterMat },
        { name: 'Balcao_Tampo', role: 'counter_top',
            size: [c.counterWidth + .08, c.counterDepth + .08, top],
            z: .1 + c.counterHeight - top / 2,
            material: c.counterDetailed ? c.counterTopMat : 'white' as MaterialKind },
    ];
    if (c.counterDetailed) parts.push({
        name: 'Balcao_Rodape', role: 'counter_base',
        size: [c.counterWidth - 2 * c.counterBaseInset,
            c.counterDepth - 2 * c.counterBaseInset, base],
        z: .1 + base / 2, material: c.counterBaseMat,
    });
    return parts;
}
