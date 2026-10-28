import type { ShelvingInput } from './shelving';
import { shelvingParts } from './shelving';

type Layout = { positions: [number, number][] };
type Options = { grouped?: boolean };

export function blenderShelving(c: ShelvingInput, layout: Layout, options: Options = {}): string {
    if (!c.shelving || !c.shelfDetailed || !layout.positions.length) return '';
    const parts = shelvingParts(c);
    return layout.positions.map(([x, y], index) => {
        const prefix = `Estante_${String(index + 1).padStart(3, '0')}`;
        return `
# ESTANTE DETALHADA: shelving:${index}
${options.grouped === false ? '' : `raiz_estante = organizar(bpy.data.objects.new(colecao.name + '_${prefix}_Grupo', None))
raiz_estante.location = (${x}, ${y}, .1)
raiz_estante.empty_display_type = 'PLAIN_AXES'
raiz_estante.empty_display_size = .2
raiz_estante['code_buddy_id'] = 'shelving:${index}'
raiz_estante['code_buddy_role'] = 'assembly_unit'
raiz_estante['code_buddy_label'] = 'Estante ${index + 1}'
bpy.context.view_layer.update()`}
${parts.map(p => `peca_estante = caixa(colecao.name + '_${prefix}_${p.name}', (${p.size.join(', ')}), (${x + p.center[0]}, ${y + p.center[1]}, ${p.center[2]}), acabamento('${p.material}'), ${Math.min(.003, ...p.size.map(n => n / 4))})
peca_estante['code_buddy_role'] = '${p.role}'
peca_estante['code_buddy_id'] = 'shelving:${index}'
${options.grouped === false ? '' : `bpy.context.view_layer.update()
matriz_estante = peca_estante.matrix_world.copy()
peca_estante.parent = raiz_estante
peca_estante.matrix_world = matriz_estante`}`).join('\n')}
`;
    }).join('\n');
}

export function maxShelving(c: ShelvingInput, layout: Layout, options: Options = {}): string {
    if (!c.shelving || !c.shelfDetailed || !layout.positions.length) return '';
    const parts = shelvingParts(c);
    return layout.positions.map(([x, y], index) => {
        const prefix = `Estante_${String(index + 1).padStart(3, '0')}`;
        return `
-- ESTANTE DETALHADA: shelving:${index}
(
${options.grouped === false ? '' : `    local raizEstante = cbRegistrar (Dummy name:(nomeGeracao+"_${prefix}_Grupo") pos:[${x}*METRO,${y}*METRO,.1*METRO])
    setUserProp raizEstante "code_buddy_id" "shelving:${index}"
    setUserProp raizEstante "code_buddy_role" "assembly_unit"`}
${parts.map(p => `    local pecaEstante = cbCaixa "${prefix}_${p.name}" ${p.size.map(n => `(${n})`).join(' ')} (${x + p.center[0]}) (${y + p.center[1]}) (${p.center[2]}) (cbMaterial "${p.material}")
    pecaEstante.name = nomeGeracao+"_${prefix}_${p.name}"
    setUserProp pecaEstante "code_buddy_role" "${p.role}"
    setUserProp pecaEstante "code_buddy_id" "shelving:${index}"
${options.grouped === false ? '' : '    pecaEstante.parent = raizEstante'}`).join('\n')}
)
`;
    }).join('\n');
}
