"""Blender --background --factory-startup --python-exit-code 1 --python tests/blender-storage.py -- FIXTURES"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector, Matrix
fixtures=Path(sys.argv[sys.argv.index('--')+1])
manifest=json.loads((fixtures/'manifest.json').read_text(encoding='utf8'))
def close(a,b):
    assert max(abs(a[i][j]-b[i][j]) for i in range(4) for j in range(4))<0.0001
for item in manifest:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=(fixtures/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    col=next(c for c in bpy.data.collections if c.get('code_buddy_generation'))
    parts={o.name:o for o in col.all_objects if o.get('code_buddy_role') in ['storage_wall','storage_frame','storage_door']}
    assert len(parts)==10,(item['id'],len(parts))
    rotation=Matrix.Rotation(math.radians(item['config']['frontRotation']),4,'Z')
    for part in item['data']['parts']:
        obj=parts[part['name']]
        center=sum((obj.matrix_world@v.co for v in obj.data.vertices),Vector())/len(obj.data.vertices)
        assert (center-rotation@Vector(part['center'])).length<0.0001,(item['id'],obj.name,center)
        assert obj.parent.get('code_buddy_role')=='storage_root'
        assert obj.get('code_buddy_generation')==col.get('code_buddy_generation')
        # Medidas reais do mesh antes do giro global, inclusive após mover a origem da porta.
        for i in range(3):
            extent=max(v.co[i] for v in obj.data.vertices)-min(v.co[i] for v in obj.data.vertices)
            assert abs(extent-part['size'][i])<0.0001,(item['id'],obj.name,i)
    door=parts['Deposito_Porta']
    assert (door.matrix_world.translation-rotation@Vector(item['data']['pivot'])).length<0.0001
    door.rotation_euler.z=math.radians(item['data']['openAngle'])
    bpy.context.view_layer.update()
    # O giro de abertura deve conservar o pivô da dobradiça.
    assert (door.matrix_world.translation-rotation@Vector(item['data']['pivot'])).length<0.0001
    pivot=Vector(item['data']['pivot'])
    leaf=next(p for p in item['data']['parts'] if p['role']=='storage_door')
    turn=Matrix.Rotation(math.radians(item['data']['openAngle']),4,'Z')
    expected=rotation@(pivot+turn.to_3x3()@(Vector(leaf['center'])-pivot))
    actual=sum((door.matrix_world@v.co for v in door.data.vertices),Vector())/len(door.data.vertices)
    assert (actual-expected).length<0.0001,(item['id'],'sentido de abertura')
    door.parent.location.x+=0.17
    door.data.materials[0].diffuse_color=(0.2,0.4,0.6,1)
    bpy.context.view_layer.update()
    previous=[(o,o.matrix_world.copy()) for o in col.all_objects]
    material=door.data.materials[0]
    original_color=tuple(material.diffuse_color)
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    for obj,matrix in previous: close(obj.matrix_world,matrix)
    assert tuple(material.diffuse_color)==original_color
    new_col=next(c for c in bpy.data.collections if c.get('code_buddy_generation') and c!=col)
    new_door=next(o for o in new_col.all_objects if o.get('code_buddy_role')=='storage_door')
    assert new_door.data.materials[0]!=material
    assert len([c for c in bpy.data.collections if c.get('code_buddy_generation')])==2
    print('PASS',item['id'])
print('PASS',len(manifest),'cenários Blender: peças, medidas, pivô, abertura e preservação de versões.')
