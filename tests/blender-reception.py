"""Executa os scripts reais e confere balcões, escala e preservação de gerações."""
import json
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
    for suffix, size, height in [
        ('Balcao_Corpo', (c['counterWidth'], c['counterDepth'], c['counterHeight'] - .06),
         .1 + (c['counterHeight'] - .06) / 2),
        ('Balcao_Tampo', (c['counterWidth'] + .08, c['counterDepth'] + .08, .06),
         .1 + c['counterHeight'] - .03),
    ]:
        objects = [o for o in col.all_objects if suffix in o.name and o.type == 'MESH']
        assert len(objects) == len(item['counters']), (item['id'], suffix, len(objects))
        for expected in item['counters']:
            obj = next(o for o in objects if abs(o.matrix_world.translation.x - expected['x']) < 1e-5)
            points = [obj.matrix_world @ v.co for v in obj.data.vertices]
            center = sum(points, Vector()) / len(points)
            assert (center - Vector((expected['x'], expected['y'], height))).length < 1e-5
            for axis in range(3):
                assert abs(max(v[axis] for v in points) - min(v[axis] for v in points) - size[axis]) < 1e-5
    assert bpy.context.scene.unit_settings.scale_length == 1
    previous = [(o, o.matrix_world.copy()) for o in col.all_objects]
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    assert len([c for c in bpy.data.collections if c.get('code_buddy_generation')]) == 2
    for obj, matrix in previous:
        assert max(abs(obj.matrix_world[i][j] - matrix[i][j]) for i in range(4) for j in range(4)) < 1e-5
    print('RECEPTION_OK', item['id'])
print('RECEPTION_ALL_OK', len(items))
