export type ActivationModel = 'touch';

export type ActivationConfig = {
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
] as const;
