import type { Config } from './generator';
import { receptionGeometry } from './reception';

const msString = (value: string) => JSON.stringify(value).replace(/\u2028|\u2029/g, ' ');

export function receptionExport(c: Config): string {
    const g = receptionGeometry(c);
    if (!g) return '';
    const d = g.details;
    const zones = c.receptionExportGuides
        ? [...g.zones, ...(g.flow ? [g.flow.queue, ...g.flow.corridors] : [])] : [];
    if (!d.parts.length && !zones.length) return '';
    if (c.target === 'blender') return `
# Recepção: objetos físicos separados das referências de planejamento.
colecao_recepcao = bpy.data.collections.new(colecao.name + '_Recepcao')
colecao.children.link(colecao_recepcao)
raizes_recepcao = {}
def cb_recepcao_objeto(obj):
    for origem in list(obj.users_collection):
        origem.objects.unlink(obj)
    colecao_recepcao.objects.link(obj)
    identificar(obj)
    return obj
def cb_recepcao_parent(obj, raiz):
    bpy.context.view_layer.update()
    matriz = obj.matrix_world.copy()
    obj.parent = raiz
    obj.matrix_world = matriz
${[...new Set(d.parts.map(p => p.group))].map(group => `raiz_recepcao = cb_recepcao_objeto(bpy.data.objects.new(colecao.name + '_Recepcao_${group}', None))
raiz_recepcao.location = (0, 0, .1)
raiz_recepcao['code_buddy_id'] = 'reception:${group}'
raiz_recepcao['code_buddy_role'] = 'reception_unit'
raizes_recepcao['${group}'] = raiz_recepcao`).join('\n')}
${d.parts.map(p => `peca_recepcao = cb_recepcao_objeto(caixa(colecao.name + '_${p.id}', (${p.size.join(', ')}), (${p.center.join(', ')}), acabamento('${p.material}'), ${Math.min(.005, ...p.size.map(v => v / 4))}))
peca_recepcao['code_buddy_role'] = '${p.role}'
peca_recepcao['code_buddy_id'] = 'reception:${p.group}'
cb_recepcao_parent(peca_recepcao, raizes_recepcao['${p.group}'])`).join('\n')}
${d.sign ? `dados_placa = bpy.data.curves.new(colecao.name + '_Texto_Credenciamento', 'FONT')
dados_placa.body = ${JSON.stringify(d.sign.text)}
dados_placa.align_x = 'CENTER'
dados_placa.align_y = 'CENTER'
dados_placa.size = .2
dados_placa.extrude = .001
texto_placa = cb_recepcao_objeto(bpy.data.objects.new(colecao.name + '_Texto_Credenciamento', dados_placa))
texto_placa.location = (${d.sign.x}, ${d.sign.y - .032}, ${d.sign.z})
texto_placa.rotation_euler = (math.pi/2, 0, 0)
dados_placa.materials.append(acabamento('${c.receptionSignTextMat}'))
bpy.context.view_layer.update()
fator_texto = min(1, ${(c.receptionSignWidth - .12)} / max(texto_placa.dimensions.x, .001), .32 / max(texto_placa.dimensions.z, .001))
texto_placa.scale = (fator_texto, fator_texto, fator_texto)
texto_placa['code_buddy_role'] = 'reception_sign_text'
texto_placa['code_buddy_id'] = 'reception:sign'
cb_recepcao_parent(texto_placa, raizes_recepcao['sign'])` : ''}
${zones.length ? `guias_recepcao = bpy.data.collections.new(colecao.name + '_Zonas_Recepcao')
colecao.children.link(guias_recepcao)
for indice, (nome, x, y, largura, profundidade) in enumerate(${JSON.stringify(zones.map(z => [z.name, z.x, z.y, z.width, z.depth]))}):
    guia = bpy.data.objects.new(nome, None)
    guias_recepcao.objects.link(guia)
    identificar(guia)
    guia.empty_display_type = 'CUBE'
    guia.empty_display_size = 1
    guia.location = (x, y, .105)
    guia.scale = (largura/2, profundidade/2, .005)
    guia.hide_render = True
    guia['code_buddy_role'] = 'reception_zone'
    guia['code_buddy_id'] = 'reception:zone:' + str(indice)` : ''}
`;
    return `
-- Recepcao: pecas editaveis e guias nao renderizaveis.
(
${[...new Set(d.parts.map(p => p.group))].map(group => `    local raizRecepcao_${group} = cbRegistrar (Dummy name:(nomeGeracao+"_Recepcao_${group}") pos:[0,0,.1*METRO])
    setUserProp raizRecepcao_${group} "code_buddy_role" "reception_unit"
    setUserProp raizRecepcao_${group} "code_buddy_id" "reception:${group}"`).join('\n')}
${d.parts.map(p => `    local pecaRecepcao = cbCaixa "${p.id}" ${p.size.map(v => `(${v})`).join(' ')} ${p.center.map(v => `(${v})`).join(' ')} (cbMaterial "${p.material}")
    pecaRecepcao.name = nomeGeracao+"_${p.id}"
    setUserProp pecaRecepcao "code_buddy_role" "${p.role}"
    setUserProp pecaRecepcao "code_buddy_id" "reception:${p.group}"
    pecaRecepcao.parent = raizRecepcao_${p.group}`).join('\n')}
${d.sign ? `    -- Text Shape: propriedades documentadas pela Autodesk (GUID-6CB41D09-0586-43DF-821A-93EBEE01DD9D).
    local textoRecepcao = cbRegistrar (text name:(nomeGeracao+"_Texto_Credenciamento") text:${msString(d.sign.text)} size:(.2*METRO) font:"Arial" alignment:2)
    addModifier textoRecepcao (Extrude amount:(.001*METRO))
    local limitesTexto = nodeGetBoundingBox textoRecepcao (matrix3 1)
    local fatorTexto = amin #(1.0, (${c.receptionSignWidth - .12}*METRO)/(amax #(.001*METRO,limitesTexto[2].x-limitesTexto[1].x)), (.32*METRO)/(amax #(.001*METRO,limitesTexto[2].y-limitesTexto[1].y)))
    textoRecepcao.scale = [fatorTexto,fatorTexto,fatorTexto]
    centerPivot textoRecepcao
    textoRecepcao.rotation = eulerAngles 90 0 0
    textoRecepcao.pos = [${d.sign.x}*METRO,${d.sign.y - .032}*METRO,${d.sign.z}*METRO]
    textoRecepcao.material = cbMaterial "${c.receptionSignTextMat}"
    setUserProp textoRecepcao "code_buddy_role" "reception_sign_text"
    setUserProp textoRecepcao "code_buddy_id" "reception:sign"
    textoRecepcao.parent = raizRecepcao_sign` : ''}
${zones.length ? `    local camadaGuiasRecepcao = LayerManager.newLayerFromName (nomeGeracao+"_Zonas_Recepcao")
${zones.map((z, index) => `    local guiaRecepcao = cbRegistrar (Dummy name:${msString(z.name)} boxsize:[${z.width}*METRO,${z.depth}*METRO,.01*METRO] pos:[${z.x}*METRO,${z.y}*METRO,.105*METRO])
    guiaRecepcao.renderable = false
    setUserProp guiaRecepcao "code_buddy_role" "reception_zone"
    setUserProp guiaRecepcao "code_buddy_id" "reception:zone:${index}"
    camadaGuiasRecepcao.addNode guiaRecepcao`).join('\n')}` : ''}
)
`;
}
