import type { Config } from './generator';

/** Uma nova unidade LED usa suportes próprios, preservando a arte e a orientação. */
export function copiedLed(c: Config, x: number, y: number): string {
    const z = .1+c.ledBottom+c.ledHeight/2;
    if (c.target === 'blender') return `
escuro_copia = material('Grafite_LED', (.025, .03, .045, 1))
caixa('LED_Moldura', (${c.ledWidth+.12}, .12, ${c.ledHeight+.12}), (${x}, ${y}, ${z}), escuro_copia, .02)
obj_tela = tela_tv(${c.ledWidth}, ${c.ledHeight}, ${y-.075}, ${z}, material_tv())
obj_tela.location.x += ${x}
${[-1,1].map(sign => `caixa('LED_Suporte', (.09, .09, ${c.ledBottom}), (${x+sign*c.ledWidth*.4}, ${y}, ${.1+c.ledBottom/2}), escuro_copia)
caixa('LED_Base', (.45, .5, .06), (${x+sign*c.ledWidth*.4}, ${y}, .13), escuro_copia, .01)`).join('\n')}
`;
    return `
cbCaixa "LED_Moldura" (${c.ledWidth+.12}) .12 (${c.ledHeight+.12}) (${x}) (${y}) (${z}) (cbMaterial "metal")
local cbTelaAntes = for obj in objects collect obj
cbTela (${c.ledWidth}) (${c.ledHeight}) (${y-.075}) (${z}) tela
for obj in objects where ((findItem cbTelaAntes obj) == 0) do obj.pos.x += ${x}*METRO
${[-1,1].map(sign => `cbCaixa "LED_Suporte" .09 .09 (${c.ledBottom}) (${x+sign*c.ledWidth*.4}) (${y}) (${.1+c.ledBottom/2}) (cbMaterial "metal")
cbCaixa "LED_Base" .45 .5 .06 (${x+sign*c.ledWidth*.4}) (${y}) .13 (cbMaterial "metal")`).join('\n')}
`;
}
