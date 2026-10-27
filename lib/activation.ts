export type ActivationModel = 'touch' | 'photo';

export const photoDefaults = {
    activationPhotoPersonDistance: 1.2,
    activationPhotoCameraDistance: 2.5,
    activationPhotoCameraWidth: 1.2,
    activationPhotoCameraDepth: 1,
    activationPhotoCameraHeight: 1.5,
};

export type ActivationConfig = typeof photoDefaults & {
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
] as const;
