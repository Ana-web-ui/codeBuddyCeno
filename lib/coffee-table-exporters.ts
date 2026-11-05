import type { CoffeeTableConfig } from './library';
type Layout = { positions: [number, number][] };

/** Mesa existente: tampo com a espessura configurada e quatro pés. */
export function coffeeTableParts(c: CoffeeTableConfig) {
    const w=c.coffeeTableWidth, d=c.coffeeTableDepth, h=c.coffeeTableHeight;
    const t=c.coffeeTableTopThickness, leg=Math.min(0.06,w/6,d/6);
    const parts=[{name:'Tampo',size:[w,d,t],center:[0,0,0.1+h-t/2]}];
    for(const x of [-1,1]) for(const y of [-1,1]) parts.push({
        name:`Pe_${parts.length}`,size:[leg,leg,h-t],
        center:[x*(w/2-leg),y*(d/2-leg),0.1+(h-t)/2],
    });
    return parts;
}

export function blenderCoffeeTables(c: CoffeeTableConfig, layout: Layout): string {
    return layout.positions.map(([x,y],index)=>coffeeTableParts(c).map(p=>
        `caixa('Mesa_Centro_${index+1}_${p.name}', (${p.size.join(', ')}), (${x+p.center[0]}, ${y+p.center[1]}, ${p.center[2]}), acabamento('${c.coffeeTableMat}'))`
    ).join('\n')).join('\n');
}

export function maxCoffeeTables(c: CoffeeTableConfig, layout: Layout): string {
    return layout.positions.map(([x,y],index)=>coffeeTableParts(c).map(p=>
        `cbCaixa "Mesa_Centro_${index+1}_${p.name}" ${p.size.join(' ')} ${x+p.center[0]} ${y+p.center[1]} ${p.center[2]} (cbMaterial "${c.coffeeTableMat}")`
    ).join('\n')).join('\n');
}
