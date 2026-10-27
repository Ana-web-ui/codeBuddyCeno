import { defaults } from './generator';
import type { Config, ProjectType } from './generator';
export const projectTypes: {
    value: ProjectType;
    label: string;
}[] = [
    { value: 'stand', label: 'Stand' },
    { value: 'palco', label: 'Palco / plenária' },
    { value: 'lounge', label: 'Lounge' },
];
export function createProjectConfig(type: ProjectType): Config {
    if (type === 'stand') {
        return {
            ...defaults,
            projectType: 'stand',
            chairs: false,
        };
    }

    if (type === 'lounge') {
        return {
            ...defaults,

            projectType: 'lounge',
            name: 'Meu primeiro lounge',

            width: 10,
            depth: 8,
            height: 3.5,

            standLayout: 'custom',
            frontRotation: 0,
            cornerOpenSide: 'right',

            back: false,
            left: false,
            right: false,

            stage: false,
            chairs: false,
            led: false,
            counter: false,
            totem: false,
            spots: false,
            storageEnabled: false,

            roundTables: false,
            rectTables: false,
            bistroTables: false,
            stools: false,

            loungeMode: 'set',
            coffeeTables: true,
            coffeeTableCount: 2,

            armchairs: true,
            loungeArmchairsPerTable: 2,
            armchairCount: 4,

            puffs: true,
            loungePuffsPerTable: 2,
            puffCount: 4,

            loungeTableSeatGap: 0.25,
            loungeSeatGap: 0.1,
            loungeSetGap: 0.8,

            floorMat: 'white',
            coffeeTableMat: 'wood',
            armchairMat: 'plastic',
            puffMat: 'plastic',

            objectTransforms: {},
        };
    }
    return {
        ...defaults,
        projectType: 'palco',
        name: 'Minha primeira plenária',
        width: 20,
        depth: 25,
        height: 4,
        back: false,
        left: false,
        right: false,
        counter: false,
        totem: false,
        stage: true,
        led: true,
        spots: true,
        stageWidth: 8,
        stageDepth: 4,
        stageHeight: 0.6,
        ledWidth: 6,
        ledHeight: 2,
        ledBottom: 0.9,
        stageMat: 'wood',
        floorMat: 'white',
        chairs: true,
        attendeeCount: 300,
        chairColumns: 15,
    };
}
