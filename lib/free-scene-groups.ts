import type { FreeScene, V3 } from './free-scene';

/** Keep group members in world coordinates so ungrouping never changes their pose. */
export function freeSelection(scene: FreeScene, id: number, selected: number[], additive = false, individual = false): number[] {
    const group = individual ? undefined : scene.groups?.find(group => group.objectIds.includes(id));
    const members = [...(group?.objectIds ?? [id]).filter(member => member !== id), id];
    if (!additive) return members;
    return members.every(member => selected.includes(member))
        ? selected.filter(member => !members.includes(member))
        : [...new Set([...selected, ...members])];
}

export function groupFreeObjects(scene: FreeScene, ids: number[]): FreeScene {
    const groups = scene.groups ?? [];
    const members = new Set(ids);
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
    const members = new Set(ids);
    if (scene.objects.some(object => members.has(object.id) && object.locked)) {
        throw new Error('Desbloqueie todas as peças selecionadas para mover o conjunto.');
    }
    return {...scene, objects: scene.objects.map(object => members.has(object.id)
        ? {...object, position: object.position.map((value, axis) => value + delta[axis]) as V3}
        : object)};
}

export function removeFreeObjects(scene: FreeScene, ids: number[]): FreeScene {
    if (scene.objects.some(object => ids.includes(object.id) && object.locked)) {
        throw new Error('Desbloqueie todas as peças selecionadas antes de excluir.');
    }
    return {...scene, objects: scene.objects.filter(object => !ids.includes(object.id)), groups: (scene.groups ?? [])
        .map(group => ({...group, objectIds: group.objectIds.filter(id => !ids.includes(id))}))
        .filter(group => group.objectIds.length >= 2)};
}
