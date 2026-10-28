import type { Config } from './generator';
import { counterParts } from './counter';

/** Cada balcão mantém partes independentes sob uma raiz própria. */
export function blenderCounters(c: Config, xs: number[], y: number): string {
    if (!c.counter) return '';
    const parts = counterParts(c);
    return xs.map((x, index) => {
        const prefix = `Balcao_${String(index + 1).padStart(2, '0')}`;
        return `
raiz_balcao = organizar(bpy.data.objects.new(colecao.name + '_${prefix}', None))
raiz_balcao.location = (${x}, ${y}, .1)
raiz_balcao.empty_display_type = 'PLAIN_AXES'
raiz_balcao.empty_display_size = .2
raiz_balcao['code_buddy_id'] = 'counter:${index}'
raiz_balcao['code_buddy_role'] = 'counter_unit'
bpy.context.view_layer.update()
${parts.map(p => `peca_balcao = caixa(colecao.name + '_${prefix}_${p.name}', (${p.size.join(', ')}), (${x}, ${y}, ${p.z}), acabamento('${p.material}'), ${Math.min(.008, ...p.size.map(n => n / 4))})
peca_balcao['code_buddy_id'] = 'counter:${index}'
peca_balcao['code_buddy_role'] = '${p.role}'
bpy.context.view_layer.update()
matriz_balcao = peca_balcao.matrix_world.copy()
peca_balcao.parent = raiz_balcao
peca_balcao.matrix_world = matriz_balcao`).join('\n')}
`;
    }).join('\n');
}

export function maxCounters(c: Config, xs: number[], y: number): string {
    if (!c.counter) return '';
    const parts = counterParts(c);
    return xs.map((x, index) => {
        const prefix = `Balcao_${String(index + 1).padStart(2, '0')}`;
        return `
(
    local raizBalcao = cbRegistrar (Dummy name:(nomeGeracao+"_${prefix}") pos:[${x}*METRO,${y}*METRO,.1*METRO])
    setUserProp raizBalcao "code_buddy_id" "counter:${index}"
    setUserProp raizBalcao "code_buddy_role" "counter_unit"
${parts.map(p => `    local pecaBalcao = cbCaixa "${prefix}_${p.name}" ${p.size.map(n => `(${n})`).join(' ')} (${x}) (${y}) (${p.z}) (cbMaterial "${p.material}")
    pecaBalcao.name = nomeGeracao+"_${prefix}_${p.name}"
    setUserProp pecaBalcao "code_buddy_id" "counter:${index}"
    setUserProp pecaBalcao "code_buddy_role" "${p.role}"
    pecaBalcao.parent = raizBalcao`).join('\n')}
)
`;
    }).join('\n');
}
