"""Valida posições, giro e vínculo das artes após mover palco e balcões."""
import json, math, sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
folder = Path(sys.argv[sys.argv.index('--') + 1])
items = json.loads((folder/'manifest.json').read_text(encoding='utf8'))
for item in items:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = (folder/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    c = item['config']
    col = next(col for col in bpy.data.collections if col.get('code_buddy_generation'))
    objects = list(col.all_objects)
    front = Matrix.Rotation(math.radians(c['frontRotation'] if c['projectType'] in ('stand','reception') else 0),4,'Z')
    for id,t in c['objectTransforms'].items():
        role = 'stage' if id.startswith('stage:') else 'counter_unit'
        roots = [o for o in objects if o.get('code_buddy_id') == id and o.get('code_buddy_role') == role]
        assert len(roots) == 1, (item['id'],id,len(roots))
        root = roots[0]
        height = .1+c['stageHeight']/2 if role == 'stage' else .1
        expected = front @ Matrix.Translation((t['x'],t['y'],height)) @ Matrix.Rotation(math.radians(t['rotation']),4,'Z')
        assert max(abs(root.matrix_world[i][j]-expected[i][j]) for i in range(4) for j in range(4)) < 1e-5, (item['id'],id,root.matrix_world,expected)
        if role == 'counter_unit':
            pieces = [o for o in objects if o.get('code_buddy_id') == id and o.get('code_buddy_role') in ('counter_body','counter_top','counter_base')]
            assert len(pieces) == (3 if c['counterDetailed'] else 2)
            for piece in pieces:
                assert piece.parent == root
                assert abs(piece.matrix_local.translation.x) < 1e-6 and abs(piece.matrix_local.translation.y) < 1e-6
            arts = [o for o in objects if o.get('code_buddy_id') == id and o.get('code_buddy_role') == 'branding_artwork']
            assert len(arts) == int(c['counterArtEnabled'])
            for art in arts:
                assert art.parent in pieces
                tex = next(n for n in art.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE')
                assert tex.image.packed_file
    # Gerar novamente não deve alterar a cena anterior.
    previous = [(o,o.matrix_world.copy()) for o in objects]
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    for obj,m in previous:
        assert max(abs(obj.matrix_world[i][j]-m[i][j]) for i in range(4) for j in range(4)) < 1e-5
    print('STRUCTURE_MOVE_OK',item['id'])
print('STRUCTURE_MOVE_ALL_OK',len(items))
