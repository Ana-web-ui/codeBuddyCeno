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

type PanelInput = PanelConfig & {
    backdrops: boolean;
    backdropWidth: number;
    backdropHeight: number;
    backdropThickness: number;
    backdropBaseDepth: number;
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
        c.backdropHeight - 2 * c.backdropFrameWidth;

    if (innerWidth < 0.2 || innerHeight < 0.2) {
        throw new Error(
            'Reduza a largura da moldura para preservar ' +
            'pelo menos 20 cm de área central no painel.',
        );
    }

    if (
        c.backdropThickness + 2 * c.backdropFrameDepth >
        c.backdropBaseDepth
    ) {
        throw new Error(
            'O ressalto da moldura ultrapassa a profundidade ' +
            'reservada ao painel. Reduza o ressalto ou ' +
            'aumente a profundidade das bases.',
        );
    }
}