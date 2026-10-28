import type { MaterialKind } from './generator';

export type PanelConfig = {
    backdropDetailed: boolean;
    backdropFrameEnabled: boolean;
    backdropFrameWidth: number;
    backdropFrameDepth: number;
    backdropFrameMat: MaterialKind;
    backdropStructureMat: MaterialKind;
    backdropBaseMat: MaterialKind;
};

export const panelDefaults: PanelConfig = {
    backdropDetailed: false,
    backdropFrameEnabled: false,
    backdropFrameWidth: 0.06,
    backdropFrameDepth: 0.03,
    backdropFrameMat: 'white',
    backdropStructureMat: 'white',
    backdropBaseMat: 'metal',
};

export type PanelInput = PanelConfig & {
    backdrops: boolean;
    backdropWidth: number;
    backdropHeight: number;
    backdropThickness: number;
    backdropBaseDepth: number;
    backdropMat: MaterialKind;
};

export function validatePanel(c: PanelInput) {
    if (
        typeof c.backdropDetailed !== 'boolean' ||
        typeof c.backdropFrameEnabled !== 'boolean'
    ) {
        throw new Error('Confira as opções de acabamento do painel.');
    }

    const fields = [
        [
            'backdropFrameWidth',
            0.02,
            0.2,
            'Largura da moldura',
        ],
        [
            'backdropFrameDepth',
            0.01,
            0.15,
            'Ressalto da moldura',
        ],
    ] as const;

    for (const [key, min, max, label] of fields) {
        const value = c[key];

        if (!Number.isFinite(value) || value < min || value > max) {
            throw new Error(
                `${label}: use um valor entre ${min} e ${max} m.`,
            );
        }
    }

    if (
        !c.backdrops ||
        !c.backdropDetailed ||
        !c.backdropFrameEnabled
    ) {
        return;
    }

    const innerWidth =
        c.backdropWidth - 2 * c.backdropFrameWidth;

    const innerHeight =
        c.backdropHeight - 0.04 - 2 * c.backdropFrameWidth;

    if (innerWidth < 0.2 || innerHeight < 0.2) {
        throw new Error(
            'Reduza a largura da moldura para preservar ' +
            'pelo menos 20 cm de área central no painel.',
        );
    }

    if (
        c.backdropThickness + 2 * c.backdropFrameDepth >
        c.backdropBaseDepth + 1e-7
    ) {
        throw new Error(
            'O ressalto da moldura ultrapassa a profundidade ' +
            'reservada ao painel. Reduza o ressalto ou ' +
            'aumente a profundidade das bases.',
        );
    }
}

export type PanelPart = {
    name: string;
    role: string;
    size: [number, number, number];
    center: [number, number, number];
    material: MaterialKind;
};

/** A frente aponta para -Y; a altura total inclui os 4 cm das bases. */
export function panelParts(c: PanelInput): PanelPart[] {
    const w = c.backdropWidth, h = c.backdropHeight, t = c.backdropThickness;
    const parts: PanelPart[] = [];
    const box = (name: string, role: string, size: PanelPart['size'],
        center: PanelPart['center'], material: MaterialKind) => parts.push({ name, role, size, center, material });
    if (!c.backdropDetailed) {
        box('Painel', 'panel_body', [w, t, h], [0, 0, .1 + h / 2], c.backdropMat);
    } else {
        const face = .005, panelHeight = h - .04;
        const z = .14 + panelHeight / 2;
        box('Estrutura', 'panel_structure', [w, t - face, panelHeight], [0, face / 2, z], c.backdropStructureMat);
        box('Frente', 'panel_front', [w, face, panelHeight], [0, -t / 2 + face / 2, z], c.backdropMat);
        if (c.backdropFrameEnabled) {
            const b = c.backdropFrameWidth, depth = c.backdropFrameDepth;
            const y = -t / 2 - depth / 2;
            box('Moldura_Esquerda', 'panel_frame_left', [b, depth, panelHeight], [-w / 2 + b / 2, y, z], c.backdropFrameMat);
            box('Moldura_Direita', 'panel_frame_right', [b, depth, panelHeight], [w / 2 - b / 2, y, z], c.backdropFrameMat);
            box('Moldura_Superior', 'panel_frame_top', [w - 2 * b, depth, b], [0, y, .1 + h - b / 2], c.backdropFrameMat);
            box('Moldura_Inferior', 'panel_frame_bottom', [w - 2 * b, depth, b], [0, y, .14 + b / 2], c.backdropFrameMat);
        }
    }
    for (const sign of [-1, 1]) {
        box(sign < 0 ? 'Base_Esquerda' : 'Base_Direita', 'panel_base', [.4, c.backdropBaseDepth, .04],
            [sign * (w / 2 - .22), 0, .12], c.backdropDetailed ? c.backdropBaseMat : 'metal');
    }
    return parts;
}
