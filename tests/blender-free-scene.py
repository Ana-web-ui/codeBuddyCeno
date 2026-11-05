"""Verifica cena livre: partes, XYZ, texto editável, artes e preservação de gerações."""
import json, math, sys
from pathlib import Path
from collections import Counter
import bpy
from mathutils import Matrix, Euler, Vector
folder=Path(sys.argv[sys.argv.index('--')+1])
items=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
for item in items:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_cube_add(location=(30,40,50));original=bpy.context.object;original.name='Cena_Preexistente'
    old_matrix=original.matrix_world.copy()
    source=(folder/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    col=next(c for c in bpy.data.collections if c.get('code_buddy_free_scene'))
    config=item['scene']['objects'][0]
    root=next(o for o in col.objects if o.type=='EMPTY' and o.get('code_buddy_id')=='free:1')
    if config.get('productId') == 'touk-wt55v-slim':
        assert root.get('code_buddy_product_id') == config['productId']
        assert root.get('code_buddy_supplier') == 'Touk'
        assert root.get('code_buddy_model') == 'WT55V Vertical Slim'
    if config.get('mount'):
        assert root.get('code_buddy_mount') == config['mount']
        assert root.get('code_buddy_screen_orientation') == config['screenOrientation']
    expected=Matrix.Translation(Vector(config['position'])) @ Euler(tuple(math.radians(v) for v in config['rotation']),'XYZ').to_matrix().to_4x4()
    assert max(abs(root.matrix_world[i][j]-expected[i][j]) for i in range(4) for j in range(4))<1e-5, item['id']
    children=[o for o in col.objects if o.parent==root]
    assert len(children)==len(item['parts']),item['id']
    remaining=list(children)
    for part in item['parts']:
        local=Vector(part['center'])
        if part.get('vertices'): local+=Vector(tuple((min(v[i] for v in part['vertices'])+max(v[i] for v in part['vertices']))/2 for i in range(3)))
        target=expected @ local
        matches=[o for o in remaining if o.get('code_buddy_role')==part['name']]
        assert matches,(item['id'],part['name'])
        def center(o):return sum((o.matrix_world @ Vector(corner) for corner in o.bound_box),Vector())/8
        obj=min(matches,key=lambda o:(center(o)-target).length);remaining.remove(obj)
        # A origem do texto é corrigida pelo seu bounding box e mantém o FONT editável.
        assert (center(obj)-target).length<.003,(item['id'],part['name'],center(obj),target)
        assert obj.get('code_buddy_id')=='free:1'
        assert obj.hide_select==config['locked'];assert obj.hide_render==(not config['visible'])
        if part['shape']=='text':assert obj.type=='FONT' and obj.data.body==config['text']
        if part['shape']=='image':
            assert obj.data.uv_layers.active
            tex=next(n for n in obj.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
            assert tex.image.packed_file
            shader=next(n for n in obj.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
            assert shader.inputs['Base Color'].is_linked and shader.inputs['Alpha'].is_linked
        if part['shape'] in ('box','cylinder'):
            coords=[Vector(v) for v in obj.bound_box]
            size=[max(v[i] for v in coords)-min(v[i] for v in coords) for i in range(3)]
            assert max(abs(size[i]-part['size'][i]) for i in range(3))<1e-4,(item['id'],part['name'],size,part['size'])
    assert original.name in bpy.data.objects and max(abs(original.matrix_world[i][j]-old_matrix[i][j]) for i in range(4) for j in range(4))<1e-6
    assert bpy.context.scene.camera in col.objects.values()
    previous=[(o,o.matrix_world.copy()) for o in col.objects]
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    for obj,matrix in previous:
        assert max(abs(obj.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<1e-5
    print('FREE_SCENE_OK',item['id'])
print('FREE_SCENE_ALL_OK',len(items))
