import * as THREE from 'three';
import type { FreeEnvironment, V3 } from '@/lib/free-scene';

export const environmentLighting = {
    white: { background: '#ffffff', sky: '#ffffff', ground: '#a3afc3', intensity: 2.2, key: 2.4 },
    outdoors: { background: '#89c8fa', sky: '#e3f3ff', ground: '#86a565', intensity: 2.4, key: 2.8 },
    hotel: { background: '#fff3e3', sky: '#fff3e4', ground: '#c9ac8d', intensity: 2.9, key: 2 },
    pavilion: { background: '#bcc2ca', sky: '#edf2fb', ground: '#a7a9ae', intensity: 2.2, key: 1.7 },
};

export function createFreeEnvironment(preset: FreeEnvironment): THREE.Group {
    const group = new THREE.Group();
    const box = (size: V3, position: V3, color: string) => {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(...size),
            new THREE.MeshBasicMaterial({ color, toneMapped: false }),
        );
        mesh.position.set(...position);
        group.add(mesh);
    };

    if (preset === 'outdoors') {
        box([42, 42, 0.1], [0, 0, -0.07], '#78ab58');
        for (let x = -18; x < 21; x += 6) {
            box([3, 42, 0.002], [x, 0, -0.019], '#7daf5c');
        }
    } else if (preset === 'hotel') {
        box([50, 50, 0.1], [0, 0, -0.07], '#e8d9c5');
        box([48, 0.35, 9], [0, 13, 4.5], '#f3e8d9');
        box([0.35, 42, 9], [-16, -7, 4.5], '#bd936d');

        for (let x = -12; x <= 12; x += 6) {
            box([4.8, 0.12, 5.8], [x, 12.74, 4.6], '#c49d78');
            box([4.5, 0.12, 5.5], [x, 12.65, 4.6], '#e4f4fc');
            box([0.11, 0.14, 5.5], [x, 12.55, 4.6], '#c49d78');
            box([4.5, 0.14, 0.11], [x, 12.55, 4.6], '#c49d78');
        }
        for (let y = -20; y <= 12; y += 0.6) {
            box([0.15, 0.09, 8.5], [-15.75, y, 4.25], '#9e7657');
        }
        for (let i = -24; i < 25; i += 3) {
            box([0.015, 50, 0.002], [i, 0, -0.019], '#d6c4ad');
            box([50, 0.015, 0.002], [0, i, -0.019], '#d6c4ad');
        }
    } else if (preset === 'pavilion') {
        box([70, 70, 0.1], [0, 0, -0.07], '#a6abb2');
        box([56, 0.35, 13], [0, 16, 6.5], '#777f8a');
        box([0.35, 56, 13], [-19, -12, 6.5], '#898f97');
        for (let x = -16; x <= 22; x += 6) {
            box([0.55, 0.65, 13], [x, 15.5, 6.5], '#555e6a');
            box([0.12, 0.05, 8], [x + 2.8, 15.8, 4], '#69717c');
        }
        box([56, 0.75, 0.65], [0, 15.5, 10.8], '#555e6a');
        for (let x = -14; x <= 20; x += 7) {
            box([5, 0.18, 0.22], [x, 15, 10.45], '#e9f0fa');
        }
    }
    return group;
}
