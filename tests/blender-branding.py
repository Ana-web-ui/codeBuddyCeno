"""Confere frente, UV, transparência, textura empacotada e vínculo com a peça."""
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

folder = Path(sys.argv[sys.argv.index('--') + 1])
items = json.loads((folder / 'manifest.json').read_text(encoding='utf8'))
for item in items:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = (folder / (item['id'] + '.py')).read_text(encoding='utf8')
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    col = next(c for c in bpy.data.collections if c.get('code_buddy_generation'))
    c = item['config']
    front = Matrix.Rotation(math.radians(c['frontRotation'] if c['projectType'] in ('stand', 'reception') else 0), 4, 'Z')
    arts = [o for o in col.all_objects if o.get('code_buddy_role') == 'branding_artwork']
    assert len(arts) == len(item['expected']), (item['id'], len(arts), len(item['expected']))
    for expected in item['expected']:
        obj = next(o for o in arts if o.get('code_buddy_id') == expected['id'] and o.get('code_buddy_art_slot') == expected['slot'])
        assert obj.parent and obj.parent.type == 'MESH'
        assert obj.parent.get('code_buddy_role') in ('panel_front', 'panel_body', 'counter_body')
        t = expected['transform']
        transform = front @ Matrix.Translation((t['x'], t['y'], 0)) @ Matrix.Rotation(math.radians(t['rotation']), 4, 'Z') @ Matrix.Translation((0, expected['bodyY'], expected['bodyZ']))
        for vertex, wanted in zip(obj.data.vertices, expected['vertices']):
            assert (obj.matrix_world @ vertex.co - transform @ Vector(wanted)).length < 1e-5, (item['id'], expected['id'])
        assert obj.data.polygons[0].normal.y < -.99
        layer = obj.data.uv_layers.active
        for polygon in obj.data.polygons:
            for index in polygon.loop_indices:
                want = expected['uv'][obj.data.loops[index].vertex_index]
                assert (layer.data[index].uv - Vector(want)).length < 1e-6
        mat = obj.data.materials[0]
        shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        tex = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE')
        assert tex.image.packed_file
        assert list(tex.image.size) == [expected['imageSize']['width'], expected['imageSize']['height']]
        assert shader.inputs['Base Color'].is_linked and shader.inputs['Alpha'].is_linked
        assert shader.inputs['Emission Strength'].default_value == 0
        assert tex.image.get('code_buddy_generation') == col.get('code_buddy_generation')
        assert mat != obj.parent.data.materials[0]
        # Mover a própria peça deve levar a arte junto, sem transformá-la duas vezes.
        old = obj.matrix_world.translation.copy()
        matrix = obj.parent.matrix_world.copy(); matrix.translation += Vector((.2, -.1, 0))
        obj.parent.matrix_world = matrix; bpy.context.view_layer.update()
        assert (obj.matrix_world.translation - old - Vector((.2, -.1, 0))).length < 1e-5
    images = {next(n.image for n in o.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE') for o in arts}
    assert len(images) == len({o.get('code_buddy_art_slot') for o in arts})
    previous = [(o, o.matrix_world.copy()) for o in col.all_objects]
    old_materials = {o: tuple(o.data.materials) for o in arts}
    old_images = set(images)
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    for obj, matrix in previous:
        assert max(abs(obj.matrix_world[i][j] - matrix[i][j]) for i in range(4) for j in range(4)) < 1e-5
    for obj, mats in old_materials.items(): assert tuple(obj.data.materials) == mats
    for image in old_images: assert image.packed_file
    print('BRANDING_OK', item['id'])
print('BRANDING_ALL_OK', len(items))
