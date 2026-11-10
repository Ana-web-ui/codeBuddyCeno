import type { FreeObject, V3 } from './free-scene';
import { freeParts } from './free-scene-geometry';

function supportOffset(object: FreeObject): number {
    const x = object.rotation[0] * Math.PI / 180;
    const y = object.rotation[1] * Math.PI / 180;
    const vertical = [-Math.sin(y), Math.cos(y) * Math.sin(x), Math.cos(y) * Math.cos(x)];
    if (object.kind === 'floor') {
        const center = vertical[2] * object.size[2] / 2;
        const extent = object.size.reduce((sum, value, axis) => sum + Math.abs(vertical[axis]) * value / 2, 0);
        return center + extent;
    }
    let bottom = Infinity;
    for (const part of freeParts(object)) {
        const center = part.center.reduce((sum, value, axis) => sum + value * vertical[axis], 0);
        if (part.vertices) {
            for (const vertex of part.vertices) {
                const z = vertex.reduce((sum, value, axis) => sum + value * vertical[axis], center);
                bottom = Math.min(bottom, z);
            }
        } else if (part.shape === 'cylinder') {
            for (let i = 0; i < 32; i++) {
                const angle = i * Math.PI / 16;
                const z = center + vertical[0] * Math.cos(angle) * part.size[0] / 2
                    + vertical[1] * Math.sin(angle) * part.size[1] / 2
                    - Math.abs(vertical[2]) * part.size[2] / 2;
                bottom = Math.min(bottom, z);
            }
        } else {
            const depth = part.shape === 'image' || part.shape === 'text' ? 0 : part.size[1];
            const extent = (Math.abs(vertical[0]) * part.size[0]
                + Math.abs(vertical[1]) * depth + Math.abs(vertical[2]) * part.size[2]) / 2;
            bottom = Math.min(bottom, center - extent);
        }
    }
    return Number.isFinite(bottom) ? bottom : 0;
}

/** Keep the floor's top surface, or another piece's lowest point, at its current height. */
export function resizeFreeObject(object: FreeObject, size: V3): FreeObject {
    if (size.some(value => !Number.isFinite(value) || value < .01 || value > 1000)) {
        throw new Error('Use medidas entre 0,01 e 1000 m.');
    }
    const resized: FreeObject = {
        ...object,
        size: [...size],
        originalSize: [...(object.originalSize ?? object.size)],
        position: [...object.position],
    };
    resized.position[2] += supportOffset(object) - supportOffset(resized);
    return resized;
}
