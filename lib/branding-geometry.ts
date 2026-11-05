import type { Config } from './generator';
import type { ArtworkMode } from './branding';
import { artworkImageSize } from './branding-image';
import { counterParts } from './counter';

export type ArtworkSlot = 'panelArt' | 'counterArt';
export function artworkSurface(c: Config, slot: ArtworkSlot) {
    if (slot === 'counterArt') {
        const body = counterParts(c)[0];
        return { width: c.counterWidth - .03, height: body.size[2] - .03,
            y: -c.counterDepth / 2 - .0015, z: body.z, localY: -c.counterDepth / 2 - .0015 };
    }
    const frame = c.backdropDetailed && c.backdropFrameEnabled ? c.backdropFrameWidth : 0;
    const height = c.backdropHeight - (c.backdropDetailed ? .04 : 0);
    return { width: c.backdropWidth - 2 * frame - .03, height: height - 2 * frame - .03,
        y: -c.backdropThickness / 2 - .0015,
        z: .1 + (c.backdropDetailed ? .04 : 0) + height / 2,
        localY: -(c.backdropDetailed ? .005 : c.backdropThickness) / 2 - .0015 };
}

/** Retângulo visível e UVs recortados: mesma conta na prévia e nos dois exportadores. */
export function artworkPlacement(surface: { width: number; height: number }, image: { width: number; height: number },
    settings: { mode: ArtworkMode; scale: number; offsetX: number; offsetY: number }) {
    const factor = (settings.mode === 'contain' ? Math.min : Math.max)(surface.width / image.width, surface.height / image.height) * settings.scale;
    const width = image.width * factor, height = image.height * factor;
    const left = settings.offsetX * surface.width - width / 2, bottom = settings.offsetY * surface.height - height / 2;
    const x0 = Math.max(-surface.width / 2, left), x1 = Math.min(surface.width / 2, left + width);
    const z0 = Math.max(-surface.height / 2, bottom), z1 = Math.min(surface.height / 2, bottom + height);
    return { left, bottom, width, height, x0, x1, z0, z1,
        u0: (x0 - left) / width, u1: (x1 - left) / width, v0: (z0 - bottom) / height, v1: (z1 - bottom) / height };
}
export function artworkGeometry(c: Config, slot: ArtworkSlot) {
    const surface = artworkSurface(c, slot);
    const placement = artworkPlacement(surface, artworkImageSize(c[`${slot}Image`]), {
        mode: c[`${slot}Mode`], scale: c[`${slot}Scale`], offsetX: c[`${slot}OffsetX`], offsetY: c[`${slot}OffsetY`],
    });
    return { surface, placement,
        vertices: [[placement.x0, surface.localY, placement.z0], [placement.x1, surface.localY, placement.z0],
            [placement.x1, surface.localY, placement.z1], [placement.x0, surface.localY, placement.z1]],
        uv: [[placement.u0, placement.v0], [placement.u1, placement.v0], [placement.u1, placement.v1], [placement.u0, placement.v1]],
    };
}
