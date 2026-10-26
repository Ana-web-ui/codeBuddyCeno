import { defaults } from './generator';
import type { Config, ProjectType } from './generator';
export const projectTypes: {
    value: ProjectType;
    label: string;
}[] = [
    { value: 'stand', label: 'Stand' },
    { value: 'palco', label: 'Palco / plenária' },
];
export function createProjectConfig(type: ProjectType): Config {
    if (type === 'stand') {
        return {
            ...defaults,
            projectType: 'stand',
            chairs: false,
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
