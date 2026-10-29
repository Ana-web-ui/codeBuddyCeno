import type { Config } from './generator';
import { blenderArtwork, maxArtwork } from './branding-exporters';
import { panelParts } from './panel';

type Layout = { positions: [number, number][] };
type Options = { grouped?: boolean };

export function blenderPanels(c: Config, layout: Layout, options: Options = {}): string {
    if (!c.backdrops || (!c.backdropDetailed && !c.panelArtEnabled) || !layout.positions.length) return '';
    const parts = panelParts(c);
    return layout.positions.map(([x, y], index) => {
        const prefix = `Painel_${String(index + 1).padStart(3, '0')}`;
        return `
# PAINEL DETALHADO: backdrops:${index}
${options.grouped === false ? '' : `raiz_painel = organizar(bpy.data.objects.new(colecao.name + '_${prefix}_Grupo', None))
raiz_painel.location = (${x}, ${y}, .1)
raiz_painel.empty_display_type = 'PLAIN_AXES'
raiz_painel.empty_display_size = .2
raiz_painel['code_buddy_id'] = 'backdrops:${index}'
raiz_painel['code_buddy_role'] = 'assembly_unit'
raiz_painel['code_buddy_label'] = 'Painel ${index + 1}'
bpy.context.view_layer.update()`}
${parts.map(p => `peca_painel = caixa(colecao.name + '_${prefix}_${p.name}', (${p.size.join(', ')}), (${x + p.center[0]}, ${y + p.center[1]}, ${p.center[2]}), acabamento('${p.material}'), ${Math.min(.003, ...p.size.map(n => n / 4))})
peca_painel['code_buddy_role'] = '${p.role}'
peca_painel['code_buddy_id'] = 'backdrops:${index}'
${options.grouped === false ? '' : `bpy.context.view_layer.update()
matriz_painel = peca_painel.matrix_world.copy()
peca_painel.parent = raiz_painel
peca_painel.matrix_world = matriz_painel`}
${p.role === 'panel_front' || p.role === 'panel_body' ? blenderArtwork(c, 'panelArt', 'peca_painel') : ''}`).join('\n')}
`;
    }).join('\n');
}

export function maxPanels(c: Config, layout: Layout, options: Options = {}): string {
    if (!c.backdrops || (!c.backdropDetailed && !c.panelArtEnabled) || !layout.positions.length) return '';
    const parts = panelParts(c);
    return layout.positions.map(([x, y], index) => {
        const prefix = `Painel_${String(index + 1).padStart(3, '0')}`;
        return `
-- PAINEL DETALHADO: backdrops:${index}
(
${options.grouped === false ? '' : `    local raizPainel = cbRegistrar (Dummy name:(nomeGeracao+"_${prefix}_Grupo") pos:[${x}*METRO,${y}*METRO,.1*METRO])
    setUserProp raizPainel "code_buddy_id" "backdrops:${index}"
    setUserProp raizPainel "code_buddy_role" "assembly_unit"`}
${parts.map(p => `    local pecaPainel = cbCaixa "${prefix}_${p.name}" ${p.size.map(n => `(${n})`).join(' ')} (${x + p.center[0]}) (${y + p.center[1]}) (${p.center[2]}) (cbMaterial "${p.material}")
    pecaPainel.name = nomeGeracao+"_${prefix}_${p.name}"
    setUserProp pecaPainel "code_buddy_role" "${p.role}"
    setUserProp pecaPainel "code_buddy_id" "backdrops:${index}"
${options.grouped === false ? '' : '    pecaPainel.parent = raizPainel'}
${p.role === 'panel_front' || p.role === 'panel_body' ? maxArtwork(c, 'panelArt', 'pecaPainel') : ''}`).join('\n')}
)
`;
    }).join('\n');
}
