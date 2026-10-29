import type { PresentationInput } from './presentation';
import { floorMesh, presentationViews } from './presentation';

export function blenderFloor(c: PresentationInput): string {
    if (c.floorShape === 'rectangle') return "caixa('Piso', (LARGURA, PROFUNDIDADE, 0.1), (0, 0, 0.05), acabamento(MATERIAL_PISO), 0.02)";
    const mesh = floorMesh(c);
    return `dados_piso = identificar(bpy.data.meshes.new(colecao.name + '_Piso'))
dados_piso.from_pydata(${JSON.stringify(mesh.vertices)}, [], ${JSON.stringify(mesh.faces)})
dados_piso.update()
piso = organizar(bpy.data.objects.new(colecao.name + '_Piso', dados_piso))
piso.data.materials.append(acabamento(MATERIAL_PISO))
piso['code_buddy_role'] = 'floor'
piso['code_buddy_id'] = 'floor:0'`;
}

export function maxFloor(c: PresentationInput): string {
    if (c.floorShape === 'rectangle') return 'cbCaixa "Piso" LARGURA PROFUNDIDADE .1 0 0 .05 piso';
    const mesh = floorMesh(c);
    return `local pisoForma = mesh vertices:#(${mesh.vertices.map(v => `[${v.map(n => `(${n})*METRO`).join(',')}]`).join(',')}) faces:#(${mesh.faces.map(f => `[${f.map(n => n + 1).join(',')}]`).join(',')})
pisoForma.name = nomeGeracao+"_Piso"
pisoForma.material = piso
cbRegistrar pisoForma
setUserProp pisoForma "code_buddy_role" "floor"
setUserProp pisoForma "code_buddy_id" "floor:0"
update pisoForma`;
}

export function blenderPresentationCameras(c: PresentationInput): string {
    if (!c.presentationCameras) return '';
    const views = presentationViews(c);
    return `
# CAMERAS DE APRESENTACAO: da geração atual, antes da orientação global.
from mathutils import Matrix
${views.map(view => `camera_apresentacao = ${view.id === 'front' ? 'bpy.context.scene.camera' : `organizar(bpy.data.objects.new(colecao.name + '_Camera_${view.name}', identificar(bpy.data.cameras.new(colecao.name + '_Camera_${view.name}'))))`}
camera_apresentacao.name = colecao.name + '_Camera_${view.name}'
camera_apresentacao['code_buddy_role'] = 'presentation_camera'
camera_apresentacao['code_buddy_id'] = 'presentation:${view.id}'
camera_apresentacao.data.type = 'ORTHO'
camera_apresentacao.data.sensor_fit = 'HORIZONTAL'
camera_apresentacao.data.ortho_scale = ${view.width}
camera_apresentacao.data.clip_end = ${view.distance * 10}
camera_apresentacao.matrix_world = Matrix((${[0, 1, 2].map(k => `(${view.right[k]}, ${view.up[k]}, ${view.back[k]}, ${view.position[k]})`).join(', ')}, (0, 0, 0, 1)))
${view.id === c.presentationCamera ? 'camera_escolhida = camera_apresentacao' : ''}`).join('\n')}
bpy.context.scene.camera = camera_escolhida
bpy.context.scene.render.resolution_x = ${views[0].resolution[0]}
bpy.context.scene.render.resolution_y = ${views[0].resolution[1]}
`;
}

export function maxPresentationCameras(c: PresentationInput): string {
    const views = presentationViews(c);
    return `
local cbCameraEscolhida = undefined
${views.map(view => `local cameraApresentacao = cbRegistrar (FreeCamera name:(nomeGeracao+"_Camera_${view.name}"))
cameraApresentacao.transform = matrix3 [${view.right.join(',')}] [${view.up.join(',')}] [${view.back.join(',')}] [${view.position.map(n => `(${n})*METRO`).join(',')}]
cameraApresentacao.orthoProjection = true
cameraApresentacao.targetDistance = (${view.distance})*METRO
cameraApresentacao.fov = 2*atan(${view.width}/(2*${view.distance}))
setUserProp cameraApresentacao "code_buddy_role" "presentation_camera"
setUserProp cameraApresentacao "code_buddy_id" "presentation:${view.id}"
${view.id === c.presentationCamera ? 'cbCameraEscolhida = cameraApresentacao' : ''}`).join('\n')}
renderWidth = ${views[0].resolution[0]}
renderHeight = ${views[0].resolution[1]}
viewport.setCamera cbCameraEscolhida
`;
}
