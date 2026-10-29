import type { Config } from './generator';
import type { ArtworkSlot } from './branding-geometry';
import { artworkGeometry } from './branding-geometry';
import { counterParts } from './counter';

const activeSlots = (c: Config): ArtworkSlot[] => [
    ...(c.backdrops && c.panelArtEnabled ? ['panelArt' as const] : []),
    ...(c.counter && c.counterArtEnabled ? ['counterArt' as const] : []),
];

export function blenderBrandingSupport(c: Config): string {
    const slots = activeSlots(c);
    if (!slots.length) return '';
    return `
# LOGOS E ARTES: imagens independentes por geração, incorporadas ao .blend.
imagens_arte = ${JSON.stringify(Object.fromEntries(slots.map(slot => [slot, c[`${slot}Image`]])))}
materiais_arte = {}
def cb_material_arte(slot):
    if slot in materiais_arte:
        return materiais_arte[slot]
    mime, dados = imagens_arte[slot].split(',', 1)
    caminho = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.png' if 'image/png' in mime else '.jpg', delete=False) as arquivo:
            caminho = arquivo.name
            arquivo.write(base64.b64decode(dados))
        imagem = bpy.data.images.load(caminho, check_existing=False)
        imagem.name = colecao.name + '_Arte_' + slot
        identificar(imagem)
        imagem.colorspace_settings.name = 'sRGB'
        imagem.pack()
    finally:
        if caminho and os.path.exists(caminho):
            os.remove(caminho)
    mat = identificar(bpy.data.materials.new(colecao.name + '_Arte_' + slot))
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'DITHERED'
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value = .55
    textura = mat.node_tree.nodes.new('ShaderNodeTexImage')
    textura.image = imagem
    textura.extension = 'CLIP'
    mat.node_tree.links.new(textura.outputs['Color'], shader.inputs['Base Color'])
    mat.node_tree.links.new(textura.outputs['Alpha'], shader.inputs['Alpha'])
    materiais_arte[slot] = mat
    return mat

def cb_aplicar_arte(pai, slot, vertices, uv):
    dados = identificar(bpy.data.meshes.new(pai.name + '_Arte'))
    dados.from_pydata(vertices, [], [(0, 1, 2), (0, 2, 3)])
    dados.update()
    camada = dados.uv_layers.new(name='Arte_UV')
    for poligono in dados.polygons:
        for indice in poligono.loop_indices:
            camada.data[indice].uv = uv[dados.loops[indice].vertex_index]
    obj = organizar(bpy.data.objects.new(pai.name + '_Arte', dados))
    obj.parent = pai
    obj.data.materials.append(cb_material_arte(slot))
    obj['code_buddy_role'] = 'branding_artwork'
    obj['code_buddy_id'] = pai.get('code_buddy_id', '')
    obj['code_buddy_art_slot'] = slot
    if hasattr(obj, 'visible_shadow'):
        obj.visible_shadow = False
    return obj
`;
}

export function blenderArtwork(c: Config, slot: ArtworkSlot, parent: string): string {
    if (!c[`${slot}Enabled`]) return '';
    const { vertices, uv } = artworkGeometry(c, slot);
    return `cb_aplicar_arte(${parent}, '${slot}', ${JSON.stringify(vertices)}, ${JSON.stringify(uv)})`;
}

export function maxBrandingSupport(c: Config): string {
    const slots = activeSlots(c);
    if (!slots.length) return '';
    return `
-- Imagens extraídas em pasta durável para reabrir a cena do Max.
local cbMateriaisArte = #(undefined, undefined)
fn cbMaterialArte slot =
(
    local indice = if slot == "panelArt" then 1 else 2
    if cbMateriaisArte[indice] != undefined then return cbMateriaisArte[indice]
    local dados = case slot of
    (
${slots.map(slot => `        "${slot}": "${c[`${slot}Image`].split(',')[1]}"`).join('\n')}
    )
    local sufixo = case slot of
    (
${slots.map(slot => `        "${slot}": "${c[`${slot}Image`].startsWith('data:image/png') ? '.png' : '.jpg'}"`).join('\n')}
    )
    local pasta = (getDir #userScripts)+"/CodeBuddy_Artes/"
    makeDir pasta
    local guid = ((dotNetClass "System.Guid").NewGuid()).ToString()
    local caminho = pasta+guid+sufixo
    (dotNetClass "System.IO.File").WriteAllBytes caminho ((dotNetClass "System.Convert").FromBase64String dados)
    local mapa = Bitmaptexture filename:caminho
    mapa.alphaSource = 0
    mapa.monoOutput = 1
    mapa.RGBOutput = 0
    mapa.preMultAlpha = false
    local mat = Physical_Material name:(nomeGeracao+"_Arte_"+slot)
    mat.base_color = color 255 255 255
    mat.roughness = .55
    mat.base_color_map = mapa
    if sufixo == ".png" do
    (
        mat.cutout_map = mapa
        mat.cutout_map_on = true
    )
    cbMateriaisArte[indice] = mat
    mat
)
fn cbAplicarArte pai slot verticesArte uvArte =
(
    local obj = mesh name:(pai.name+"_Arte") vertices:verticesArte faces:#([1,2,3],[1,3,4])
    setNumTVerts obj 4
    buildTVFaces obj
    for i = 1 to 4 do setTVert obj i uvArte[i]
    setTVFace obj 1 [1,2,3]
    setTVFace obj 2 [1,3,4]
    update obj
    obj.material = cbMaterialArte slot
    obj.transform = pai.transform
    obj.parent = pai
    obj.castShadows = false
    cbRegistrar obj
    setUserProp obj "code_buddy_role" "branding_artwork"
    setUserProp obj "code_buddy_id" (getUserProp pai "code_buddy_id")
    setUserProp obj "code_buddy_art_slot" slot
    showTextureMap obj.material on
    obj
)
`;
}

export function maxArtwork(c: Config, slot: ArtworkSlot, parent: string): string {
    if (!c[`${slot}Enabled`]) return '';
    const { vertices, uv } = artworkGeometry(c, slot);
    // Os boxes nativos do Max têm origem na base; os cubes aplicados do Blender, no centro.
    const height = slot === 'counterArt' ? counterParts(c)[0].size[2] : c.backdropHeight - (c.backdropDetailed ? .04 : 0);
    return `cbAplicarArte ${parent} "${slot}" #(${vertices.map(([x, y, z]) => `[(${x})*METRO,(${y})*METRO,(${z + height / 2})*METRO]`).join(',')}) #(${uv.map(([u, v]) => `[${u},${v},0]`).join(',')})`;
}
