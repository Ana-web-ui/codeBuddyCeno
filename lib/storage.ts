import type { MaterialKind } from './generator';

export type StorageDoorSide =
    | 'front'
    | 'back'
    | 'left'
    | 'right';

export type StorageDoorHinge = 'left' | 'right';

export type StorageDoorOpening = 'inward' | 'outward';

export type StorageConfig = {
    storageEnabled: boolean;

    // Dimensões externas, em metros.
    storageWidth: number;
    storageDepth: number;
    storageHeight: number;
    storageWallThickness: number;

    // Centro do depósito nos eixos locais do estande.
    storageX: number;
    storageY: number;

    // Porta centralizada na face escolhida.
    storageDoorSide: StorageDoorSide;
    storageDoorWidth: number;
    storageDoorHeight: number;

    // Dobradiça vista pelo lado externo da porta.
    storageDoorHinge: StorageDoorHinge;
    storageDoorOpening: StorageDoorOpening;

    // Faixa livre externa em frente à porta.
    storageAccessDepth: number;

    storageWallMat: MaterialKind;
    storageDoorMat: MaterialKind;
};

export const storageDefaults: StorageConfig = {
    storageEnabled: false,

    storageWidth: 2,
    storageDepth: 1.5,
    storageHeight: 2.5,
    storageWallThickness: 0.1,

    storageX: 0,
    storageY: 0,

    storageDoorSide: 'front',
    storageDoorWidth: 0.8,
    storageDoorHeight: 2.1,
    storageDoorHinge: 'left',
    storageDoorOpening: 'inward',

    storageAccessDepth: 1,

    storageWallMat: 'white',
    storageDoorMat: 'white',
};

export type StoragePoint = {
    x: number;
    y: number;
};

export type StorageRect = {
    centerX: number;
    centerY: number;
    width: number;
    depth: number;
};

export type StorageSceneConfig = StorageConfig & {
    projectType: 'stand' | 'palco';
    width: number;
    depth: number;
    height: number;
};

const STORAGE_EPSILON = 0.000001;

/**
 * Retângulos encostados são permitidos.
 * Interseções com área positiva são consideradas sobreposição.
 */
export function storageRectsOverlap(
    a: StorageRect,
    b: StorageRect,
): boolean {
    return (
        Math.abs(a.centerX - b.centerX) <
            (a.width + b.width) / 2 - STORAGE_EPSILON &&
        Math.abs(a.centerY - b.centerY) <
            (a.depth + b.depth) / 2 - STORAGE_EPSILON
    );
}

function validateStorageDimensions(c: StorageConfig): void {
    const ranges: [
        keyof StorageConfig,
        number,
        number,
        string,
    ][] = [
        ['storageWidth', 1, 10, 'largura'],
        ['storageDepth', 1, 10, 'profundidade'],
        ['storageHeight', 2, 8, 'altura'],
        ['storageWallThickness', 0.05, 0.3, 'espessura'],
        ['storageX', -30, 30, 'posição X'],
        ['storageY', -30, 30, 'posição Y'],
        ['storageDoorWidth', 0.6, 1.5, 'largura da porta'],
        ['storageDoorHeight', 1.8, 3, 'altura da porta'],
        ['storageAccessDepth', 0.6, 3, 'área de acesso'],
    ];

    for (const [key, min, max, label] of ranges) {
        const value = c[key];

        if (
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            value < min ||
            value > max
        ) {
            throw new Error(
                `Depósito: ${label} deve estar entre ${min} e ${max} m.`,
            );
        }
    }

    if (
        !['front', 'back', 'left', 'right'].includes(
            c.storageDoorSide,
        )
    ) {
        throw new Error('Depósito: face da porta inválida.');
    }

    if (!['left', 'right'].includes(c.storageDoorHinge)) {
        throw new Error('Depósito: lado da dobradiça inválido.');
    }

    if (
        !['inward', 'outward'].includes(c.storageDoorOpening)
    ) {
        throw new Error('Depósito: sentido de abertura inválido.');
    }

    const t = c.storageWallThickness;
    const sideDoor =
        c.storageDoorSide === 'left' ||
        c.storageDoorSide === 'right';

    const wallLength = sideDoor
        ? c.storageDepth
        : c.storageWidth;

    const perpendicularLength = sideDoor
        ? c.storageWidth
        : c.storageDepth;

    // Mantém espaço entre o vão e os cantos do depósito.
    const minimumJamb = t + 0.1;

    if (
        c.storageDoorWidth + 2 * minimumJamb >
        wallLength + STORAGE_EPSILON
    ) {
        throw new Error(
            'Depósito: a porta não cabe nessa parede com os afastamentos laterais.',
        );
    }

    if (
        c.storageDoorHeight + 0.1 >
        c.storageHeight + STORAGE_EPSILON
    ) {
        throw new Error(
            'Depósito: deixe pelo menos 10 cm acima da porta.',
        );
    }

    if (
        c.storageWidth - 2 * t < 0.6 ||
        c.storageDepth - 2 * t < 0.6
    ) {
        throw new Error(
            'Depósito: as paredes deixam pouco espaço interno.',
        );
    }

    if (
        c.storageDoorOpening === 'inward' &&
        c.storageDoorWidth >
            perpendicularLength - 2 * t + STORAGE_EPSILON
    ) {
        throw new Error(
            'Depósito: não há profundidade interna para abrir a porta.',
        );
    }
}

/**
 * Geometria em coordenadas locais do estande.
 * Ainda não cria objetos 3D.
 */
export function storageGeometry(c: StorageConfig) {
    if (!c.storageEnabled) return null;

    validateStorageDimensions(c);

    const footprint: StorageRect = {
        centerX: c.storageX,
        centerY: c.storageY,
        width: c.storageWidth,
        depth: c.storageDepth,
    };

    // Normal aponta do depósito para o lado externo.
    const normal: StoragePoint =
        c.storageDoorSide === 'front'
            ? { x: 0, y: -1 }
            : c.storageDoorSide === 'back'
                ? { x: 0, y: 1 }
                : c.storageDoorSide === 'left'
                    ? { x: -1, y: 0 }
                    : { x: 1, y: 0 };

    // Direita de quem olha a porta pelo lado externo.
    const tangent: StoragePoint = {
        x: -normal.y,
        y: normal.x,
    };

    const sideDoor = normal.x !== 0;

    const distanceToFace = sideDoor
        ? c.storageWidth / 2
        : c.storageDepth / 2;

    const faceCenter: StoragePoint = {
        x: c.storageX + normal.x * distanceToFace,
        y: c.storageY + normal.y * distanceToFace,
    };

    // Eixo da folha no meio da espessura da parede.
    const doorCenter: StoragePoint = {
        x:
            faceCenter.x -
            normal.x * c.storageWallThickness / 2,
        y:
            faceCenter.y -
            normal.y * c.storageWallThickness / 2,
    };

    const hingeSign =
        c.storageDoorHinge === 'left' ? -1 : 1;

    const hinge: StoragePoint = {
        x:
            doorCenter.x +
            tangent.x * hingeSign * c.storageDoorWidth / 2,
        y:
            doorCenter.y +
            tangent.y * hingeSign * c.storageDoorWidth / 2,
    };

    const closedEnd: StoragePoint = {
        x:
            hinge.x -
            tangent.x * hingeSign * c.storageDoorWidth,
        y:
            hinge.y -
            tangent.y * hingeSign * c.storageDoorWidth,
    };

    const openingSign =
        c.storageDoorOpening === 'outward' ? 1 : -1;

    const openEnd: StoragePoint = {
        x:
            hinge.x +
            normal.x * openingSign * c.storageDoorWidth,
        y:
            hinge.y +
            normal.y * openingSign * c.storageDoorWidth,
    };

    // Reserva retangular conservadora para acesso e giro externo.
    const accessDepth = Math.max(
        c.storageAccessDepth,
        c.storageDoorOpening === 'outward'
            ? c.storageDoorWidth
            : 0,
    );

    const access: StorageRect = {
        centerX:
            faceCenter.x + normal.x * accessDepth / 2,
        centerY:
            faceCenter.y + normal.y * accessDepth / 2,
        width: sideDoor ? accessDepth : c.storageDoorWidth,
        depth: sideDoor ? c.storageDoorWidth : accessDepth,
    };

    return {
        footprint,
        access,
        innerWidth:
            c.storageWidth - 2 * c.storageWallThickness,
        innerDepth:
            c.storageDepth - 2 * c.storageWallThickness,
        door: {
            faceCenter,
            center: doorCenter,
            normal,
            tangent,
            hinge,
            closedEnd,
            openEnd,
        },
    };
}

export function storageReservedAreas(
    c: StorageConfig,
): StorageRect[] {
    const geometry = storageGeometry(c);

    return geometry
        ? [geometry.footprint, geometry.access]
        : [];
}

/**
 * Confere volume e acesso contra limites e elementos fixos.
 * A margem acompanha os 20 cm já usados pela montagem.
 */
export function validateStorage(
    c: StorageSceneConfig,
    occupied: readonly StorageRect[] = [],
): void {
    if (typeof c.storageEnabled !== 'boolean') {
        throw new Error('Depósito: seleção inválida.');
    }

    if (!c.storageEnabled) return;

    if (c.projectType !== 'stand') {
        throw new Error(
            'O depósito está disponível somente para estandes.',
        );
    }

    const geometry = storageGeometry(c)!;

    if (c.storageHeight > c.height) {
        throw new Error(
            'O depósito ultrapassa a altura de montagem.',
        );
    }

    const margin = 0.2;

    for (const [label, area] of [
        ['Depósito', geometry.footprint],
        ['Acesso da porta', geometry.access],
    ] as const) {
        if (
            Math.abs(area.centerX) + area.width / 2 >
                c.width / 2 - margin + STORAGE_EPSILON ||
            Math.abs(area.centerY) + area.depth / 2 >
                c.depth / 2 - margin + STORAGE_EPSILON
        ) {
            throw new Error(
                `${label}: ultrapassa a área disponível e a margem de 20 cm.`,
            );
        }

        if (
            occupied.some(item =>
                storageRectsOverlap(area, item),
            )
        ) {
            throw new Error(
                `${label}: ocupa uma área reservada à estrutura ou a equipamentos fixos.`,
            );
        }
    }
}