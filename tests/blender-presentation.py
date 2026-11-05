"""Valida piso físico, enquadramento real, iluminação e isolamento entre gerações."""
import json
import math
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

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
    floor = next(o for o in col.all_objects if o.get('code_buddy_role') == 'floor') if c['floorShape'] != 'rectangle' else next(o for o in col.all_objects if o.type == 'MESH' and o.name == 'Piso')
    assert abs(floor.dimensions.z - .1) < 1e-6
    if c['floorShape'] != 'rectangle':
        assert len(floor.data.vertices) == len(item['mesh']['vertices'])
        assert [list(p.vertices) for p in floor.data.polygons] == item['mesh']['faces']
        for vertex, expected in zip(floor.data.vertices, item['mesh']['vertices']):
            assert (floor.matrix_world @ vertex.co - front @ Vector(expected)).length < 1e-5
        top_area = sum(p.area for p in floor.data.polygons if p.normal.z > .9)
        assert abs(top_area - item['area']) < 1e-4, (item['id'], top_area, item['area'])
    cameras = [o for o in col.all_objects if o.get('code_buddy_role') == 'presentation_camera']
    assert len(cameras) == (3 if c['presentationCameras'] else 0)
    if cameras:
        assert bpy.context.scene.camera.get('code_buddy_id') == 'presentation:' + c['presentationCamera']
        for view in item['views']:
            camera = next(o for o in cameras if o.get('code_buddy_id') == 'presentation:' + view['id'])
            assert camera.data.type == 'ORTHO'
            assert abs(camera.data.ortho_scale - view['width']) < 1e-4
            assert (camera.matrix_world.translation - front @ Vector(view['position'])).length < 1e-4
            for x in (-c['width']/2, c['width']/2):
                for y in (-c['depth']/2, c['depth']/2):
                    for z in (0, c['height']+.3):
                        p = world_to_camera_view(bpy.context.scene, camera, front @ Vector((x, y, z)))
                        assert 0 < p.x < 1 and 0 < p.y < 1 and p.z > 0, (item['id'], view['id'], p)
        scene = bpy.context.scene
        assert [scene.render.resolution_x, scene.render.resolution_y] == item['views'][0]['resolution']
    lights = [o for o in col.all_objects if o.type == 'LIGHT']
    assert sum('Luz_Recorte' in o.name for o in lights) == (1 if c['lightingPreset'] == 'studio' else 0)
    main = next(o for o in lights if 'Luz_Principal' in o.name)
    assert abs(main.data.energy - max(1000, c['width']*c['depth']*60)*c['lightingIntensity']) < .01
    for light in lights:
        if c['lightingPreset'] == 'neutral': expected = (1, 1, 1)
        elif c['lightingPreset'] == 'warm': expected = (1, .9, .8) if 'Preenchimento' in light.name else (1, .78, .55)
        elif c['lightingPreset'] == 'studio': expected = (.75, .85, 1) if 'Preenchimento' in light.name else (1, 1, 1)
        else: continue
        assert max(abs(a-b) for a,b in zip(light.data.color, expected)) < 1e-6
    previous = [(o, o.matrix_world.copy()) for o in col.all_objects]
    light_data = [(o.data, o.data.energy, tuple(o.data.color)) for o in lights]
    camera_data = [(o.data, o.data.ortho_scale) for o in cameras]
    exec(compile(source, item['id'], 'exec'), {})
    bpy.context.view_layer.update()
    for obj, matrix in previous:
        assert max(abs(obj.matrix_world[i][j] - matrix[i][j]) for i in range(4) for j in range(4)) < 1e-5
    for data, energy, color in light_data:
        assert data.energy == energy and tuple(data.color) == color
    for data, scale in camera_data: assert data.ortho_scale == scale
    print('PRESENTATION_OK', item['id'])
print('PRESENTATION_ALL_OK', len(items))
