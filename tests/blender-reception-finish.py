"""Confere as peças físicas, texto, zonas, orientação e preservação da recepção."""
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
    angle = math.radians(c['frontRotation'])
    rotation = Matrix.Rotation(angle, 4, 'Z')
    inverse = rotation.inverted()
    meshes = [o for o in col.all_objects if str(o.get('code_buddy_role', '')).startswith('reception_') and o.type == 'MESH']
    assert len(meshes) == len(item['details']['parts'])
    for part in item['details']['parts']:
        obj = next(o for o in meshes if o.name.endswith('_' + part['id']))
        points = [inverse @ obj.matrix_world @ v.co for v in obj.data.vertices]
        center = sum(points, Vector()) / len(points)
        assert (center - Vector(part['center'])).length < 1e-5, (item['id'], part['id'])
        assert obj.get('code_buddy_role') == part['role']
        assert obj.parent.get('code_buddy_role') == 'reception_unit'
        for axis in range(3):
            assert abs(max(v[axis] for v in points) - min(v[axis] for v in points) - part['size'][axis]) < 1e-5
        assert 'Acabamento_' + part['material'] in obj.data.materials[0].name
    text = [o for o in col.all_objects if o.get('code_buddy_role') == 'reception_sign_text']
    assert len(text) == int(c['receptionSignEnabled'])
    if text:
        obj = text[0]
        assert obj.type == 'FONT' and obj.data.body == c['receptionSignText']
        points = [inverse @ obj.matrix_world @ Vector(v) for v in obj.bound_box]
        assert max(v.x for v in points) - min(v.x for v in points) <= c['receptionSignWidth'] - .12 + 1e-5
        assert max(v.z for v in points) - min(v.z for v in points) <= .32 + 1e-5
        assert obj.parent.get('code_buddy_id') == 'reception:sign'
    guides = [o for o in col.all_objects if o.get('code_buddy_role') == 'reception_zone']
    assert len(guides) == len(item['guides'])
    for i, zone in enumerate(item['guides']):
        obj = next(o for o in guides if o.get('code_buddy_id') == 'reception:zone:' + str(i))
        local = inverse @ obj.matrix_world
        assert (local.translation - Vector((zone['x'], zone['y'], .105))).length < 1e-5
        assert abs(local.to_scale().x * 2 - zone['width']) < 1e-5
        assert abs(local.to_scale().y * 2 - zone['depth']) < 1e-5
        assert obj.type == 'EMPTY' and obj.hide_render
    previous = [(o, o.matrix_world.copy()) for o in col.all_objects]
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    assert len([c for c in bpy.data.collections if c.get('code_buddy_generation')]) == 2
    for obj, matrix in previous:
        assert max(abs(obj.matrix_world[i][j] - matrix[i][j]) for i in range(4) for j in range(4)) < 1e-5
    print('RECEPTION_FINISH_OK', item['id'])
print('RECEPTION_FINISH_ALL_OK', len(items))
