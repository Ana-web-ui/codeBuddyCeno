"""Confere cada peça real, amostras apoiadas e preservação das gerações no Blender."""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
folder=Path(sys.argv[sys.argv.index('--')+1])
items=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
for item in items:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=(folder/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{});bpy.context.view_layer.update()
    col=next(c for c in bpy.data.collections if c.get('code_buddy_generation'))
    root=next(o for o in col.all_objects if o.get('code_buddy_role')=='assembly_unit')
    assert root['code_buddy_id']=='samplingStations:0'
    c=item['config'];t=item['units'][0]['transform'];a=math.radians(t['rotation'])
    meshes=[o for o in root.children if o.type=='MESH'];assert len(meshes)==len(item['parts'])
    assert (root.matrix_world.translation-Vector((t['x'],t['y'],.1))).length<.00001
    for p in item['parts']:
        obj=next(o for o in meshes if o.name.endswith(p['name']))
        assert obj['code_buddy_role']==p['role']
        points=[obj.matrix_world@v.co for v in obj.data.vertices]
        center=sum(points,Vector())/len(points);x,y,z=p['center']
        expected=Vector((t['x']+x*math.cos(a)-y*math.sin(a),t['y']+x*math.sin(a)+y*math.cos(a),z))
        assert (center-expected).length<.00001,(item['id'],p['name'])
        for axis in range(3):
            actual=max(v[axis] for v in points)-min(v[axis] for v in points)
            size=p['size'];want=abs(math.cos(a))*size[0]+abs(math.sin(a))*size[1] if axis==0 else abs(math.sin(a))*size[0]+abs(math.cos(a))*size[1] if axis==1 else size[2]
            assert abs(actual-want)<.00001
        if p['role']=='sampling_sample':assert abs(min(v.z for v in points)-(.1+c['samplingCounterHeight']))<.00001
    guides=[o for o in col.all_objects if o.get('code_buddy_role')=='activation_zone']
    assert len(guides)==len(item['zones'])
    for zone in item['zones']:
        assert any(abs(o.matrix_world.translation.x-zone['x'])<.00001 and abs(o.matrix_world.translation.y-zone['y'])<.00001 and abs(o.matrix_world.to_scale().x*2-zone['width'])<.00001 and abs(o.matrix_world.to_scale().y*2-zone['depth'])<.00001 for o in guides)
    assert all(o.type=='EMPTY' and o.hide_render for o in guides)
    for o in guides:
        if o.get('code_buddy_id'):assert o.parent==root
    sample=next((o for o in meshes if o['code_buddy_role']=='sampling_sample'),meshes[0])
    old=sample.matrix_world.translation.copy();root.location.x+=.2
    bpy.context.view_layer.update();assert abs(sample.matrix_world.translation.x-old.x-.2)<.00001
    previous=[(o,o.matrix_world.copy()) for o in col.all_objects]
    exec(compile(source,item['id'],'exec'),{});bpy.context.view_layer.update()
    for obj,matrix in previous:
        assert max(abs(obj.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<.00001
    print('SAMPLING_OK',item['id'])
print('SAMPLING_ALL_OK',len(items))
