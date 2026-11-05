"""Verifica geometria, posição, hierarquia e artes das cópias no Blender."""
import json, math, sys
from pathlib import Path
from collections import Counter
import bpy
from mathutils import Matrix, Vector
folder=Path(sys.argv[sys.argv.index('--')+1])
items=json.loads((folder/'manifest.json').read_text(encoding='utf8'))
for item in items:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=(folder/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    c=item['config']; cid=item['copyId']; sid=item['sourceId']
    col=next(col for col in bpy.data.collections if col.get('code_buddy_generation'))
    objects=list(col.all_objects)
    copies=[o for o in objects if o.get('code_buddy_id')==cid]
    roots=[o for o in copies if o.type=='EMPTY' and o.get('code_buddy_role')=='assembly_unit']
    assert len(roots)==1, (item['id'],len(roots))
    root=roots[0]; t=c['objectTransforms'][cid]
    front=Matrix.Rotation(math.radians(c['frontRotation'] if c['projectType'] in ('stand','reception') else 0),4,'Z')
    expected=front @ Matrix.Translation((t['x'],t['y'],.1)) @ Matrix.Rotation(math.radians(t['rotation']),4,'Z')
    assert max(abs(root.matrix_world[i][j]-expected[i][j]) for i in range(4) for j in range(4))<1e-5
    meshes=[o for o in copies if o.type=='MESH']
    assert meshes
    for obj in meshes:
        parent=obj.parent
        while parent and parent!=root: parent=parent.parent
        assert parent==root, (item['id'],obj.name)
    arts=[o for o in copies if o.get('code_buddy_role')=='branding_artwork']
    for art in arts:
        assert art.parent and art.parent.type=='MESH'
        assert art.parent.get('code_buddy_id')==cid
        tex=next(n for n in art.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
        assert tex.image.packed_file
    if item['id'] in ('balcao','painel'): assert len(arts)==1
    if sid=='led:0':
        assert len(meshes)==6
        frame=next(o for o in meshes if 'LED_Moldura' in o.name)
        center=sum((frame.matrix_world @ Vector(v) for v in frame.bound_box),Vector())/8
        want=front @ Vector((t['x'],t['y'],.1+c['ledBottom']+c['ledHeight']/2))
        assert (center-want).length<1e-5
        screen=next(o for o in meshes if 'LED_Tela' in o.name)
        expected_screen=front @ (Matrix.Translation((t['x'],t['y'],0)) @ Matrix.Rotation(math.radians(t['rotation']),4,'Z')) @ Vector((0,-.075,.1+c['ledBottom']+c['ledHeight']/2))
        center=sum((screen.matrix_world @ Vector(v) for v in screen.bound_box),Vector())/8
        assert (center-expected_screen).length<1e-5, (item['id'],center,expected_screen)
        assert screen.data.uv_layers.active
    else:
        original=[o for o in objects if o.type=='MESH' and o.get('code_buddy_id')==sid]
        assert len(original)==len(meshes), (item['id'],len(original),len(meshes))
        # A mesma geometria e os mesmos detalhes devem existir na cópia.
        signature=lambda o:(len(o.data.vertices),len(o.data.polygons),o.get('code_buddy_role'))
        assert Counter(map(signature,original))==Counter(map(signature,meshes)), item['id']
        # Centros das partes, no sistema local de cada unidade, preservam o conjunto.
        ts=c['objectTransforms'].get(sid)
        if ts is None:
            if sid.startswith('counter:'): ts={'x':0,'y':-c['depth']*.28,'rotation':0}
            elif sid.startswith('stage:'): ts={'x':0,'y':c['depth']*.18,'rotation':0}
            else:
                original_root=next(o for o in objects if o.get('code_buddy_id')==sid and o.type=='EMPTY' and o.get('code_buddy_role')=='assembly_unit')
                matrix=original_root.matrix_world.copy()
                ts=None
        if ts is not None: matrix=front @ Matrix.Translation((ts['x'],ts['y'],.1)) @ Matrix.Rotation(math.radians(ts['rotation']),4,'Z')
        inv_source=matrix.inverted(); inv_copy=expected.inverted()
        def normalized(o,inv):
            center=sum((o.matrix_world @ Vector(v) for v in o.bound_box),Vector())/8
            return inv @ center
        wanted=[normalized(o,inv_source) for o in original]
        for obj in meshes:
            actual=normalized(obj,inv_copy)
            assert any((actual-point).length<1e-4 for point in wanted),(item['id'],obj.name,actual,wanted)
    previous=[(o,o.matrix_world.copy()) for o in objects]
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    for o,m in previous:
        assert max(abs(o.matrix_world[i][j]-m[i][j]) for i in range(4) for j in range(4))<1e-5
    print('EDITOR_COPY_OK',item['id'])
print('EDITOR_COPY_ALL_OK',len(items))
