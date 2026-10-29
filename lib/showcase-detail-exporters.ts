import type { ShowcaseInput } from './showcase';
import { showcaseParts } from './showcase';

type Layout = { positions: [number, number][] };
type Options = { grouped?: boolean };

export function blenderDetailedShowcases(c: ShowcaseInput, layout: Layout, options: Options = {}): string {
    if (!c.showcases || !c.showcaseDetailed || !layout.positions.length) return '';
    const parts = showcaseParts(c);
    return layout.positions.map(([x, y], index) => {
        const prefix = `Vitrine_${String(index + 1).padStart(3, '0')}`;
        return `
# VITRINE DETALHADA: showcases:${index}
vidro_vitrine = acabamento('glass').copy()
vidro_vitrine.name = colecao.name + '_Vidro_Vitrine_${index + 1}'
identificar(vidro_vitrine)
shader_vitrine = next(n for n in vidro_vitrine.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
shader_vitrine.inputs['Roughness'].default_value = ${c.showcaseGlassRoughness}
shader_vitrine.inputs['IOR'].default_value = ${c.showcaseGlassIor}
${options.grouped === false ? '' : `raiz_vitrine = organizar(bpy.data.objects.new(colecao.name + '_${prefix}_Grupo', None))
raiz_vitrine.location = (${x}, ${y}, .1)
raiz_vitrine.empty_display_type = 'PLAIN_AXES'
raiz_vitrine.empty_display_size = .2
raiz_vitrine['code_buddy_id'] = 'showcases:${index}'
raiz_vitrine['code_buddy_role'] = 'assembly_unit'
raiz_vitrine['code_buddy_label'] = 'Vitrine ${index + 1}'
bpy.context.view_layer.update()`}
${parts.map(p => `peca_vitrine = caixa(colecao.name + '_${prefix}_${p.name}', (${p.size.join(', ')}), (${x + p.center[0]}, ${y + p.center[1]}, ${p.center[2]}), ${p.glass ? 'vidro_vitrine' : `acabamento('${p.material}')`}, ${Math.min(p.glass ? .0005 : .003, ...p.size.map(n => n / 4))})
peca_vitrine['code_buddy_role'] = '${p.role}'
peca_vitrine['code_buddy_id'] = 'showcases:${index}'
${options.grouped === false ? '' : `bpy.context.view_layer.update()
matriz_vitrine = peca_vitrine.matrix_world.copy()
peca_vitrine.parent = raiz_vitrine
peca_vitrine.matrix_world = matriz_vitrine`}`).join('\n')}
`;
    }).join('\n');
}

export function maxDetailedShowcases(c: ShowcaseInput, layout: Layout, options: Options = {}): string {
    if (!c.showcases || !c.showcaseDetailed || !layout.positions.length) return '';
    const parts = showcaseParts(c);
    return layout.positions.map(([x, y], index) => {
        const prefix = `Vitrine_${String(index + 1).padStart(3, '0')}`;
        return `
-- VITRINE DETALHADA: showcases:${index}
(
    local vidroVitrine = cbMaterial "glass"
    vidroVitrine.name = nomeGeracao+"_Vidro_Vitrine_${index + 1}"
    vidroVitrine.roughness = ${c.showcaseGlassRoughness}
    vidroVitrine.trans_ior = ${c.showcaseGlassIor}
${options.grouped === false ? '' : `    local raizVitrine = cbRegistrar (Dummy name:(nomeGeracao+"_${prefix}_Grupo") pos:[${x}*METRO,${y}*METRO,.1*METRO])
    setUserProp raizVitrine "code_buddy_id" "showcases:${index}"
    setUserProp raizVitrine "code_buddy_role" "assembly_unit"`}
${parts.map(p => `    local pecaVitrine = cbCaixa "${prefix}_${p.name}" ${p.size.map(n => `(${n})`).join(' ')} (${x + p.center[0]}) (${y + p.center[1]}) (${p.center[2]}) ${p.glass ? "vidroVitrine" : `(cbMaterial "${p.material}")`}
    pecaVitrine.name = nomeGeracao+"_${prefix}_${p.name}"
    setUserProp pecaVitrine "code_buddy_role" "${p.role}"
    setUserProp pecaVitrine "code_buddy_id" "showcases:${index}"
${options.grouped === false ? '' : '    pecaVitrine.parent = raizVitrine'}`).join('\n')}
)
`;
    }).join('\n');
}
