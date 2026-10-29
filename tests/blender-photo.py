"""Confere backdrop, câmera independente, zonas e agrupamento no Blender real."""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
folder=Path(sys.argv[sys.argv.index('--')+1])
items=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
for item in items:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=(folder/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    col=next(c for c in bpy.data.collections if c.get('code_buddy_generation'))
    root=next(o for o in col.all_objects if o.get('code_buddy_role')=='assembly_unit')
    camera=next(o for o in col.all_objects if o.get('code_buddy_role')=='photo_camera')
    config=item['config'];p=item['photo'];t=item['units'][0]['transform']
    assert root['code_buddy_id']=='backdrops:0' and camera.parent==root
    assert camera.type=='CAMERA' and bpy.context.scene.camera!=camera
    expected=Vector((p['camera']['x'],p['camera']['y'],.1+config['activationPhotoCameraHeight']))
    assert (camera.matrix_world.translation-expected).length<.00001
    direction=(Vector((p['person']['x'],p['person']['y'],expected.z))-expected).normalized()
    assert (camera.matrix_world.to_quaternion()@Vector((0,0,-1))).dot(direction)>.99999
    meshes=[o for o in root.children if o.type=='MESH'];assert len(meshes)==3
    assert (root.matrix_world.translation-Vector((t['x'],t['y'],.1))).length<.00001
    points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
    assert abs(min(v.z for v in points)-.1)<.00001
    assert abs(max(v.z for v in points)-.1-config['backdropHeight'])<.00001
    guides=[o for o in col.all_objects if o.get('code_buddy_role')=='activation_zone']
    assert len(guides)==len(item['zones'])
    for z in item['zones']:
        assert any(abs(o.matrix_world.translation.x-z['x'])<.00001 and abs(o.matrix_world.translation.y-z['y'])<.00001 and abs(o.matrix_world.to_scale().x*2-z['width'])<.00001 and abs(o.matrix_world.to_scale().y*2-z['depth'])<.00001 for o in guides)
    assert all(o.type=='EMPTY' and o.hide_render for o in guides)
    old_camera=camera.matrix_world.translation.copy();root.location.x+=.25
    bpy.context.view_layer.update();assert abs(camera.matrix_world.translation.x-old_camera.x-.25)<.00001
    previous=[(o,o.matrix_world.copy()) for o in col.all_objects]
    exec(compile(source,item['id'],'exec'),{});bpy.context.view_layer.update()
    for obj,matrix in previous:
        assert max(abs(obj.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<.00001
    print('PHOTO_OK',item['id'])
print('PHOTO_ALL_OK',len(items))
