import type { Config, MaterialKind } from './generator';

type DemoPart = { name:string; role:string; size:number[]; center:number[]; material:MaterialKind };
/** Bancada e produto separados, com o fundo do produto exatamente sobre o tampo. */
export function demoParts(c:Config,x:number,y:number):DemoPart[] {
    const floor=.1,top=.06;
    return [
        {name:'Demo_Bancada_Corpo',role:'demo_bench_body',size:[c.demoBenchWidth,c.demoBenchDepth,c.demoBenchHeight-top],center:[x,y,floor+(c.demoBenchHeight-top)/2],material:c.demoBenchMat},
        {name:'Demo_Bancada_Tampo',role:'demo_bench_top',size:[c.demoBenchWidth+.08,c.demoBenchDepth+.08,top],center:[x,y,floor+c.demoBenchHeight-top/2],material:'white'},
        {name:'Demo_Produto_Referencia',role:'demo_product',size:[c.demoProductWidth,c.demoProductDepth,c.demoProductHeight],center:[x+c.demoProductX,y+c.demoProductY,floor+c.demoBenchHeight+c.demoProductHeight/2],material:c.demoProductMat},
    ];
}
type Layout={positions:[number,number][]};
export function blenderDemoStation(c:Config,layout:Layout):string {
    return layout.positions.map(([x,y])=>demoParts(c,x,y).map(p=>`
objeto_demo = caixa('${p.name}', ${JSON.stringify(p.size)}, ${JSON.stringify(p.center)}, acabamento('${p.material}'))
objeto_demo['code_buddy_role'] = '${p.role}'
`).join('')).join('');
}
export function maxDemoStation(c:Config,layout:Layout):string {
    return `
(
    local pecaDemo
${layout.positions.flatMap(([x,y])=>demoParts(c,x,y)).map(p=>`    pecaDemo = cbCaixa "${p.name}" ${p.size.join(' ')} ${p.center.join(' ')} (cbMaterial "${p.material}")
    setUserProp pecaDemo "code_buddy_role" "${p.role}"`).join('\n')}
)
`;
}
