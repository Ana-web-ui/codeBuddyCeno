import { getSupplierProduct } from './supplier-products';
import { validateFreeScene } from './free-scene';
import type { FreeScene, FreeObject } from './free-scene';
import { freeParts } from './free-scene-geometry';

type ArtworkPaths = ReadonlyMap<string, string>;

export function exportFreeBlender(scene:FreeScene, artwork?:ArtworkPaths):string {
    validateFreeScene(scene);
    const data=scene.objects.map(o=>({
        id: o.id,
        kind: o.kind,
        productId: o.productId ?? '',
        mount: o.mount ?? '',
        screenOrientation: o.screenOrientation ?? '',
        supplier: getSupplierProduct(o.productId)?.supplier ?? '',
        model: getSupplierProduct(o.productId)?.model ?? '',
        name: o.name,
        position: o.position,
        rotation: o.rotation,
        roughness: o.roughness,
        visible: o.visible,
        locked: o.locked,
        parts: freeParts(o).map(part=>part.image ? {...part,image:artwork?.get(part.image) ?? part.image} : part),
    }));
    const preflight = artwork?.size ? `arquivo_script = globals().get('__file__', '')
espaco = bpy.context.space_data
texto = getattr(espaco, 'text', None)
if texto and texto.filepath:
    arquivo_script = bpy.path.abspath(texto.filepath)
pasta_script = os.path.dirname(os.path.abspath(arquivo_script))
for caminho_relativo in ${JSON.stringify([...artwork.values()])}:
    if not os.path.isfile(os.path.join(pasta_script, caminho_relativo)):
        raise FileNotFoundError('Extraia todo o ZIP e mantenha a pasta materiais ao lado do script: ' + caminho_relativo)
` : '';
    return `# CODE BUDDY — CENA LIVRE 3D
# Blender: Scripting > Open > Run Script. Cada execução preserva as anteriores.
import bpy, bmesh, math, json, uuid, base64, os, tempfile
from mathutils import Vector, Euler, Matrix
objetos = json.loads(${JSON.stringify(JSON.stringify(data))})
nome = ${JSON.stringify(scene.name)}
${preflight}colecao = bpy.data.collections.new('CB_Livre_' + uuid.uuid4().hex[:8])
bpy.context.scene.collection.children.link(colecao)
colecao['code_buddy_free_scene'] = True
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1
imagens = {}
def vincular(obj):
    for origem in list(obj.users_collection): origem.objects.unlink(obj)
    colecao.objects.link(obj)
    return obj

def cor_linear(v): return v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4

def material_parte(parte, acabamento):
    mat = bpy.data.materials.new(colecao.name + '_' + parte['name'])
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    cor = parte['color'].lstrip('#')
    shader.inputs['Base Color'].default_value = tuple(cor_linear(int(cor[i:i+2],16)/255) for i in (0,2,4)) + (1,)
    shader.inputs['Roughness'].default_value = acabamento
    shader.inputs['Alpha'].default_value = parte['opacity']
    if parte['opacity'] < 1:
        if hasattr(mat, 'surface_render_method'): mat.surface_render_method = 'DITHERED'
        elif hasattr(mat, 'blend_method'): mat.blend_method = 'BLEND'
    if parte['shape'] == 'image':
        dados = parte['image']
        if dados not in imagens:
            if dados.startswith('data:'):
                cabecalho,conteudo = dados.split(',',1)
                fd,caminho = tempfile.mkstemp(suffix='.png' if 'png' in cabecalho else '.jpg')
                try:
                    with os.fdopen(fd,'wb') as arquivo: arquivo.write(base64.b64decode(conteudo))
                    imagem = bpy.data.images.load(caminho,check_existing=False)
                    imagem.pack()
                finally:
                    if os.path.exists(caminho): os.remove(caminho)
            else:
                imagem = bpy.data.images.load(os.path.join(pasta_script, dados),check_existing=False)
                imagem.pack()
            imagens[dados] = imagem
        textura = mat.node_tree.nodes.new('ShaderNodeTexImage'); textura.image = imagens[dados]
        mat.node_tree.links.new(textura.outputs['Color'],shader.inputs['Base Color'])
        alpha=mat.node_tree.nodes.new('ShaderNodeMath'); alpha.operation='MULTIPLY'; alpha.inputs[1].default_value=parte['opacity']
        mat.node_tree.links.new(textura.outputs['Alpha'],alpha.inputs[0]); mat.node_tree.links.new(alpha.outputs[0],shader.inputs['Alpha'])
        if hasattr(mat, 'surface_render_method'): mat.surface_render_method = 'DITHERED'
    return mat

for item in objetos:
    raiz = vincular(bpy.data.objects.new(item['name'],None))
    raiz.location = item['position']
    raiz.rotation_euler = Euler(tuple(math.radians(v) for v in item['rotation']),'XYZ')
    raiz['code_buddy_id'] = 'free:' + str(item['id'])
    raiz['code_buddy_role'] = item['kind']
    if item.get('productId'):
        raiz['code_buddy_product_id'] = item['productId']
        raiz['code_buddy_supplier'] = item['supplier']
        raiz['code_buddy_model'] = item['model']
        if item.get('mount'): raiz['code_buddy_mount'] = item['mount']
        if item.get('screenOrientation'): raiz['code_buddy_screen_orientation'] = item['screenOrientation']
    raiz['code_buddy_locked'] = item['locked']
    raiz.hide_select = item['locked']
    for parte in item['parts']:
        tamanho = parte['size']; tipo = parte['shape']
        if tipo in ('box', 'cylinder'):
            mesh = bpy.data.meshes.new(parte['name'])
            geometria = bmesh.new()
            try:
                geometria.loops.layers.uv.verify()
                if tipo == 'box':
                    bmesh.ops.create_cube(geometria, size=1, calc_uvs=True)
                else:
                    bmesh.ops.create_cone(geometria, cap_ends=True, segments=32, radius1=.5, radius2=.5, depth=1, calc_uvs=True)
                geometria.to_mesh(mesh)
            finally:
                geometria.free()
            mesh.transform(Matrix.Diagonal((*tamanho, 1)))
            mesh.update()
            obj = vincular(bpy.data.objects.new(parte['name'], mesh))
        elif tipo == 'mesh':
            mesh = bpy.data.meshes.new(parte['name']); mesh.from_pydata(parte['vertices'],[],parte['faces']); mesh.update()
            obj = vincular(bpy.data.objects.new(parte['name'],mesh))
        elif tipo == 'text':
            curva = bpy.data.curves.new(parte['name'],'FONT'); curva.body = parte['text']
            curva.align_x = 'CENTER'; curva.align_y = 'CENTER'; curva.size = 1; curva.extrude = .001
            obj = vincular(bpy.data.objects.new(parte['name'],curva))
        else:
            mesh = bpy.data.meshes.new(parte['name'])
            mesh.from_pydata(parte.get('vertices', [(-tamanho[0]/2,0,-tamanho[2]/2),(tamanho[0]/2,0,-tamanho[2]/2),(tamanho[0]/2,0,tamanho[2]/2),(-tamanho[0]/2,0,tamanho[2]/2)]),[],[(0,1,2,3)])
            mesh.update(); uv=mesh.uv_layers.new()
            for i,valor in enumerate([(0,0),(1,0),(1,1),(0,1)]): uv.data[i].uv=valor
            obj=vincular(bpy.data.objects.new(parte['name'],mesh))
        obj.name = item['name'] + '_' + parte['name']; obj.parent = raiz; obj.location = parte['center']
        obj['code_buddy_id'] = 'free:' + str(item['id']); obj['code_buddy_role'] = parte['name']
        if tipo == 'text':
            bpy.context.view_layer.update()
            cantos=[Vector(v) for v in obj.bound_box]
            minimo=Vector(tuple(min(v[i] for v in cantos) for i in range(3)))
            maximo=Vector(tuple(max(v[i] for v in cantos) for i in range(3)))
            obj.scale = (tamanho[0]/max(maximo.x-minimo.x,.001),tamanho[2]/max(maximo.y-minimo.y,.001),1)
            obj.rotation_euler.x = math.pi/2
            deslocamento = obj.rotation_euler.to_matrix() @ Vector(((minimo.x+maximo.x)/2*obj.scale.x,(minimo.y+maximo.y)/2*obj.scale.y,0))
            obj.location = Vector(parte['center']) - deslocamento
        obj.data.materials.append(material_parte(parte,item['roughness']))
        obj.hide_render = not item['visible']; obj.hide_set(not item['visible']); obj.hide_select = item['locked']
    raiz.hide_set(not item['visible'])

bpy.context.view_layer.update()
visiveis = [obj for obj in colecao.all_objects if obj.type in ('MESH','FONT') and not obj.hide_render]
pontos = [obj.matrix_world @ Vector(canto) for obj in visiveis for canto in obj.bound_box]
if pontos:
    minimo = Vector(tuple(min(p[i] for p in pontos) for i in range(3)))
    maximo = Vector(tuple(max(p[i] for p in pontos) for i in range(3)))
    centro=(minimo+maximo)/2; alcance=max((maximo-minimo).length,4)
else: centro=Vector((0,0,0)); alcance=8
camera_dados=bpy.data.cameras.new('Camera_Cena_Livre'); camera=vincular(bpy.data.objects.new('Camera_Cena_Livre',camera_dados))
camera.location=centro+Vector((1,-1,.8)).normalized()*alcance*1.4
camera.rotation_euler=(centro-camera.location).to_track_quat('-Z','Y').to_euler()
camera_dados.type='ORTHO'; camera_dados.ortho_scale=alcance*1.2; camera_dados.clip_end=max(1000,alcance*10)
bpy.context.scene.camera=camera
for nome_luz,offset,energia in [('Principal',(1,-1,2),1600),('Preenchimento',(-1,-.3,1),900)]:
    dados=bpy.data.lights.new(nome_luz,'AREA'); dados.energy=energia*max(1,alcance/8)**2; dados.shape='DISK'; dados.size=alcance
    luz=vincular(bpy.data.objects.new(nome_luz,dados)); luz.location=centro+Vector(offset)*alcance
    luz.rotation_euler=(centro-luz.location).to_track_quat('-Z','Y').to_euler()
mundo=bpy.data.worlds.new('Mundo_Cena_Livre'); mundo.use_nodes=True
mundo.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1)
mundo.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.context.scene.world=mundo
bpy.context.scene.render.engine='CYCLES'; bpy.context.scene.cycles.samples=32
bpy.context.scene.render.resolution_x=1920; bpy.context.scene.render.resolution_y=1080; bpy.context.scene.render.resolution_percentage=100
print('Code Buddy: cena livre criada, com objetos independentes e texto editável.')
`;
}
const ms=(value:string)=>JSON.stringify(value).replace(/\\u([0-9a-f]{4})/gi,(_,h:string)=>String.fromCharCode(parseInt(h,16)));
const vec=(v:number[])=>'['+v.map(n=>`(${n})*METRO`).join(',')+']';
export function exportFreeMax(scene:FreeScene, artwork?:ArtworkPaths):string {
    validateFreeScene(scene);
    return `-- CODE BUDDY — CENA LIVRE 3D
-- Scripting > Run Script. Objetos anteriores sao preservados.
-- Mantenha a pasta materiais junto ao script ao executar um pacote ZIP.
(
${artwork?.size ? `local arquivoScript = getSourceFileName()
if arquivoScript == undefined or arquivoScript == "" do throw "Execute o arquivo .ms extraido do ZIP."
local pastaScript = getFilenamePath arquivoScript
for arquivo in #(${[...artwork.values()].map(ms).join(',')}) do (
    if not doesFileExist (pastaScript + arquivo) do throw ("Material ausente. Extraia todo o ZIP: " + arquivo)
)
` : ''}local METRO = units.decodeValue "1m"
local camada = LayerManager.newLayerFromName ("CB_Livre_" + ((dotNetClass "System.Guid").NewGuid().ToString()))
fn registrar obj = (camada.addNode obj; obj)
fn materialLivre nome rgb opacidade aspereza =
(
    local mat = Physical_Material name:nome
    mat.base_color = rgb; mat.roughness = aspereza; mat.transparency = 1-opacidade
    mat
)
${scene.objects.map(o=>maxObject(o,artwork)).join('\n')}
format "Code Buddy: cena livre criada.\\n"
)
`;
}
function maxObject(o:FreeObject, artwork?:ArtworkPaths):string {
    const product = getSupplierProduct(o.productId);
    const color=(hex:string)=>'(color '+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(' ')+')';
    return `(
local raiz=registrar (Dummy name:${ms(o.name)} pos:[0,0,0])
local pecas=#(raiz)
setUserProp raiz "code_buddy_id" "free:${o.id}"
setUserProp raiz "code_buddy_role" ${ms(o.kind)}
${product ? `setUserProp raiz "code_buddy_product_id" ${ms(product.id)}
setUserProp raiz "code_buddy_supplier" ${ms(product.supplier)}
setUserProp raiz "code_buddy_model" ${ms(product.model)}` : ''}
${o.mount ? `setUserProp raiz "code_buddy_mount" ${ms(o.mount)}` : ''}
${o.screenOrientation ? `setUserProp raiz "code_buddy_screen_orientation" ${ms(o.screenOrientation)}` : ''}
${freeParts(o).map((part,i)=>{
    const [w,d,h]=part.size,c=part.center,mat=`materialLivre ${ms(o.name+'_'+part.name)} ${color(part.color)} (${part.opacity}) (${o.roughness})`;
    const artworkPath = part.image ? artwork?.get(part.image) : undefined;
    let code='';
    if(part.shape==='box') code=`local obj=registrar (box width:(${w}*METRO) length:(${d}*METRO) height:(${h}*METRO) pos:${vec([c[0],c[1],c[2]-h/2])})`;
    else if(part.shape==='cylinder') code=`local obj=registrar (cylinder radius:(${w/2}*METRO) height:(${h}*METRO) sides:32 pos:${vec([c[0],c[1],c[2]-h/2])})\nobj.scale=[1,${d/w},1]`;
    else if(part.shape==='mesh') code=`local obj=registrar (mesh vertices:#(${part.vertices!.map(vec).join(',')}) faces:#(${part.faces!.map(f=>'['+f.map(n=>n+1).join(',')+']').join(',')}))`;
    else if(part.shape==='text') code=`local obj=registrar (text text:${ms(part.text!)} size:METRO font:"Arial" alignment:2)\nlocal limites=nodeGetBoundingBox obj obj.transform\nlocal centro=(limites[1]+limites[2])/2\nlocal escalaX=(${w}*METRO)/(amax #(.001*METRO,limites[2].x-limites[1].x))\nlocal escalaY=(${h}*METRO)/(amax #(.001*METRO,limites[2].y-limites[1].y))\nobj.transform=(transMatrix (-centro))*(scaleMatrix [escalaX,escalaY,1])*(rotateXMatrix 90)*(transMatrix ${vec(c)})`;
    else code=`local obj=registrar (mesh vertices:#(${(part.vertices ?? [[-w/2,0,-h/2],[w/2,0,-h/2],[w/2,0,h/2],[-w/2,0,h/2]]).map(v=>vec(v.map((n,k)=>n+c[k]))).join(',')}) faces:#([1,2,3],[1,3,4]))\nsetNumTVerts obj 4\nsetTVert obj 1 [0,0,0];setTVert obj 2 [1,0,0];setTVert obj 3 [1,1,0];setTVert obj 4 [0,1,0]\nbuildTVFaces obj;setTVFace obj 1 [1,2,3];setTVFace obj 2 [1,3,4]`;
    return `(
${code}
obj.name=${ms(o.name+'_'+part.name+'_'+i)}
obj.material=(${mat})
${part.shape==='image'?`${artworkPath ? `local caminho=pastaScript+${ms(artworkPath)}\n` : `local pasta=(getDir #userScripts)+"/CodeBuddy_Artes/"\nmakeDir pasta all:true\nlocal caminho=pasta+((dotNetClass "System.Guid").NewGuid().ToString())+${ms(part.image!.includes('image/png')?'.png':'.jpg')}\n(dotNetClass "System.IO.File").WriteAllBytes caminho ((dotNetClass "System.Convert").FromBase64String ${ms(part.image!.split(',')[1])})\n` }
local textura=Bitmaptexture filename:caminho\ntextura.alphaSource=0;textura.monoOutput=1\nobj.material.base_color_map=textura\n${part.image!.includes('image/png')?'obj.material.cutout_map=textura':''}`:''}
obj.parent=raiz
setUserProp obj "code_buddy_id" "free:${o.id}"
append pecas obj
)`;
}).join('\n')}
raiz.transform=(rotateXMatrix ${o.rotation[0]})*(rotateYMatrix ${o.rotation[1]})*(rotateZMatrix ${o.rotation[2]})*(transMatrix ${vec(o.position)})
${!o.visible?'hide pecas':''}
${o.locked?'freeze pecas':''}
)`;
}
