import type { Config, MaterialKind } from './generator';
import { storageGeometry } from './storage';

export type StoragePart = {
    name: string;
    role: 'storage_wall' | 'storage_frame' | 'storage_door';
    size: [number, number, number];
    center: [number, number, number];
    material: MaterialKind;
};

/** A mesma lista de peças alimenta os dois programas; medidas em metros. */
export function storageParts(c: Config) {
    const geometry = storageGeometry(c);
    if (!geometry) return null;
    const floor = 0.1, frame = 0.03, gap = 0.008;
    const t = c.storageWallThickness, height = c.storageHeight;
    const parts: StoragePart[] = [];
    function box(name: string, role: StoragePart['role'], size: StoragePart['size'], center: StoragePart['center'], material: MaterialKind) {
        parts.push({ name: 'Deposito_' + name, role, size, center, material });
    }
    const faces = [
        { id: 'front', name: 'Frente', nx: 0, ny: -1 },
        { id: 'back', name: 'Fundo', nx: 0, ny: 1 },
        { id: 'left', name: 'Esquerda', nx: -1, ny: 0 },
        { id: 'right', name: 'Direita', nx: 1, ny: 0 },
    ] as const;
    for (const face of faces) {
        const horizontal = face.ny !== 0;
        const tx = -face.ny, ty = face.nx;
        const length = horizontal ? c.storageWidth : c.storageDepth - 2 * t;
        const distance = horizontal ? c.storageDepth / 2 - t / 2 : c.storageWidth / 2 - t / 2;
        const x = c.storageX + face.nx * distance, y = c.storageY + face.ny * distance;
        function segment(suffix: string, from: number, to: number, bottom: number, h: number) {
            box('Parede_' + face.name + suffix, 'storage_wall',
                horizontal ? [to - from, t, h] : [t, to - from, h],
                [x + tx * (from + to) / 2, y + ty * (from + to) / 2, floor + bottom + h / 2], c.storageWallMat);
        }
        if (face.id === c.storageDoorSide) {
            // O vão bruto recebe o batente; o vão livre mantém a medida informada.
            const opening = c.storageDoorWidth + 2 * frame;
            const openingHeight = c.storageDoorHeight + frame;
            segment('_Lado_A', -length / 2, -opening / 2, 0, height);
            segment('_Lado_B', opening / 2, length / 2, 0, height);
            segment('_Superior', -opening / 2, opening / 2, openingHeight, height - openingHeight);
        } else segment('', -length / 2, length / 2, 0, height);
    }
    const horizontal = geometry.door.normal.y !== 0;
    const { center, tangent, hinge, closedEnd, openEnd } = geometry.door;
    for (const sign of [-1, 1]) {
        const offset = sign * (c.storageDoorWidth / 2 + frame / 2);
        box('Batente_' + (sign === -1 ? 'Esquerdo' : 'Direito'), 'storage_frame',
            horizontal ? [frame, t, c.storageDoorHeight] : [t, frame, c.storageDoorHeight],
            [center.x + tangent.x * offset, center.y + tangent.y * offset, floor + c.storageDoorHeight / 2], c.storageDoorMat);
    }
    box('Batente_Superior', 'storage_frame',
        horizontal ? [c.storageDoorWidth + 2 * frame, t, frame] : [t, c.storageDoorWidth + 2 * frame, frame],
        [center.x, center.y, floor + c.storageDoorHeight + frame / 2], c.storageDoorMat);
    const leafWidth = c.storageDoorWidth - gap;
    const leafHeight = c.storageDoorHeight - 2 * gap;
    const leafThickness = Math.min(0.04, t * 0.5);
    box('Porta', 'storage_door',
        horizontal ? [leafWidth, leafThickness, leafHeight] : [leafThickness, leafWidth, leafHeight],
        [center.x, center.y, floor + gap + leafHeight / 2], c.storageDoorMat);
    const a = { x: closedEnd.x - hinge.x, y: closedEnd.y - hinge.y };
    const b = { x: openEnd.x - hinge.x, y: openEnd.y - hinge.y };
    const openAngle = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180 / Math.PI;
    return { parts, pivot: [hinge.x, hinge.y, floor] as [number, number, number],
        root: [c.storageX, c.storageY, floor] as [number, number, number], openAngle };
}

export function blenderStorage(c: Config): string {
    const data = storageParts(c);
    if (!data) return '';
    return `
# DEPOSITO: paredes, batente e porta fechada com origem na dobradica.
def criar_deposito():
    from mathutils import Matrix
    raiz = organizar(bpy.data.objects.new('Deposito', None))
    raiz.location = ${JSON.stringify(data.root)}
    raiz['code_buddy_role'] = 'storage_root'
    bpy.context.view_layer.update()
    pecas = ${JSON.stringify(data.parts.map(p => [p.name, p.role, p.size, p.center, p.material]))}
    for nome, papel, tamanho, centro, material in pecas:
        objeto = caixa(nome, tamanho, centro, acabamento(material))
        objeto['code_buddy_role'] = papel
        if papel == 'storage_door':
            pivo = Vector(${JSON.stringify(data.pivot)})
            objeto.data.transform(Matrix.Translation(Vector(centro) - pivo))
            objeto.location = pivo
            objeto['code_buddy_open_angle'] = ${data.openAngle}
        bpy.context.view_layer.update()
        matriz = objeto.matrix_world.copy()
        objeto.parent = raiz
        objeto.matrix_world = matriz

criar_deposito()
`;
}

export function maxStorage(c: Config): string {
    const data = storageParts(c);
    if (!data) return '';
    const point = (p: number[]) => '[' + p.map(n => `(${n}*METRO)`).join(',') + ']';
    return `
-- DEPOSITO: mesmas pecas e medidas do exportador Blender.
undo "Adicionar deposito Code Buddy" on
(
    local raizDeposito = cbRegistrar (Dummy name:(nomeGeracao + "_Deposito") pos:${point(data.root)})
    setUserProp raizDeposito "code_buddy_role" "storage_root"
    local materialParedeDeposito = cbMaterial "${c.storageWallMat}"
    local materialPortaDeposito = cbMaterial "${c.storageDoorMat}"
    local peca
${data.parts.map(p => `    peca = cbCaixa "${p.name}" ${p.size.join(' ')} ${p.center.join(' ')} ${p.role === 'storage_wall' ? 'materialParedeDeposito' : 'materialPortaDeposito'}
    setUserProp peca "code_buddy_role" "${p.role}"
${p.role === 'storage_door' ? `    peca.pivot = ${point(data.pivot)}
    setUserProp peca "code_buddy_open_angle" ${data.openAngle}
` : ''}    peca.parent = raizDeposito`).join('\n')}
)
`;
}
