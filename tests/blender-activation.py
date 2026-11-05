"""Confere agrupamento, orientação e referências das zonas no Blender real."""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
folder=Path(sys.argv[sys.argv.index('--')+1])
manifest=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
for item in manifest:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=(folder/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    generation=next(c for c in bpy.data.collections if c.get('code_buddy_generation'))
    roots={o.get('code_buddy_id'):o for o in generation.all_objects if o.get('code_buddy_role')=='assembly_unit'}
    guides=[o for o in generation.all_objects if o.get('code_buddy_role')=='activation_zone']
    assert len(roots)==item['config']['touchCount']
    assert len(guides)==len(item['zones'])
    for unit in item['units']:
        root=roots[unit['id']];t=unit['transform']
        assert (root.matrix_world.translation-Vector((t['x'],t['y'],.1))).length<.00001
        assert root.children and any(o.type=='MESH' for o in root.children)
        direction=root.matrix_world.to_3x3()@Vector((0,-1,0))
        a=math.radians(t['rotation'])
        assert (direction-Vector((math.sin(a),-math.cos(a),0))).length<.00001
    for obj,z in zip(guides,item['zones']):
        # A ordem interna da coleção não é contratual; compara pelo centro e dimensões.
        assert obj.type=='EMPTY' and obj.hide_render
    for z in item['zones']:
        assert any(abs(o.matrix_world.translation.x-z['x'])<.00001 and abs(o.matrix_world.translation.y-z['y'])<.00001 and abs(o.matrix_world.to_scale().x*2-z['width'])<.00001 and abs(o.matrix_world.to_scale().y*2-z['depth'])<.00001 for o in guides)
    for obj in guides:
        if obj.get('code_buddy_id'):
            assert obj.parent==roots[obj['code_buddy_id']]
    previous=[(o,o.matrix_world.copy()) for o in generation.all_objects]
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    for obj,matrix in previous:
        assert max(abs(obj.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<.00001
    print('ACTIVATION_OK',item['id'],len(roots),'estações',len(guides),'referências')
print('ACTIVATION_ALL_OK',len(manifest))
