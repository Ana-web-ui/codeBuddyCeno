import type { AssemblyUnit, ObjectTransform } from './assembly';

/** Captura as peças desta unidade para transformar móveis de vários componentes juntos. */
export function wrapBlenderUnit(unit: AssemblyUnit, t: ObjectTransform, code: string): string {
    const name = 'CB_Unidade_' + unit.id.replace(':', '_');
    return `
# MONTAGEM INDIVIDUAL: ${unit.id}
def cb_montar_unidade():
    from mathutils import Matrix
    anteriores = set(bpy.data.objects)
${code.split('\n').map(line => '    ' + line).join('\n')}
    novos = [obj for obj in bpy.data.objects if obj not in anteriores]
    # Atualiza inclusive a última peça após os exportadores aplicarem suas rotações.
    bpy.context.view_layer.update()
    movimento = Matrix.Translation((${t.x}, ${t.y}, 0)) @ Matrix.Rotation(${t.rotation * Math.PI / 180}, 4, 'Z') @ Matrix.Translation((${-unit.x}, ${-unit.y}, 0))
    raiz = organizar(bpy.data.objects.new('${name}_Grupo', None))
    raiz.matrix_world = Matrix.Translation((${t.x}, ${t.y}, 0.1)) @ Matrix.Rotation(${t.rotation * Math.PI / 180}, 4, 'Z')
    raiz['code_buddy_id'] = '${unit.id}'
    raiz['code_buddy_role'] = 'assembly_unit'
    raiz['code_buddy_label'] = ${JSON.stringify(unit.label)}
    bpy.context.view_layer.update()
    for i, obj in enumerate(novos, 1):
        matriz = movimento @ obj.matrix_world.copy()
        obj.parent = raiz
        obj.matrix_world = matriz
        obj.name = '${name}_' + obj.name
        obj['code_buddy_id'] = '${unit.id}'

cb_montar_unidade()
`;
}

export function wrapMaxUnit(unit: AssemblyUnit, t: ObjectTransform, code: string): string {
    const name = 'CB_Unidade_' + unit.id.replace(':', '_');
    return `
-- MONTAGEM INDIVIDUAL: ${unit.id}
(
    local cbAnteriores = for obj in objects collect obj
${code}
    local cbNovos = for obj in objects where ((findItem cbAnteriores obj) == 0) collect obj
    local cbMovimento = (transMatrix [${-unit.x}*METRO,${-unit.y}*METRO,0]) * (rotateZMatrix ${t.rotation}) * (transMatrix [${t.x}*METRO,${t.y}*METRO,0])
    for i = 1 to cbNovos.count do
    (
        local obj = cbNovos[i]
        obj.transform = obj.transform * cbMovimento
        obj.name = "${name}_" + (i as string)
        setUserProp obj "code_buddy_id" "${unit.id}"
        if (findItem criados obj) == 0 do cbRegistrar obj
    )
${(unit.id.startsWith('demoStations:')||unit.id.startsWith('samplingStations:'))?`    local raizDemo = cbRegistrar (Dummy name:"${name}_Grupo" pos:[(${t.x}*METRO),(${t.y}*METRO),(0.1*METRO)])
    raizDemo.rotation = angleaxis ${t.rotation} [0,0,1]
    setUserProp raizDemo "code_buddy_role" "assembly_unit"
    setUserProp raizDemo "code_buddy_id" "${unit.id}"
    for obj in cbNovos do obj.parent = raizDemo`:''}
)
`;
}
