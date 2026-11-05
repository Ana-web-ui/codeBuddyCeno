"""Confere peças, materiais, hierarquia, orientação e preservação das gerações."""
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

folder = Path(sys.argv[sys.argv.index('--') + 1])
items = json.loads((folder / 'manifest.json').read_text(encoding='utf8'))
for item in items:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = (folder / (item['id'] + '.py')).read_text(encoding='utf8')
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    col = next(c for c in bpy.data.collections if c.get('code_buddy_generation'))
    c = item['config']
    angle = math.radians(c['frontRotation'] if c['projectType'] == 'stand' else 0)
    roots = [o for o in col.all_objects if o.get('code_buddy_role') == 'counter_unit']
    assert len(roots) == (len(item['xs']) if c['counterDetailed'] else 0)
    for index, x in enumerate(item['xs']):
        root = next((o for o in roots if o.get('code_buddy_id') == f'counter:{index}'), None)
        if root:
            assert len(root.children) == len(item['parts'])
        for part in item['parts']:
            if root:
                obj = next(o for o in root.children if o.get('code_buddy_role') == part['role'])
                assert obj.get('code_buddy_id') == f'counter:{index}'
            else:
                expected_x = x * math.cos(angle) - item['y'] * math.sin(angle)
                obj = next(o for o in col.all_objects if part['name'] in o.name and
                           abs(o.matrix_world.translation.x - expected_x) < 1e-5)
            points = [obj.matrix_world @ v.co for v in obj.data.vertices]
            center = sum(points, Vector()) / len(points)
            expected = Vector((x * math.cos(angle) - item['y'] * math.sin(angle),
                               x * math.sin(angle) + item['y'] * math.cos(angle), part['z']))
            assert (center - expected).length < 1e-5, (item['id'], part['name'], center, expected)
            for axis in range(3):
                size = part['size']
                want = (abs(math.cos(angle)) * size[0] + abs(math.sin(angle)) * size[1] if axis == 0
                        else abs(math.sin(angle)) * size[0] + abs(math.cos(angle)) * size[1] if axis == 1 else size[2])
                assert abs(max(p[axis] for p in points) - min(p[axis] for p in points) - want) < 1e-5
            if root:
                assert 'Acabamento_' + part['material'] in obj.data.materials[0].name
                assert any(m.type == 'BEVEL' and m.width > 0 for m in obj.modifiers)
    if roots:
        root = roots[0]
        child = root.children[0]
        old = child.matrix_world.translation.copy()
        matrix = root.matrix_world.copy()
        matrix.translation += Vector((.3, .1, 0))
        root.matrix_world = matrix
        bpy.context.view_layer.update()
        assert (child.matrix_world.translation - old - Vector((.3, .1, 0))).length < 1e-5
    previous = [(o, o.matrix_world.copy()) for o in col.all_objects]
    previous_materials = {o: tuple(o.data.materials) for o in col.all_objects if o.type == 'MESH'}
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    assert len([c for c in bpy.data.collections if c.get('code_buddy_generation')]) == 2
    for obj, matrix in previous:
        assert max(abs(obj.matrix_world[i][j] - matrix[i][j]) for i in range(4) for j in range(4)) < 1e-5
    for obj, materials in previous_materials.items():
        assert tuple(obj.data.materials) == materials
    print('COUNTER_OK', item['id'])
print('COUNTER_ALL_OK', len(items))
