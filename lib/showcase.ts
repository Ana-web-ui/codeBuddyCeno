import type { MaterialKind } from './generator';
import type { ShowcaseConfig } from './library';

export type ShowcaseDetailConfig = {
    showcaseDetailed: boolean;
    showcasePlinthEnabled: boolean;
    showcasePlinthHeight: number;
    showcasePlinthInset: number;
    showcasePlinthMat: MaterialKind;
    showcaseDeckThickness: number;
    showcaseDeckMat: MaterialKind;
    showcaseProfilesEnabled: boolean;
    showcaseProfileWidth: number;
    showcaseProfileMat: MaterialKind;
    showcaseGlassRoughness: number;
    showcaseGlassIor: number;
};

// O modo simples mantém a geometria e os materiais dos projetos anteriores.
export const showcaseDetailDefaults: ShowcaseDetailConfig = {
    showcaseDetailed: false,
    showcasePlinthEnabled: true,
    showcasePlinthHeight: .08,
    showcasePlinthInset: .03,
    showcasePlinthMat: 'metal',
    showcaseDeckThickness: .025,
    showcaseDeckMat: 'white',
    showcaseProfilesEnabled: true,
    showcaseProfileWidth: .02,
    showcaseProfileMat: 'metal',
    showcaseGlassRoughness: .02,
    showcaseGlassIor: 1.45,
};
export type ShowcaseInput = ShowcaseConfig & ShowcaseDetailConfig;

export function showcaseSpace(c: ShowcaseInput) {
    const p = c.showcaseDetailed && c.showcaseProfilesEnabled ? c.showcaseProfileWidth : 0;
    const t = c.showcaseGlassThickness;
    const height = c.showcaseHeight - c.showcaseBaseHeight - (p ? 2 * p : t);
    return {
        profile: p, height,
        bottom: .1 + c.showcaseBaseHeight + p,
        width: c.showcaseWidth - 2 * (p || t) - .004,
        depth: c.showcaseDepth - 2 * (p || t) - .004,
        gap: (height - c.showcaseShelfCount * t) / (c.showcaseShelfCount + 1),
    };
}

export function validateShowcaseDetail(c: ShowcaseInput) {
    for (const key of ['showcaseDetailed', 'showcasePlinthEnabled', 'showcaseProfilesEnabled'] as const) {
        if (typeof c[key] !== 'boolean') throw new Error('Confira as opções de acabamento da vitrine.');
    }
    for (const [key, min, max, label] of [
        ['showcasePlinthHeight', .04, .2, 'Altura do rodapé da vitrine'],
        ['showcasePlinthInset', 0, .1, 'Recuo do rodapé da vitrine'],
        ['showcaseDeckThickness', .015, .08, 'Espessura do tampo da vitrine'],
        ['showcaseProfileWidth', .01, .06, 'Largura dos perfis da vitrine'],
        ['showcaseGlassRoughness', 0, .2, 'Rugosidade do vidro'],
        ['showcaseGlassIor', 1.3, 1.8, 'Índice de refração do vidro'],
    ] as const) {
        if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max)
            throw new Error(`${label}: use um valor entre ${min} e ${max}.`);
    }
    if (!c.showcases || !c.showcaseDetailed) return;
    if (c.showcaseBaseHeight - c.showcaseDeckThickness - (c.showcasePlinthEnabled ? c.showcasePlinthHeight : 0) < .05 - 1e-7)
        throw new Error('Vitrine: preserve pelo menos 5 cm para o corpo da base. Aumente a base ou reduza o tampo e o rodapé.');
    if (c.showcaseProfilesEnabled && c.showcaseProfileWidth < c.showcaseGlassThickness - 1e-7)
        throw new Error('Vitrine: os perfis precisam ter largura igual ou maior que a espessura do vidro.');
    const space = showcaseSpace(c);
    if (space.width < .1 - 1e-7 || space.depth < .1 - 1e-7 || space.height < .25 - 1e-7)
        throw new Error('Vitrine: preserve 10 cm de largura e profundidade internas e 25 cm de altura livre.');
    if (space.gap < .1 - 1e-7)
        throw new Error('Vitrine: deixe pelo menos 10 cm livres entre os vidros. Reduza as prateleiras ou aumente a altura.');
    if (c.showcasePlinthEnabled && Math.min(c.showcaseWidth, c.showcaseDepth) - 2 * c.showcasePlinthInset < .04 - 1e-7)
        throw new Error('Reduza o recuo do rodapé para que ele caiba sob a vitrine.');
}

export type ShowcasePart = {
    name: string; role: string; size: [number, number, number]; center: [number, number, number];
    material: MaterialKind; glass: boolean;
};

/** Peças dentro do envelope original; vidro e estrutura encostam sem sobreposição de volume. */
export function showcaseParts(c: ShowcaseInput): ShowcasePart[] {
    const parts: ShowcasePart[] = [];
    const add = (name: string, role: string, size: ShowcasePart['size'], center: ShowcasePart['center'], material: MaterialKind, glass = false) =>
        parts.push({ name, role, size, center, material, glass });
    const w = c.showcaseWidth, d = c.showcaseDepth, h = c.showcaseHeight, b = c.showcaseBaseHeight, t = c.showcaseGlassThickness;
    const s = showcaseSpace(c), p = s.profile;
    if (c.showcaseDetailed) {
        const foot = c.showcasePlinthEnabled ? c.showcasePlinthHeight : 0, deck = c.showcaseDeckThickness;
        if (foot) add('Rodape', 'showcase_plinth', [w - 2 * c.showcasePlinthInset, d - 2 * c.showcasePlinthInset, foot], [0, 0, .1 + foot / 2], c.showcasePlinthMat);
        add('Corpo_Base', 'showcase_body', [w, d, b - foot - deck], [0, 0, .1 + foot + (b - foot - deck) / 2], c.showcaseBaseMat);
        add('Tampo_Base', 'showcase_deck', [w, d, deck], [0, 0, .1 + b - deck / 2], c.showcaseDeckMat);
    } else add('Base', 'showcase_body', [w, d, b], [0, 0, .1 + b / 2], c.showcaseBaseMat);
    if (p) {
        for (const [level, z] of [['Inferior', .1 + b + p / 2], ['Superior', .1 + h - p / 2]] as const) {
            for (const side of [-1, 1]) {
                add(`Perfil_${level}_${side < 0 ? 'Frente' : 'Fundo'}`, 'showcase_profile_rail', [w, p, p], [0, side * (d - p) / 2, z], c.showcaseProfileMat);
                add(`Perfil_${level}_${side < 0 ? 'Esquerda' : 'Direita'}`, 'showcase_profile_rail', [p, d - 2 * p, p], [side * (w - p) / 2, 0, z], c.showcaseProfileMat);
            }
        }
        for (const x of [-1, 1]) for (const y of [-1, 1])
            add(`Perfil_Vertical_${x < 0 ? 'E' : 'D'}_${y < 0 ? 'Frente' : 'Fundo'}`, 'showcase_profile_post', [p, p, s.height], [x * (w - p) / 2, y * (d - p) / 2, s.bottom + s.height / 2], c.showcaseProfileMat);
    }
    for (const side of [-1, 1]) {
        add(`Vidro_${side < 0 ? 'Esquerdo' : 'Direito'}`, side < 0 ? 'showcase_glass_left' : 'showcase_glass_right',
            [t, d - 2 * p, s.height], [side * (w - t) / 2, 0, s.bottom + s.height / 2], 'glass', true);
    }
    for (const side of [-1, 1]) {
        add(`Vidro_${side < 0 ? 'Frente' : 'Fundo'}`, side < 0 ? 'showcase_glass_front' : 'showcase_glass_back',
            [w - 2 * (p || t), t, s.height], [0, side * (d - t) / 2, s.bottom + s.height / 2], 'glass', true);
    }
    add('Vidro_Topo', 'showcase_glass_top', [w - 2 * p, d - 2 * p, t], [0, 0, .1 + h - t / 2], 'glass', true);
    for (let i = 0; i < c.showcaseShelfCount; i++)
        add(`Prateleira_${String(i + 1).padStart(2, '0')}`, 'showcase_glass_shelf',
            c.showcaseDetailed ? [s.width, s.depth, t] : [w - 2 * t, d - 2 * t, t],
            [0, 0, c.showcaseDetailed ? s.bottom + s.gap * (i + 1) + t * (i + .5) : .1 + b + s.height * (i + 1) / (c.showcaseShelfCount + 1)], 'glass', true);
    return parts;
}
