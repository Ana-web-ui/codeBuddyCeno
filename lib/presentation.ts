export type PresentationConfig = {
    floorShape: 'rectangle' | 'rounded' | 'ellipse';
    floorCornerRadius: number;
    lightingPreset: 'original' | 'neutral' | 'warm' | 'studio';
    lightingIntensity: number;
    presentationCameras: boolean;
    presentationCamera: 'front' | 'isometric' | 'top';
    presentationFormat: 'landscape' | 'square' | 'portrait';
    presentationMargin: number;
};
export const presentationDefaults: PresentationConfig = {
    floorShape: 'rectangle', floorCornerRadius: .3,
    lightingPreset: 'original', lightingIntensity: 1,
    presentationCameras: false, presentationCamera: 'front',
    presentationFormat: 'landscape', presentationMargin: 1.15,
};
export type PresentationInput = PresentationConfig & { width: number; depth: number; height: number };
export type Point2 = [number, number];
export type Point3 = [number, number, number];

export function validatePresentation(c: PresentationInput) {
    for (const [key, options] of [
        ['floorShape', ['rectangle', 'rounded', 'ellipse']],
        ['lightingPreset', ['original', 'neutral', 'warm', 'studio']],
        ['presentationCamera', ['front', 'isometric', 'top']],
        ['presentationFormat', ['landscape', 'square', 'portrait']],
    ] as const) if (!(options as readonly string[]).includes(c[key])) throw new Error(`Confira a opção de ${key}.`);
    if (typeof c.presentationCameras !== 'boolean') throw new Error('Confira a opção de câmeras de apresentação.');
    for (const [key, min, max, label] of [
        ['floorCornerRadius', 0, 15, 'Raio dos cantos'],
        ['lightingIntensity', .1, 3, 'Intensidade da iluminação'],
        ['presentationMargin', 1.05, 2, 'Margem do enquadramento'],
    ] as const) if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max)
        throw new Error(`${label}: use um valor entre ${min} e ${max}.`);
    if (c.floorShape === 'rounded' && c.floorCornerRadius > Math.min(c.width, c.depth) / 2)
        throw new Error('O raio dos cantos não pode superar metade da menor dimensão do piso.');
}

/** Contorno convexo compartilhado pela planta, validação e malha dos dois programas. */
export function floorOutline(c: Pick<PresentationInput, 'floorShape' | 'floorCornerRadius' | 'width' | 'depth'>): Point2[] {
    const w = c.width / 2, d = c.depth / 2;
    if (c.floorShape === 'rectangle' || (c.floorShape === 'rounded' && !c.floorCornerRadius))
        return [[-w, -d], [w, -d], [w, d], [-w, d]];
    if (c.floorShape === 'ellipse') return Array.from({ length: 96 }, (_, i) => {
        const a = i * Math.PI * 2 / 96;
        return [w * Math.cos(a), d * Math.sin(a)];
    });
    const r = Math.min(c.floorCornerRadius, w, d), points: Point2[] = [];
    for (const [x, y, start] of [[w - r, -d + r, -90], [w - r, d - r, 0], [-w + r, d - r, 90], [-w + r, -d + r, 180]]) {
        for (let i = 0; i <= 16; i++) {
            const a = (start + i * 90 / 16) * Math.PI / 180;
            const p: Point2 = [x + r * Math.cos(a), y + r * Math.sin(a)];
            const previous = points.at(-1);
            if (!previous || Math.hypot(p[0] - previous[0], p[1] - previous[1]) > 1e-8) points.push(p);
        }
    }
    if (points.length > 1 && Math.hypot(points[0][0] - points.at(-1)![0], points[0][1] - points.at(-1)![1]) < 1e-8) points.pop();
    return points;
}

export function floorArea(c: Parameters<typeof floorOutline>[0]): number {
    const points = floorOutline(c);
    return Math.abs(points.reduce((sum, [x, y], i) => sum + x * points[(i + 1) % points.length][1] - y * points[(i + 1) % points.length][0], 0)) / 2;
}
export type FloorFootprint = { name: string; x: number; y: number; width: number; depth: number; rotation?: number };
export function assertFloorOccupancy(c: PresentationInput, footprints: FloorFootprint[]) {
    if (c.floorShape === 'rectangle') return;
    const outline = floorOutline(c);
    for (const box of footprints) {
        const a = (box.rotation ?? 0) * Math.PI / 180;
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
            const x = box.x + sx * box.width / 2 * Math.cos(a) - sy * box.depth / 2 * Math.sin(a);
            const y = box.y + sx * box.width / 2 * Math.sin(a) + sy * box.depth / 2 * Math.cos(a);
            if (outline.some(([ax, ay], i) => {
                const [bx, by] = outline[(i + 1) % outline.length];
                return (bx - ax) * (y - ay) - (by - ay) * (x - ax) < -1e-7;
            })) throw new Error(`${box.name}: ultrapassa o contorno do piso. Reposicione ou reduza a peça, ou escolha outro formato de piso.`);
        }
    }
}

/** Extrusão fechada de 0 a 10 cm; o topo continua na cota usada pelos móveis. */
export function floorMesh(c: Parameters<typeof floorOutline>[0]) {
    const outline = floorOutline(c), n = outline.length;
    const vertices: Point3[] = [...outline.map(([x, y]): Point3 => [x, y, 0]), ...outline.map(([x, y]): Point3 => [x, y, .1]), [0, 0, 0], [0, 0, .1]];
    const faces: Point3[] = [];
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push([2 * n, j, i], [2 * n + 1, i + n, j + n], [i, j, j + n], [i, j + n, i + n]);
    }
    return { vertices, faces };
}

export function lightColor(c: PresentationConfig, fill = false): Point3 | null {
    switch (c.lightingPreset) {
        case 'neutral': return [1, 1, 1];
        case 'warm': return fill ? [1, .9, .8] : [1, .78, .55];
        case 'studio': return fill ? [.75, .85, 1] : [1, 1, 1];
        default: return null;
    }
}

export function presentationViews(c: PresentationInput) {
    const resolution: Point2 = c.presentationFormat === 'square' ? [1080, 1080] : c.presentationFormat === 'portrait' ? [1080, 1920] : [1920, 1080];
    const aspect = resolution[0] / resolution[1], height = c.height + .3;
    const target: Point3 = [0, 0, height / 2], distance = Math.max(c.width, c.depth, height) * 2;
    const cross = (a: Point3, b: Point3): Point3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = (v: Point3): Point3 => v.map(n => n / Math.hypot(...v)) as Point3;
    return ([
        ['front', 'Frontal', [0, -distance, height * 1.2]],
        ['isometric', 'Isometrica', [distance, -distance, distance + height]],
        ['top', 'Superior', [0, 0, distance + height]],
    ] as const).map(([id, name, p]) => {
        const position: Point3 = [...p], back = norm(position.map((v, k) => v - target[k]) as Point3);
        const right: Point3 = id === 'top' ? [1, 0, 0] : norm(cross([0, 0, 1], back));
        const up = cross(back, right);
        let halfWidth = 0, halfHeight = 0;
        for (const x of [-c.width / 2, c.width / 2]) for (const y of [-c.depth / 2, c.depth / 2]) for (const z of [0, height]) {
            const point = [x, y, z].map((v, k) => v - target[k]);
            halfWidth = Math.max(halfWidth, Math.abs(point.reduce((s, v, k) => s + v * right[k], 0)));
            halfHeight = Math.max(halfHeight, Math.abs(point.reduce((s, v, k) => s + v * up[k], 0)));
        }
        return { id, name, position, target, right, up, back, resolution,
            distance: Math.hypot(...position.map((v, k) => v - target[k])),
            width: Math.max(2 * halfWidth, 2 * halfHeight * aspect) * c.presentationMargin };
    });
}
