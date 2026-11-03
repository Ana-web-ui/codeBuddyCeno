import type { Config } from './generator';
import type { AssemblyUnit } from './assembly';

/** Ao sair da posição fixa na parede, o painel leva suportes próprios. */
export function ledHasSupports(c: Config): boolean {
    return !c.back || Object.hasOwn(c.objectTransforms, 'led:0');
}
export function ledUnit(c: Config): AssemblyUnit {
    const x = 0, y = c.depth / 2 - .35;
    const members: AssemblyUnit['members'] = [{ role: 'led', index: 0, x, y, rotation: 0,
        width: c.ledWidth + .12, depth: .2, circle: false, material: 'brand' }];
    if (ledHasSupports(c)) for (const sign of [-1, 1]) members.push({ role: 'led', index: members.length,
        x: sign * c.ledWidth * .4, y, rotation: 0, width: .45, depth: .5, circle: false, material: 'metal' });
    return { id: 'led:0', label: 'Painel de LED', x, y, rotation: 0, floor: false, members };
}
