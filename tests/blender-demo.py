"""Verifica as peças reais, apoio do produto e transformação conjunta no Blender."""
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
    c=item['config'];d=item['demo'];t=item['units'][0]['transform']
    assert root['code_buddy_id']=='demoStations:0'
    assert (root.matrix_world.translation-Vector((t['x'],t['y'],.1))).length<.00001
    physical={o.get('code_buddy_role'):o for o in root.children if o.type=='MESH'}
    assert set(physical)=={'demo_bench_body','demo_bench_top','demo_product'}
    product=physical['demo_product'];top=physical['demo_bench_top']
    points=[product.matrix_world@v.co for v in product.data.vertices]
    assert abs(min(p.z for p in points)-(.1+c['demoBenchHeight']))<.00001
    assert abs(max(p.z for p in points)-min(p.z for p in points)-c['demoProductHeight'])<.00001
    center=sum(points,Vector())/len(points)
    assert (center-Vector((d['product']['x'],d['product']['y'],d['product']['z']))).length<.00001
    top_points=[top.matrix_world@v.co for v in top.data.vertices]
    assert abs(max(v.z for v in top_points)-min(v.z for v in points))<.00001
    guides=[o for o in col.all_objects if o.get('code_buddy_role')=='activation_zone']
    assert len(guides)==len(item['zones'])
    for z in item['zones']:
        assert any(abs(o.matrix_world.translation.x-z['x'])<.00001 and abs(o.matrix_world.translation.y-z['y'])<.00001 and abs(o.matrix_world.to_scale().x*2-z['width'])<.00001 and abs(o.matrix_world.to_scale().y*2-z['depth'])<.00001 for o in guides)
    for o in guides:
        assert o.type=='EMPTY' and o.hide_render
        if o.get('code_buddy_id'):assert o.parent==root
    old=product.matrix_world.translation.copy();root.location.x+=.25
    bpy.context.view_layer.update();assert abs(product.matrix_world.translation.x-old.x-.25)<.00001
    previous=[(o,o.matrix_world.copy()) for o in col.all_objects]
    mat=product.data.materials[0];mat.diffuse_color=(.2,.3,.4,1);color=tuple(mat.diffuse_color)
    exec(compile(source,item['id'],'exec'),{});bpy.context.view_layer.update()
    assert tuple(mat.diffuse_color)==color
    for obj,matrix in previous:
        assert max(abs(obj.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<.00001
    print('DEMO_OK',item['id'])
print('DEMO_ALL_OK',len(items))
