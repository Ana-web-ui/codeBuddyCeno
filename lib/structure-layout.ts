import type { Config } from './generator';

/** Coordenadas locais automáticas, independentes dos ajustes e da orientação da frente. */
export function structureLayout(c: Config) {
    const stage = { x: 0, y: c.projectType === 'palco' ? c.depth / 2 - .7 - c.stageDepth / 2 : c.depth * .18, rotation: 0 };
    const counterY = c.projectType === 'reception' ? c.receptionRowY : -c.depth * .28;
    const pitch = c.projectType === 'reception' ? c.counterWidth + .08 + c.receptionCounterGap : c.counterWidth + .4;
    const counters = Array.from({ length: Math.min(6, Math.max(0, c.counterCount || 0)) }, (_, i) => ({
        x: (i - (c.counterCount - 1) / 2) * pitch, y: counterY, rotation: 0,
    }));
    return { stage, counters, led: { x: 0, y: c.depth / 2 - .35, rotation: 0 } };
}

export function structureTransform(c: Config, id: string) {
    const base = structureLayout(c);
    return c.objectTransforms[id] ?? (id === 'led:0' ? base.led : id === 'stage:0' ? base.stage : base.counters[Number(id.split(':')[1])]);
}

/** Envoltória conservadora para a distribuição automática ao redor das peças movidas. */
export function structureBounds(c: Config, id: string, width: number, depth: number) {
    const t = structureTransform(c, id), a = t.rotation * Math.PI / 180;
    return { centerX: t.x, centerY: t.y,
        width: Math.abs(Math.cos(a)) * width + Math.abs(Math.sin(a)) * depth,
        depth: Math.abs(Math.sin(a)) * width + Math.abs(Math.cos(a)) * depth };
}
