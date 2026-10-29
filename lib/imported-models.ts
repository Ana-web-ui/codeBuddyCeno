import type { MaterialKind } from './generator';

export const MAX_MODEL_BYTES = 2 * 1024 * 1024;
export const MAX_MODELS = 5;
export type ImportedModel = {
    id: number; name: string; source: string;
    unit: 'm' | 'cm' | 'mm'; upAxis: 'z' | 'y';
    scale: number; x: number; y: number; z: number; rotation: number;
    material: MaterialKind;
};
export type ImportedModelsConfig = { importedModels: ImportedModel[] };
export const importedModelsDefaults: ImportedModelsConfig = { importedModels: [] };
type Vec3 = [number, number, number];
type Triangle = [number, number, number];
export type ObjMesh = { name: string; vertices: Vec3[]; faces: Triangle[] };
export type ParsedObj = { meshes: ObjMesh[]; min: Vec3; max: Vec3; vertexCount: number; triangleCount: number };
const cache = new Map<string, ParsedObj>();

/** Triangula polígonos simples, inclusive côncavos, preservando a ordem dos vértices. */
function triangulate(indices: number[], vertices: Vec3[]): Triangle[] {
    if (indices[0] === indices.at(-1)) indices = indices.slice(0, -1);
    if (indices.length < 3 || indices.length > 64 || new Set(indices).size !== indices.length)
        throw new Error('Use faces simples com 3 a 64 vértices distintos.');
    const points = indices.map(i => vertices[i]);
    const origin = points[0];
    const normal: Vec3 = [0, 0, 0];
    for (let i = 1; i < points.length - 1; i++) {
        const a = points[i].map((v, k) => v - origin[k]), b = points[i + 1].map((v, k) => v - origin[k]);
        normal[0] += a[1] * b[2] - a[2] * b[1];
        normal[1] += a[2] * b[0] - a[0] * b[2];
        normal[2] += a[0] * b[1] - a[1] * b[0];
    }
    const axis = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
    const plane = points.map(p => p.filter((_, k) => k !== axis));
    const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const area = plane.reduce((sum, p, i) => sum + p[0] * plane[(i + 1) % plane.length][1] - plane[(i + 1) % plane.length][0] * p[1], 0);
    const span = Math.max(...plane.flatMap(p => p.map((v, k) => Math.abs(v - plane[0][k]))));
    const eps = span * span * 1e-10;
    if (!span || Math.abs(area) <= eps) throw new Error('O OBJ contém uma face sem área.');
    const sign = Math.sign(area), remaining = indices.map((_, i) => i), result: Triangle[] = [];
    while (remaining.length > 3) {
        let found = false;
        for (let j = 0; j < remaining.length; j++) {
            const a = remaining[(j + remaining.length - 1) % remaining.length], b = remaining[j], c = remaining[(j + 1) % remaining.length];
            if (sign * cross(plane[a], plane[b], plane[c]) <= eps) continue;
            if (remaining.some(i => i !== a && i !== b && i !== c &&
                sign * cross(plane[a], plane[b], plane[i]) >= -eps &&
                sign * cross(plane[b], plane[c], plane[i]) >= -eps &&
                sign * cross(plane[c], plane[a], plane[i]) >= -eps)) continue;
            result.push([indices[a], indices[b], indices[c]]);
            remaining.splice(j, 1); found = true; break;
        }
        if (!found) throw new Error('Não foi possível triangular uma face. Exporte o OBJ com faces trianguladas.');
    }
    if (Math.abs(cross(...remaining.map(i => plane[i]) as [number[], number[], number[]])) <= eps)
        throw new Error('O OBJ contém uma face degenerada. Exporte com triangulação.');
    result.push(remaining.map(i => indices[i]) as Triangle);
    return result;
}

/** Lê somente geometria. Não abre caminhos, MTL, URLs nem executa conteúdo do OBJ. */
export function parseObj(source: string): ParsedObj {
    if (typeof source !== 'string' || new TextEncoder().encode(source).length > MAX_MODEL_BYTES)
        throw new Error('Use um arquivo OBJ de até 2 MB.');
    const cached = cache.get(source);
    if (cached) return cached;
    const vertices: Vec3[] = [], groups: { name: string; faces: Triangle[] }[] = [];
    let group = { name: 'Malha', faces: [] as Triangle[] }, triangleCount = 0;
    groups.push(group);
    for (const [lineIndex, raw] of source.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
        const tokens = raw.split('#')[0].trim().split(/\s+/), command = tokens.shift();
        if (!command) continue;
        try {
            if (command === 'v') {
                if (tokens.length !== 3) throw new Error('Use vértices XYZ, sem coordenada homogênea ou cor por vértice.');
                const v = tokens.map(Number);
                if (!v.every(n => Number.isFinite(n) && Math.abs(n) <= 1e9)) throw new Error('Coordenada inválida.');
                vertices.push(v as Vec3);
                if (vertices.length > 20000) throw new Error('Use até 20 mil vértices por arquivo.');
            } else if (command === 'o' || command === 'g') {
                const name = tokens.join(' ').replace(/[\x00-\x1f]/g, '').slice(0, 100) || 'Malha';
                if (!group.faces.length) group.name = name;
                else { group = { name, faces: [] }; groups.push(group); }
                if (groups.length > 200) throw new Error('Use até 200 partes por arquivo.');
            } else if (command === 'f') {
                const indices = tokens.map(token => {
                    const value = token.split('/')[0];
                    if (!/^-?\d+$/.test(value)) throw new Error('Índice de face inválido.');
                    const n = Number(value), index = n < 0 ? vertices.length + n : n - 1;
                    if (!Number.isSafeInteger(n) || n === 0 || index < 0 || index >= vertices.length) throw new Error('A face aponta para um vértice inexistente.');
                    return index;
                });
                const faces = triangulate(indices, vertices);
                triangleCount += faces.length;
                if (triangleCount > 40000) throw new Error('Use até 40 mil triângulos por arquivo.');
                group.faces.push(...faces);
            } else if (!['vt', 'vn', 's', 'usemtl', 'mtllib'].includes(command)) {
                throw new Error('Este OBJ usa elementos não suportados. Exporte uma malha poligonal com faces.');
            }
        } catch (error) {
            throw new Error(`OBJ, linha ${lineIndex + 1}: ${error instanceof Error ? error.message : 'Dados inválidos.'}`);
        }
    }
    if (!triangleCount) throw new Error('O OBJ não contém faces para importar.');
    const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
    const meshes = groups.filter(g => g.faces.length).map(g => {
        const remap = new Map<number, number>(), used: Vec3[] = [];
        const faces = g.faces.map(f => f.map(index => {
            if (!remap.has(index)) {
                remap.set(index, used.length); used.push(vertices[index]);
                vertices[index].forEach((n, k) => { min[k] = Math.min(min[k], n); max[k] = Math.max(max[k], n); });
            }
            return remap.get(index)!;
        }) as Triangle);
        return { name: g.name, vertices: used, faces };
    });
    const parsed = { meshes, min, max, triangleCount, vertexCount: vertices.length };
    // Limita o cache durante importações e edições, sem duplicar geometria no JSON.
    if (cache.size >= MAX_MODELS) cache.delete(cache.keys().next().value!);
    cache.set(source, parsed);
    return parsed;
}

export function modelGeometry(model: ImportedModel) {
    const obj = parseObj(model.source), factor = ({ m: 1, cm: .01, mm: .001 })[model.unit] * model.scale;
    const convert = ([x, y, z]: Vec3): Vec3 => (model.upAxis === 'y' ? [x, -z, y] : [x, y, z]).map(n => n * factor) as Vec3;
    const a = convert(obj.min), b = convert(obj.max);
    const min = a.map((n, k) => Math.min(n, b[k])), max = a.map((n, k) => Math.max(n, b[k]));
    const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, min[2]];
    return { size: max.map((n, k) => n - min[k]) as Vec3, triangleCount: obj.triangleCount,
        meshes: obj.meshes.map(mesh => ({ ...mesh, vertices: mesh.vertices.map(v => convert(v).map((n, k) => n - center[k]) as Vec3) })) };
}

export function checkImportedModels(value: unknown): asserts value is ImportedModel[] {
    if (!Array.isArray(value) || value.length > MAX_MODELS) throw new Error('Importe até 5 objetos personalizados.');
    const ids = new Set<number>();
    for (const model of value) {
        if (!model || typeof model !== 'object' || Array.isArray(model) ||
            Object.keys(model).sort().join(',') !== 'id,material,name,rotation,scale,source,unit,upAxis,x,y,z')
            throw new Error('Os dados do objeto importado são inválidos.');
        if (!Number.isInteger(model.id) || model.id < 1 || model.id > 999 || ids.has(model.id)) throw new Error('Identidade inválida ou repetida no objeto importado.');
        ids.add(model.id);
        if (typeof model.name !== 'string' || !model.name.trim() || model.name.length > 100 || /[\x00-\x1f]/.test(model.name)) throw new Error('Use um nome de 1 a 100 caracteres para o objeto.');
        if (!['m', 'cm', 'mm'].includes(model.unit) || !['z', 'y'].includes(model.upAxis)) throw new Error('Confira a unidade e o eixo vertical do OBJ.');
        if (!['white', 'brand', 'wood', 'metal', 'glass', 'concrete', 'plastic'].includes(model.material)) throw new Error('Material do objeto importado inválido.');
        if (!Number.isFinite(model.scale) || model.scale < .001 || model.scale > 1000) throw new Error('Use uma escala entre 0,001 e 1000.');
        if (![model.x, model.y, model.z, model.rotation].every(Number.isFinite) || Math.abs(model.x) > 30 || Math.abs(model.y) > 30 || model.z < 0 || model.z > 10 || Math.abs(model.rotation) > 360)
            throw new Error('Confira a posição, elevação e rotação do objeto importado.');
        parseObj(model.source);
    }
}

export function validateImportedModels(c: ImportedModelsConfig & { width: number; depth: number; height: number }) {
    checkImportedModels(c.importedModels);
    for (const model of c.importedModels) {
        const { size: [w, d, h] } = modelGeometry(model), a = model.rotation * Math.PI / 180;
        const width = Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * d;
        const depth = Math.abs(Math.sin(a)) * w + Math.abs(Math.cos(a)) * d;
        if (Math.max(w, d, h) < .001 || Math.abs(model.x) + width / 2 > c.width / 2 - .2 + 1e-7 || Math.abs(model.y) + depth / 2 > c.depth / 2 - .2 + 1e-7 || model.z + h > c.height + 1e-7)
            throw new Error(`${model.name}: ajuste unidade, escala ou posição para caber na área do projeto, com margem lateral de 20 cm.`);
    }
}
