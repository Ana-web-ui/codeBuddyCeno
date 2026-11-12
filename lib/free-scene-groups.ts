import type { FreeObject, FreeScene, V3 } from './free-scene';
import { connectedWallIds, constrainWallMotion, wallIntersectsScene } from './free-wall-contact';

/** Keep group members in world coordinates so ungrouping never changes their pose. */
export function freeSelection(scene: FreeScene, id: number, selected: number[], additive = false, individual = false): number[] {
    const group = individual ? undefined : scene.groups?.find(group => group.objectIds.includes(id));
    const connected = individual ? [id] : connectedWallIds(scene,group?.objectIds ?? [id]);
    const members = [...connected.filter(member => member !== id), id];
    if (!additive) return members;
    return members.every(member => selected.includes(member))
        ? selected.filter(member => !members.includes(member))
        : [...new Set([...selected, ...members])];
}

export function groupFreeObjects(scene: FreeScene, ids: number[]): FreeScene {
    const groups = scene.groups ?? [];
    const members = new Set(connectedWallIds(scene,ids));
    for (const group of groups) {
        if (group.objectIds.some(id => members.has(id))) group.objectIds.forEach(id => members.add(id));
    }
    const objects = scene.objects.filter(object => members.has(object.id));
    if (objects.length < 2) throw new Error('Selecione pelo menos duas peças para agrupar.');
    if (objects.some(object => object.locked)) throw new Error('Desbloqueie todas as peças antes de agrupar.');
    const id = Math.max(0, ...groups.map(group => group.id)) + 1;
    return {...scene, groups: [
        ...groups.filter(group => !group.objectIds.some(id => members.has(id))),
        {id, name: `Grupo ${id}`, objectIds: objects.map(object => object.id)},
    ]};
}

export function ungroupFreeObjects(scene: FreeScene, ids: number[]): FreeScene {
    return {...scene, groups: (scene.groups ?? []).filter(group => !group.objectIds.some(id => ids.includes(id)))};
}

export function moveFreeObjects(scene: FreeScene, ids: number[], delta: V3): FreeScene {
    const members = new Set(connectedWallIds(scene,ids));
    if (scene.objects.some(object => members.has(object.id) && object.locked)) {
        throw new Error('Desbloqueie todas as peças selecionadas para mover o conjunto.');
    }
    const movement = constrainWallMotion(scene,[...members],delta).delta;
    return {...scene, objects: scene.objects.map(object => members.has(object.id)
        ? {...object, position: object.position.map((value, axis) => value + movement[axis]) as V3}
        : object)};
}

export function removeFreeObjects(scene: FreeScene, ids: number[]): FreeScene {
    if (scene.objects.some(object => ids.includes(object.id) && object.locked)) {
        throw new Error('Desbloqueie todas as peças selecionadas antes de excluir.');
    }
    return {...scene, objects: scene.objects.filter(object => !ids.includes(object.id)), groups: (scene.groups ?? [])
        .map(group => ({...group, objectIds: group.objectIds.filter(id => !ids.includes(id))}))
        .filter(group => group.objectIds.length >= 2), wallLinks: (scene.wallLinks ?? []).filter(pair=>pair.every(id=>!ids.includes(id)))};
}

export function updateFreeObject(scene: FreeScene, id: number, change: Partial<FreeObject>): FreeScene {
    const original = scene.objects.find(object=>object.id===id);
    if (!original) return scene;
    const changedShape = (['size','rotation'] as const).some(key=>change[key]?.some((value,axis)=>Math.abs(value-original[key][axis])>1e-8));
    if (original.kind==='wall' && changedShape && scene.wallLinks?.some(pair=>pair.includes(id))) {
        throw new Error('Solte o ímã antes de girar ou alterar as medidas desta parede.');
    }
    if (change.position && !changedShape) {
        const delta = change.position.map((value,axis)=>value-original.position[axis]) as V3;
        const moved = moveFreeObjects(scene,[id],delta);
        return {...moved,objects:moved.objects.map(object=>object.id===id?{...object,...change,position:object.position}:object)};
    }
    const next = {...original,...change};
    if (next.kind==='wall' && changedShape && wallIntersectsScene(scene,next)) throw new Error('Essa medida ou rotação faz a parede atravessar outra.');
    return {...scene,objects:scene.objects.map(object=>object.id===id?next:object)};
}
