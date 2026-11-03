import { assemblyGeometry, validate } from './generator';
import type { Config } from './generator';
import { placedMembers, unitTransform } from './assembly';

export function duplicateObject(c: Config, selectedId: string): { config: Config; id: string } {
    validate(c);
    if (c.projectType === 'activation' || c.projectType === 'reception')
        throw new Error('Ajuste a quantidade nos parâmetros deste projeto para recalcular as zonas e os percursos.');
    if (c.objectCopies.length >= 100) throw new Error('O projeto já tem 100 cópias.');
    const unit = assemblyGeometry(c).find(unit => unit.id === selectedId);
    if (!unit) throw new Error('Selecione um objeto para duplicar.');
    const id = Math.max(0, ...c.objectCopies.map(copy => copy.id)) + 1;
    if (id > 999) throw new Error('O limite de identificadores de cópias foi atingido.');
    const key = `copy:${id}`, t = unitTransform(c, unit), members = placedMembers(c, unit);
    const extent = (axis: 'x' | 'y') => {
        const sizes = members.map(m => {
            const a = m.rotation * Math.PI / 180;
            return axis === 'x' ? Math.abs(Math.cos(a))*m.width+Math.abs(Math.sin(a))*m.depth
                : Math.abs(Math.sin(a))*m.width+Math.abs(Math.cos(a))*m.depth;
        });
        return Math.max(...members.map((m,i)=>m[axis]+sizes[i]/2)) - Math.min(...members.map((m,i)=>m[axis]-sizes[i]/2));
    };
    const w = extent('x') + .25, d = extent('y') + .25;
    const offsets = [[w,0],[-w,0],[0,d],[0,-d],[w,d],[-w,d],[w,-d],[-w,-d]];
    for (let ring=1; ring<=8; ring++) for (const [dx,dy] of offsets) {
        const next: Config = { ...c, objectCopies: [...c.objectCopies, { id, sourceId: unit.sourceId ?? unit.id }],
            objectTransforms: { ...c.objectTransforms, [key]: { x: t.x+dx*ring, y: t.y+dy*ring, rotation: t.rotation } } };
        try { validate(next); return { config: next, id: key }; } catch { /* Procura outra posição, preservando o projeto atual. */ }
    }
    throw new Error('Não encontrei espaço livre para a cópia. Mova a peça ou aumente a área e tente novamente.');
}

export function deleteCopy(c: Config, id: string): Config {
    if (!id.startsWith('copy:')) throw new Error('Para retirar uma peça original, use os controles do projeto.');
    const objectTransforms = { ...c.objectTransforms }; delete objectTransforms[id];
    const next = { ...c, objectCopies: c.objectCopies.filter(copy => `copy:${copy.id}` !== id), objectTransforms };
    validate(next); return next;
}
