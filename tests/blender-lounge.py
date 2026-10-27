"""Valida os meshes exportados contra a montagem restaurada do JSON."""
import bpy,json,sys,math,re
from pathlib import Path
from mathutils import Vector
fixtures=Path(sys.argv[sys.argv.index('--')+1])
manifest=json.loads((fixtures/'manifest.json').read_text(encoding='utf8'))
patterns={'coffeeTables':r'Mesa_Centro_(\d+)_','armchairs':r'Poltrona_(\d+)_',
          'puffs':r'Puff_(\d+)_','bistroTables':r'Mesa_Bistro_(\d+)_',
          'stools':r'Banqueta_(\d+)_','roundRugs':r'Tapete_Circular_(\d+)_'}
height_keys={'coffeeTables':'coffeeTableHeight','armchairs':'armchairHeight','puffs':'puffHeight',
             'bistroTables':'bistroTableHeight','stools':'stoolSeatHeight'}
for item in manifest:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=(fixtures/(item['id']+'.py')).read_text(encoding='utf8')
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    col=next(c for c in bpy.data.collections if c.get('code_buddy_generation'))
    roots={o.get('code_buddy_id'):o for o in col.all_objects if o.get('code_buddy_role')=='assembly_unit'}
    assert len(roots)==len(item['units']),(item['id'],'grupos')
    for unit in item['units']:
        root=roots[unit['id']]
        assert (root.matrix_world.translation-Vector((unit['transform']['x'],unit['transform']['y'],0.1))).length<0.0001
        roles={}
        for member in unit['members']: roles.setdefault(member['role'],[]).append(member)
        for role,members in roles.items():
            for index,member in enumerate(members,1):
                objects=[o for o in root.children if o.type=='MESH' and (m:=re.search(patterns[role],o.name)) and int(m[1])==index]
                assert objects,(item['id'],unit['id'],role,index)
                points=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
                low=[min(p[i] for p in points) for i in range(3)]
                high=[max(p[i] for p in points) for i in range(3)]
                a=math.radians(member['rotation'])
                expected_w=member['width'] if member['circle'] else abs(math.cos(a))*member['width']+abs(math.sin(a))*member['depth']
                expected_d=member['depth'] if member['circle'] else abs(math.sin(a))*member['width']+abs(math.cos(a))*member['depth']
                assert abs((low[0]+high[0])/2-member['x'])<0.005,(item['id'],role,'X')
                assert abs((low[1]+high[1])/2-member['y'])<0.005,(item['id'],role,'Y')
                assert abs(high[0]-low[0]-expected_w)<0.005,(item['id'],role,'largura',high[0]-low[0],expected_w)
                assert abs(high[1]-low[1]-expected_d)<0.005,(item['id'],role,'profundidade')
                assert abs(low[2]-0.1)<0.0001,(item['id'],role,'piso')
                expected_h=0.008 if role=='roundRugs' else item['config'][height_keys[role]]
                assert abs(high[2]-low[2]-expected_h)<0.0001,(item['id'],role,'altura')
                if role=='coffeeTables':
                    assert len(objects)==5
                    top=next(o for o in objects if 'Tampo' in o.name)
                    assert abs(max(v.co.z for v in top.data.vertices)-min(v.co.z for v in top.data.vertices)-item['config']['coffeeTableTopThickness'])<0.0001
                assert all(o.get('code_buddy_id')==unit['id'] for o in objects)
    root=next(iter(roots.values()))
    root.location.x+=0.13
    material=next(o for o in root.children if o.type=='MESH').data.materials[0]
    material.diffuse_color=(0.1,0.3,0.5,1)
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value=0.77
    color=tuple(material.diffuse_color)
    bpy.context.view_layer.update()
    previous=[(o,o.matrix_world.copy()) for o in col.all_objects]
    exec(compile(source,item['id'],'exec'),{})
    bpy.context.view_layer.update()
    assert len([c for c in bpy.data.collections if c.get('code_buddy_generation')])==2
    for obj,matrix in previous:
        assert max(abs(obj.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<0.0001
    assert tuple(material.diffuse_color)==color
    assert abs(shader.inputs['Roughness'].default_value-0.77)<0.0001
    if item['id']=='padrao':
        snapshot={o.name:[list(row) for row in o.matrix_world] for o in col.all_objects}
        scene_file=fixtures/'lounge-reaberto.blend'
        bpy.ops.wm.save_as_mainfile(filepath=str(scene_file))
        bpy.ops.wm.open_mainfile(filepath=str(scene_file))
        for name,matrix in snapshot.items():
            obj=bpy.data.objects[name]
            assert max(abs(obj.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<0.0001
        assert len([o for o in bpy.data.objects if o.get('code_buddy_role')=='assembly_unit'])==2*len(item['units'])
    print('PASS',item['id'])
print('PASS',len(manifest),'cenários Lounge: JSON, medidas, posição, rotação, grupos, tampo e versões anteriores.')
