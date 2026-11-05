import type { ImportedModelsConfig } from './imported-models';
import { modelGeometry } from './imported-models';

const safeName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_]/g, '_').slice(0, 70) || 'Malha';
const msString = (value: string) => '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]/g, ' ') + '"';

export function blenderImportedModels(c: ImportedModelsConfig): string {
    return c.importedModels.map(model => {
        const geometry = modelGeometry(model);
        return `
# OBJ PERSONALIZADO: importedModels:${model.id}
from mathutils import Matrix
raiz_importada = organizar(bpy.data.objects.new(colecao.name + '_OBJ_${model.id}_Grupo', None))
raiz_importada.matrix_world = Matrix.Translation((${model.x}, ${model.y}, ${.1 + model.z})) @ Matrix.Rotation(${model.rotation * Math.PI / 180}, 4, 'Z')
raiz_importada.empty_display_type = 'PLAIN_AXES'
raiz_importada.empty_display_size = .2
raiz_importada['code_buddy_id'] = 'importedModels:${model.id}'
raiz_importada['code_buddy_role'] = 'imported_model'
raiz_importada['code_buddy_label'] = ${JSON.stringify(model.name)}
bpy.context.view_layer.update()
${geometry.meshes.map((mesh, i) => `dados_importados = identificar(bpy.data.meshes.new(colecao.name + '_OBJ_${model.id}_${i + 1}_${safeName(mesh.name)}'))
dados_importados.from_pydata(${JSON.stringify(mesh.vertices)}, [], ${JSON.stringify(mesh.faces)})
dados_importados.update()
peca_importada = organizar(bpy.data.objects.new(dados_importados.name, dados_importados))
peca_importada.data.materials.append(acabamento('${model.material}'))
peca_importada.parent = raiz_importada
peca_importada['code_buddy_role'] = 'imported_mesh'
peca_importada['code_buddy_id'] = 'importedModels:${model.id}'
peca_importada['code_buddy_label'] = ${JSON.stringify(mesh.name)}`).join('\n')}
`;
    }).join('\n');
}

export function maxImportedModels(c: ImportedModelsConfig): string {
    return c.importedModels.map(model => {
        const geometry = modelGeometry(model);
        return `
-- OBJ PERSONALIZADO: importedModels:${model.id}
(
    local raizImportada = cbRegistrar (Dummy name:(nomeGeracao+"_OBJ_${model.id}_Grupo"))
    raizImportada.transform = rotateZMatrix (${model.rotation})
    raizImportada.pos = [${model.x}*METRO,${model.y}*METRO,${.1 + model.z}*METRO]
    setUserProp raizImportada "code_buddy_id" "importedModels:${model.id}"
    setUserProp raizImportada "code_buddy_role" "imported_model"
    setUserProp raizImportada "code_buddy_label" ${msString(model.name)}
${geometry.meshes.map((mesh, i) => `    local pecaImportada = mesh vertices:#(${mesh.vertices.map(v => `[${v.map(n => `(${n})*METRO`).join(',')}]`).join(',')}) faces:#(${mesh.faces.map(f => `[${f.map(n => n + 1).join(',')}]`).join(',')})
    pecaImportada.name = nomeGeracao+"_OBJ_${model.id}_${i + 1}_${safeName(mesh.name)}"
    pecaImportada.material = cbMaterial "${model.material}"
    pecaImportada.transform = raizImportada.transform
    pecaImportada.parent = raizImportada
    cbRegistrar pecaImportada
    setUserProp pecaImportada "code_buddy_role" "imported_mesh"
    setUserProp pecaImportada "code_buddy_id" "importedModels:${model.id}"
    update pecaImportada`).join('\n')}
)
`;
    }).join('\n');
}
