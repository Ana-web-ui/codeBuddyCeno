import type { MaterialKind } from './generator';

export type ShelvingConfig = {
    shelfDetailed: boolean;
    shelfBoardThickness: number;
    shelfBackEnabled: boolean;
    shelfBackThickness: number;
    shelfBaseEnabled: boolean;
    shelfBaseHeight: number;
    shelfBaseInset: number;
    shelfShelfMat: MaterialKind;
    shelfBackMat: MaterialKind;
    shelfBaseMat: MaterialKind;
};

/** Mantém a geometria original dos arquivos anteriores até ativar o detalhamento. */
export const shelvingDefaults: ShelvingConfig = {
    shelfDetailed: false,
    shelfBoardThickness: .03,
    shelfBackEnabled: true,
    shelfBackThickness: .02,
    shelfBaseEnabled: true,
    shelfBaseHeight: .08,
    shelfBaseInset: .03,
    shelfShelfMat: 'white',
    shelfBackMat: 'white',
    shelfBaseMat: 'metal',
};

export type ShelvingInput = ShelvingConfig & {
    shelving: boolean;
    shelfWidth: number;
    shelfDepth: number;
    shelfHeight: number;
    shelfShelfCount: number;
    shelfMat: MaterialKind;
};

export function shelvingSpace(c: ShelvingInput) {
    const t = c.shelfDetailed ? c.shelfBoardThickness : .03;
    const base = c.shelfDetailed && c.shelfBaseEnabled ? c.shelfBaseHeight : 0;
    const back = c.shelfDetailed ? c.shelfBackEnabled ? c.shelfBackThickness : 0 : .02;
    return {
        thickness: t, base, back,
        width: c.shelfWidth - 2 * t,
        depth: c.shelfDepth - back,
        height: c.shelfHeight - base - 2 * t,
        gap: (c.shelfHeight - base - (c.shelfShelfCount + 2) * t) / (c.shelfShelfCount + 1),
    };
}

export function validateShelving(c: ShelvingInput) {
    for (const key of ['shelfDetailed', 'shelfBackEnabled', 'shelfBaseEnabled'] as const) {
        if (typeof c[key] !== 'boolean') throw new Error('Confira as opções de acabamento da estante.');
    }
    for (const [key, min, max, label] of [
        ['shelfBoardThickness', .015, .08, 'Espessura das placas'],
        ['shelfBackThickness', .006, .05, 'Espessura do fundo'],
        ['shelfBaseHeight', .04, .2, 'Altura do rodapé'],
        ['shelfBaseInset', 0, .1, 'Recuo do rodapé'],
    ] as const) {
        if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max) {
            throw new Error(`${label}: use um valor entre ${min} e ${max} m.`);
        }
    }
    if (!c.shelving || !c.shelfDetailed) return;
    if (!Number.isInteger(c.shelfShelfCount) || c.shelfShelfCount < 0 || c.shelfShelfCount > 6) {
        throw new Error('Use de 0 a 6 prateleiras internas por estante.');
    }
    const space = shelvingSpace(c);
    if (space.width < .1 - 1e-7 || space.depth < .1 - 1e-7) {
        throw new Error('Reduza as espessuras ou aumente a estante para preservar 10 cm de largura e profundidade internas.');
    }
    if (space.gap < .1 - 1e-7) {
        throw new Error('Estante: deixe pelo menos 10 cm livres entre as placas. Reduza as prateleiras, as espessuras ou o rodapé, ou aumente a altura.');
    }
    if (c.shelfBaseEnabled && Math.min(c.shelfWidth, c.shelfDepth) - 2 * c.shelfBaseInset < .04 - 1e-7) {
        throw new Error('Reduza o recuo do rodapé para que ele caiba sob a estante.');
    }
}

export type ShelvingPart = {
    name: string; role: string;
    size: [number, number, number]; center: [number, number, number]; material: MaterialKind;
};

export function shelvingParts(c: ShelvingInput): ShelvingPart[] {
    const parts: ShelvingPart[] = [];
    const add = (name: string, role: string, size: ShelvingPart['size'], center: ShelvingPart['center'], material: MaterialKind) =>
        parts.push({ name, role, size, center, material });
    const w = c.shelfWidth, d = c.shelfDepth, h = c.shelfHeight;
    const s = shelvingSpace(c), t = s.thickness;
    add('Lateral_Esquerda', 'shelving_side_left', [t, d, h - s.base], [-w / 2 + t / 2, 0, .1 + s.base + (h - s.base) / 2], c.shelfMat);
    add('Lateral_Direita', 'shelving_side_right', [t, d, h - s.base], [w / 2 - t / 2, 0, .1 + s.base + (h - s.base) / 2], c.shelfMat);
    add('Base', 'shelving_bottom', [s.width, d, t], [0, 0, .1 + s.base + t / 2], c.shelfMat);
    add('Topo', 'shelving_top', [s.width, d, t], [0, 0, .1 + h - t / 2], c.shelfMat);
    if (s.back > 0) add('Fundo', 'shelving_back', [s.width, s.back, s.height],
        [0, d / 2 - s.back / 2, .1 + s.base + t + s.height / 2], c.shelfDetailed ? c.shelfBackMat : c.shelfMat);
    const count = Math.min(6, Math.max(0, Math.trunc(c.shelfShelfCount) || 0));
    for (let i = 0; i < count; i++) {
        const z = c.shelfDetailed ? .1 + s.base + t + s.gap * (i + 1) + t * (i + .5)
            : .1 + t + (h - 2 * t) * (i + 1) / (count + 1);
        add(`Prateleira_${String(i + 1).padStart(2, '0')}`, 'shelving_shelf', [s.width, s.depth, t],
            [0, -s.back / 2, z], c.shelfDetailed ? c.shelfShelfMat : c.shelfMat);
    }
    if (c.shelfDetailed && c.shelfBaseEnabled) add('Rodape', 'shelving_plinth',
        [w - 2 * c.shelfBaseInset, d - 2 * c.shelfBaseInset, s.base], [0, 0, .1 + s.base / 2], c.shelfBaseMat);
    return parts;
}
