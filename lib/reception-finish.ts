import type { MaterialKind } from './generator';

export type ReceptionFinishConfig = {
    receptionBarriersEnabled: boolean;
    receptionBarrierHeight: number;
    receptionBarrierSpan: number;
    receptionBarrierMat: MaterialKind;
    receptionBeltMat: MaterialKind;
    receptionSignEnabled: boolean;
    receptionSignText: string;
    receptionSignWidth: number;
    receptionSignHeight: number;
    receptionSignMat: MaterialKind;
    receptionSignTextMat: MaterialKind;
    receptionExportGuides: boolean;
};

/** Elementos novos ficam desligados ao abrir projetos anteriores. */
export const receptionFinishDefaults: ReceptionFinishConfig = {
    receptionBarriersEnabled: false,
    receptionBarrierHeight: .9,
    receptionBarrierSpan: 1.8,
    receptionBarrierMat: 'metal',
    receptionBeltMat: 'brand',
    receptionSignEnabled: false,
    receptionSignText: 'Credenciamento',
    receptionSignWidth: 1.8,
    receptionSignHeight: 2.2,
    receptionSignMat: 'brand',
    receptionSignTextMat: 'white',
    receptionExportGuides: false,
};

type Zone = { name: string; x: number; y: number; width: number; depth: number };
type Layout = {
    team: Zone; service: Zone;
    flow: { queue: Zone; corridors: Zone[] } | null;
};
export type ReceptionPart = {
    id: string; role: string; group: 'queue' | 'sign';
    size: [number, number, number]; center: [number, number, number];
    material: MaterialKind;
};

export function receptionDetails(c: ReceptionFinishConfig, layout: Layout) {
    const parts: ReceptionPart[] = [];
    const footprints: Zone[] = [];
    const posts: { x: number; y: number }[] = [];
    const belts: { x: number; from: number; to: number }[] = [];
    const add = (id: string, role: string, group: ReceptionPart['group'],
        size: ReceptionPart['size'], center: ReceptionPart['center'], material: MaterialKind) =>
        parts.push({ id, role, group, size, center, material });

    if (c.receptionBarriersEnabled && layout.flow) {
        const q = layout.flow.queue, diameter = .28;
        const from = q.y - q.depth / 2 + diameter / 2;
        const to = q.y + q.depth / 2 - diameter / 2;
        // Limite defensivo para a prévia enquanto os campos estão sendo editados.
        const segments = Math.min(32, Math.max(1, Math.ceil((to - from) / Math.max(.5, c.receptionBarrierSpan)) || 1));
        for (const side of [-1, 1]) {
            const x = q.x + side * (q.width / 2 + diameter / 2);
            for (let i = 0; i <= segments; i++) {
                const y = from + (to - from) * i / segments;
                const id = `poste_${side < 0 ? 'esq' : 'dir'}_${i}`;
                posts.push({ x, y });
                footprints.push({ name: 'Base do organizador', x, y, width: diameter, depth: diameter });
                add(id + '_base', 'reception_post_base', 'queue', [diameter, diameter, .035], [x, y, .1175], c.receptionBarrierMat);
                add(id + '_haste', 'reception_post', 'queue', [.045, .045, c.receptionBarrierHeight - .055],
                    [x, y, .135 + (c.receptionBarrierHeight - .055) / 2], c.receptionBarrierMat);
                add(id + '_topo', 'reception_post_cap', 'queue', [.07, .07, .02],
                    [x, y, .1 + c.receptionBarrierHeight - .01], c.receptionBarrierMat);
                if (i < segments) {
                    const next = from + (to - from) * (i + 1) / segments;
                    belts.push({ x, from: y, to: next });
                    add(id + '_fita', 'reception_belt', 'queue', [.035, next - y, .06],
                        [x, (y + next) / 2, .1 + c.receptionBarrierHeight - .12], c.receptionBeltMat);
                }
            }
        }
    }

    const sign = c.receptionSignEnabled ? {
        name: 'Sinalização', x: 0,
        y: layout.team.y + layout.team.depth / 2 + .15 + .225,
        width: Math.max(.5, c.receptionSignWidth), depth: .45,
        text: c.receptionSignText,
        z: .1 + c.receptionSignHeight - .225,
    } : null;
    if (sign) {
        footprints.push(sign);
        add('placa_base', 'reception_sign_base', 'sign', [.5, .45, .06], [0, sign.y, .13], c.receptionBarrierMat);
        add('placa_suporte', 'reception_sign_support', 'sign', [.08, .08, c.receptionSignHeight - .51],
            [0, sign.y, .16 + (c.receptionSignHeight - .51) / 2], c.receptionBarrierMat);
        add('placa_painel', 'reception_sign_panel', 'sign', [c.receptionSignWidth, .06, .45],
            [0, sign.y, sign.z], c.receptionSignMat);
    }
    return { parts, footprints, posts, belts, sign };
}

export function validateReceptionFinishFields(c: ReceptionFinishConfig & { height: number; receptionQueueEnabled: boolean }) {
    for (const key of ['receptionBarriersEnabled', 'receptionSignEnabled', 'receptionExportGuides'] as const) {
        if (typeof c[key] !== 'boolean') throw new Error('Confira as opções da recepção.');
    }
    for (const [key, min, max, label] of [
        ['receptionBarrierHeight', .7, 1.2, 'Altura dos organizadores'],
        ['receptionBarrierSpan', .5, 1.8, 'Distância máxima entre postes'],
        ['receptionSignWidth', .8, 3, 'Largura da sinalização'],
        ['receptionSignHeight', 1.6, 3, 'Altura da sinalização'],
    ] as const) {
        if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max) throw new Error(`${label}: use de ${min} a ${max} m.`);
    }
    if (typeof c.receptionSignText !== 'string' || !c.receptionSignText.trim() ||
        c.receptionSignText.length > 48 || /[\u0000-\u001f\u007f]/.test(c.receptionSignText)) {
        throw new Error('Use um texto de sinalização de 1 a 48 caracteres, em uma única linha.');
    }
    if (c.receptionBarriersEnabled && !c.receptionQueueEnabled) throw new Error('Ative a fila antes dos organizadores.');
    if (c.receptionSignEnabled && c.receptionSignHeight + .1 > c.height) throw new Error('A sinalização precisa caber na altura da montagem, incluindo o piso.');
}
