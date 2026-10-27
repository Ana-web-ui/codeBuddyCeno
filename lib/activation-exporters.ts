import type { Config } from './generator';
import { activationGeometry } from './activation-geometry';

/** Referências de planejamento separadas dos objetos físicos e excluídas do render. */
export function activationGuides(c: Config): string {
    if(c.projectType!=='activation'||!c.activationExportGuides) return '';
    const g=activationGeometry(c)!;
    const zones=[...(g.waiting?[g.waiting]:[]),...g.participation,...g.circulation];
    if(c.target==='blender') return `
# Zonas conceituais: referências sem geometria renderizável.
guias_ativacao = bpy.data.collections.new('CB_Zonas_Ativacao')
colecao.children.link(guias_ativacao)
for nome, x, y, largura, profundidade, unidade_id in ${JSON.stringify(zones.map(z=>[z.name,z.x,z.y,z.width,z.depth,g.participation.includes(z)?`touchScreens:${g.participation.indexOf(z)}`:'']))}:
    guia = bpy.data.objects.new(nome, None)
    guias_ativacao.objects.link(guia)
    guia.empty_display_type = 'CUBE'
    guia.empty_display_size = 1
    guia.location = (x, y, 0.105)
    guia.scale = (largura/2, profundidade/2, 0.005)
    guia.hide_render = True
    identificar(guia)
    guia['code_buddy_role'] = 'activation_zone'
    if unidade_id:
        raiz = next(o for o in colecao.all_objects if o.get('code_buddy_role') == 'assembly_unit' and o.get('code_buddy_id') == unidade_id)
        bpy.context.view_layer.update()
        matriz = guia.matrix_world.copy()
        guia.parent = raiz
        guia.matrix_world = matriz
        guia['code_buddy_id'] = unidade_id
`;
    return `
-- Zonas conceituais: referencias nao renderizaveis.
(
    local camadaZonas = LayerManager.newLayerFromName (nomeGeracao + "_Zonas_Ativacao")
    local guiaZona
${zones.map(z=>`    guiaZona = cbRegistrar (Dummy name:"${z.name}" boxsize:[(${z.width}*METRO),(${z.depth}*METRO),(0.01*METRO)] pos:[(${z.x}*METRO),(${z.y}*METRO),(0.105*METRO)])
    camadaZonas.addNode guiaZona
    guiaZona.renderable = false
    setUserProp guiaZona "code_buddy_role" "activation_zone"`).join('\n')}
)
`;
}
