import type { Config } from './generator';
import { activationGeometry } from './activation-geometry';

/** Referências de planejamento separadas dos objetos físicos e excluídas do render. */
export function activationGuides(c: Config): string {
    if(c.projectType!=='activation'||!c.activationExportGuides) return '';
    const g=activationGeometry(c)!;
    const zones=[...(g.waiting?[g.waiting]:[]),...g.participation,...(g.photo?[g.photo.capture,g.photo.camera]:[]),...(g.demo?[g.demo.presenter,g.demo.reserved]:[]),...(g.sampling?[g.sampling.team,g.sampling.reserved]:[]),...g.circulation];
    const owner=(z:typeof zones[number])=>g.participation.includes(z)?g.stations[g.participation.indexOf(z)].id:g.sampling&&(z===g.sampling.team||z===g.sampling.reserved)?g.sampling.stationId:g.demo&&(z===g.demo.presenter||z===g.demo.reserved)?g.demo.stationId:g.photo&&(z===g.photo.capture||z===g.photo.camera)?g.photo.stationId:'';
    if(c.target==='blender') return `
# Zonas conceituais: referências sem geometria renderizável.
guias_ativacao = bpy.data.collections.new('CB_Zonas_Ativacao')
colecao.children.link(guias_ativacao)
for nome, x, y, largura, profundidade, unidade_id in ${JSON.stringify(zones.map(z=>[z.name,z.x,z.y,z.width,z.depth,owner(z)]))}:
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
    setUserProp guiaZona "code_buddy_role" "activation_zone"${owner(z)&&(g.photo||g.demo||g.sampling)?`
    setUserProp guiaZona "code_buddy_id" "${owner(z)}"
    local raizesFoto = for obj in objects where (getUserProp obj "CodeBuddy") == nomeGeracao and (getUserProp obj "code_buddy_role") == "assembly_unit" and (getUserProp obj "code_buddy_id") == "${owner(z)}" collect obj
    if raizesFoto.count > 0 do guiaZona.parent = raizesFoto[1]`:''}`).join('\n')}
)
`;
}

/** Câmera de estudo da foto. A câmera geral do render permanece selecionada. */
export function activationPhotoCamera(c:Config):string {
    if(c.projectType!=='activation'||c.activationModel!=='photo') return '';
    const p=activationGeometry(c)!.photo!;
    const position=[p.camera.x,p.camera.y,.1+c.activationPhotoCameraHeight];
    const target=[p.person.x,p.person.y,.1+c.activationPhotoCameraHeight];
    if(c.target==='blender') return `
# Camera de referencia da captura, vinculada ao backdrop.
dados_foto = bpy.data.cameras.new('CB_Camera_Foto')
dados_foto.lens = 35
identificar(dados_foto)
camera_foto = organizar(bpy.data.objects.new('CB_Camera_Foto', dados_foto))
camera_foto.location = ${JSON.stringify(position)}
apontar(camera_foto, ${JSON.stringify(target)})
camera_foto['code_buddy_role'] = 'photo_camera'
camera_foto['code_buddy_id'] = '${p.stationId}'
bpy.context.view_layer.update()
raiz_foto = next(o for o in colecao.all_objects if o.get('code_buddy_role') == 'assembly_unit' and o.get('code_buddy_id') == '${p.stationId}')
matriz_foto = camera_foto.matrix_world.copy()
camera_foto.parent = raiz_foto
camera_foto.matrix_world = matriz_foto
`;
    const point=(values:number[])=>'['+values.map(v=>`(${v}*METRO)`).join(',')+']';
    const station=activationGeometry(c)!.stations[0];
    return `
-- Camera de estudo: nao substitui CB_Camera_Frontal.
(
    local raizFoto = cbRegistrar (Dummy name:(nomeGeracao + "_Espaco_Fotos") pos:${point([station.x,station.y,.1])})
    raizFoto.rotation = angleaxis ${station.rotation} [0,0,1]
    setUserProp raizFoto "code_buddy_role" "assembly_unit"
    setUserProp raizFoto "code_buddy_id" "${p.stationId}"
    local pecasFoto = for obj in objects where obj != raizFoto and (getUserProp obj "CodeBuddy") == nomeGeracao and (getUserProp obj "code_buddy_id") == "${p.stationId}" collect obj
    for obj in pecasFoto do obj.parent = raizFoto
    local alvoFoto = cbRegistrar (TargetObject name:(nomeGeracao + "_Alvo_Foto") pos:${point(target)})
    local cameraFoto = cbRegistrar (TargetCamera name:(nomeGeracao + "_Camera_Foto") pos:${point(position)} target:alvoFoto)
    alvoFoto.parent = raizFoto
    cameraFoto.parent = raizFoto
    setUserProp cameraFoto "code_buddy_role" "photo_camera"
    setUserProp cameraFoto "code_buddy_id" "${p.stationId}"
)
`;
}
