"""Confere geometrias, materiais, pivôs, orientação, câmera de fotos e gerações."""
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
    angle = math.radians(c['frontRotation'] if c['projectType'] == 'stand' else 0)
    orientation = Matrix.Rotation(angle, 4, 'Z')
    roots = [o for o in col.all_objects if o.get('code_buddy_role') == 'assembly_unit' and str(o.get('code_buddy_id', '')).startswith('backdrops:')]
    if c['backdropDetailed']:
        assert len(roots) == len(item['units'])
    for index, unit in enumerate(item['units']):
        t = unit['transform']
        root = next((o for o in roots if o.get('code_buddy_id') == unit['id']), None)
        if c['backdropDetailed']:
            assert len([o for o in root.children if o.type == 'MESH']) == len(item['parts'])
        a = math.radians(t['rotation'])
        for j, part in enumerate(item['parts'], 1):
            if c['backdropDetailed']:
                obj = next(o for o in root.children if o.name.endswith('_' + part['name']))
                assert obj.get('code_buddy_role') == part['role']
                assert obj.get('code_buddy_id') == unit['id']
            else:
                # O exportador antigo mantém os nomes e a ordem originais.
                candidates = [o for o in col.all_objects if f'Backdrop_{index+1:03d}_Peca_{j}' in o.name and o.type == 'MESH']
                obj = candidates[0]
            points = [orientation.inverted() @ obj.matrix_world @ v.co for v in obj.data.vertices]
            center = sum(points, Vector()) / len(points)
            x, y, z = part['center']
            expected = Vector((t['x'] + x * math.cos(a) - y * math.sin(a),
                               t['y'] + x * math.sin(a) + y * math.cos(a), z))
            assert (center - expected).length < 1e-5, (item['id'], part['name'], center, expected)
            for axis in range(3):
                size = part['size']
                want = (abs(math.cos(a)) * size[0] + abs(math.sin(a)) * size[1] if axis == 0
                        else abs(math.sin(a)) * size[0] + abs(math.cos(a)) * size[1] if axis == 1 else size[2])
                assert abs(max(v[axis] for v in points) - min(v[axis] for v in points) - want) < 1e-5
            assert 'Acabamento_' + part['material'] in obj.data.materials[0].name
    if item['photo']:
        camera = next(o for o in col.all_objects if o.get('code_buddy_role') == 'photo_camera')
        assert camera.parent == roots[0]
        position = item['photo']['camera']
        assert (camera.matrix_world.translation - Vector((position['x'], position['y'], .1 + c['activationPhotoCameraHeight']))).length < 1e-5
    if roots:
        root = roots[0]
        mesh = next(o for o in root.children if o.type == 'MESH')
        old = mesh.matrix_world.translation.copy()
        matrix = root.matrix_world.copy()
        matrix.translation += Vector((.2, -.1, 0))
        root.matrix_world = matrix
        bpy.context.view_layer.update()
        assert (mesh.matrix_world.translation - old - Vector((.2, -.1, 0))).length < 1e-5
    previous = [(o, o.matrix_world.copy()) for o in col.all_objects]
    previous_materials = {o: tuple(o.data.materials) for o in col.all_objects if o.type == 'MESH'}
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    for obj, matrix in previous:
        assert max(abs(obj.matrix_world[i][j] - matrix[i][j]) for i in range(4) for j in range(4)) < 1e-5
    for obj, materials in previous_materials.items():
        assert tuple(obj.data.materials) == materials
    print('PANEL_OK', item['id'])
print('PANEL_ALL_OK', len(items))
