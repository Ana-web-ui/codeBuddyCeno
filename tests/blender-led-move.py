"""Testa movimento conjunto de tela, moldura e suportes, com frente girada."""
import json, math, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
folder=Path(sys.argv[sys.argv.index('--')+1])
items=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
for item in items:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=(folder/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    c=item['config']; t=c['objectTransforms']['led:0']
    col=next(col for col in bpy.data.collections if col.get('code_buddy_generation'))
    roots=[o for o in col.all_objects if o.get('code_buddy_id')=='led:0' and o.type=='EMPTY']
    assert len(roots)==1
    root=roots[0]
    objs=[o for o in col.all_objects if o.get('code_buddy_id')=='led:0' and o.type=='MESH']
    assert len(objs)==6, (item['id'],len(objs))
    front=Matrix.Rotation(math.radians(c['frontRotation']),4,'Z')
    transform=front @ Matrix.Translation((t['x'],t['y'],0)) @ Matrix.Rotation(math.radians(t['rotation']),4,'Z')
    def center(o):
        return sum((o.matrix_world @ Vector(v) for v in o.bound_box), Vector())/8
    frame=next(o for o in objs if 'LED_Moldura' in o.name)
    assert (center(frame)-transform @ Vector((0,0,.1+c['ledBottom']+c['ledHeight']/2))).length<1e-5
    bases=[o for o in objs if 'LED_Base' in o.name]
    assert len(bases)==2
    expected=[transform @ Vector((sign*c['ledWidth']*.4,0,.13)) for sign in [-1,1]]
    assert all(any((center(o)-point).length<1e-5 for point in expected) for o in bases)
    screen=next(o for o in objs if 'LED_Tela' in o.name)
    assert (center(screen)-transform @ Vector((0,-.075,.1+c['ledBottom']+c['ledHeight']/2))).length<1e-5
    assert all(o.parent==root for o in objs)
    assert screen.data.uv_layers.active
    if c['screenImage']:
        textures=[n for m in screen.data.materials for n in m.node_tree.nodes if n.type=='TEX_IMAGE']
        assert len(textures)==1 and textures[0].image.packed_file
    previous=[(o,o.matrix_world.copy()) for o in col.all_objects]
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    for o,m in previous:
        assert max(abs(o.matrix_world[i][j]-m[i][j]) for i in range(4) for j in range(4))<1e-5
    print('LED_MOVE_OK',item['id'])
print('LED_MOVE_ALL_OK',len(items))
