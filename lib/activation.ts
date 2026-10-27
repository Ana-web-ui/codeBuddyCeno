import type { MaterialKind } from './generator';
export type ActivationModel = 'touch' | 'photo' | 'demo';

export const demoDefaults = {
    demoBenchWidth: 2, demoBenchDepth: .8, demoBenchHeight: 1,
    demoBenchMat: 'brand' as MaterialKind,
    demoProductWidth: .4, demoProductDepth: .3, demoProductHeight: .4,
    demoProductMat: 'white' as MaterialKind,
    demoProductX: 0, demoProductY: 0,
    demoPresenterWidth: 1.2, demoPresenterDepth: 1.2,
    demoPresenterGap: .3, demoAudienceGap: .6,
};

export const photoDefaults = {
    activationPhotoPersonDistance: 1.2,
    activationPhotoCameraDistance: 2.5,
    activationPhotoCameraWidth: 1.2,
    activationPhotoCameraDepth: 1,
    activationPhotoCameraHeight: 1.5,
};

export type ActivationConfig = typeof photoDefaults & typeof demoDefaults & {
    activationModel: ActivationModel;
    activationEntranceSide: 'front' | 'back' | 'left' | 'right';
    activationExitSide: 'front' | 'back' | 'left' | 'right';
    activationEdgeMargin: number;
    activationWaitingEnabled: boolean;
    activationWaitingWidth: number;
    activationWaitingDepth: number;
    activationWaitingManual: boolean;
    activationWaitingX: number;
    activationWaitingY: number;
    activationParticipationWidth: number;
    activationParticipationDepth: number;
    activationStationGap: number;
    activationCirculationWidth: number;
    activationEntranceWidth: number;
    activationExitWidth: number;
    activationExportGuides: boolean;
};

export const activationDefaults: ActivationConfig = {
    activationModel: 'touch',
    ...photoDefaults,
    ...demoDefaults,
    activationEntranceSide: 'front', activationExitSide: 'right', activationEdgeMargin: 0.2,
    activationWaitingEnabled: true, activationWaitingWidth: 2, activationWaitingDepth: 2,
    activationWaitingManual: false, activationWaitingX: 0, activationWaitingY: 0,
    activationParticipationWidth: 1.2, activationParticipationDepth: 1.2,
    activationStationGap: 0.5, activationCirculationWidth: 1.2,
    activationEntranceWidth: 1.5, activationExitWidth: 1.5, activationExportGuides: false,
};

export const activationModels = [
    {
        value: 'touch',
        label: 'Interação em totem',
    },
    { value: 'photo', label: 'Espaço para fotos' },
    { value: 'demo', label: 'Demonstração de produto' },
] as const;
