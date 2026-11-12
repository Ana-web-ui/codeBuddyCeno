"""Confere topologia, coordenadas, grupos e preservação das gerações anteriores."""
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
    angle = c['frontRotation'] if c['projectType'] in ('stand', 'reception') else 0
    front = Matrix.Rotation(math.radians(angle), 4, 'Z')
    roots = [o for o in col.all_objects if o.get('code_buddy_role') == 'imported_model']
    assert len(roots) == len(item['models'])
    for model in item['models']:
        root = next(o for o in roots if o.get('code_buddy_id') == 'importedModels:' + str(model['id']))
        assert root.get('code_buddy_label') == model['name']
        transform = front @ Matrix.Translation((model['x'], model['y'], .1 + model['z'])) @ Matrix.Rotation(math.radians(model['rotation']), 4, 'Z')
        assert len(root.children) == len(model['geometry']['meshes'])
        for mesh in model['geometry']['meshes']:
            obj = next(o for o in root.children if o.get('code_buddy_label') == mesh['name'])
            assert obj.get('code_buddy_role') == 'imported_mesh'
            assert obj.get('code_buddy_id') == root['code_buddy_id']
            assert len(obj.data.vertices) == len(mesh['vertices'])
            assert [list(p.vertices) for p in obj.data.polygons] == mesh['faces']
            for vertex, expected in zip(obj.data.vertices, mesh['vertices']):
                assert (obj.matrix_world @ vertex.co - transform @ Vector(expected)).length < 1e-5
            assert 'Acabamento_' + model['material'] in obj.data.materials[0].name
        obj = root.children[0]
        old = obj.matrix_world.translation.copy()
        matrix = root.matrix_world.copy()
        matrix.translation += Vector((.2, -.1, 0))
        root.matrix_world = matrix
        bpy.context.view_layer.update()
        assert (obj.matrix_world.translation - old - Vector((.2, -.1, 0))).length < 1e-5
    previous = [(o, o.matrix_world.copy()) for o in col.all_objects]
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    for obj, matrix in previous:
        assert max(abs(obj.matrix_world[i][j] - matrix[i][j]) for i in range(4) for j in range(4)) < 1e-5
    print('IMPORTED_OBJ_OK', item['id'])
print('IMPORTED_OBJ_ALL_OK', len(items))
