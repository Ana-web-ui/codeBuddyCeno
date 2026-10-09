import { generateMax } from './maxscript';
export type MaterialKind = 'white' | 'brand' | 'wood' | 'metal' | 'glass' | 'concrete' | 'plastic';
export type Target = 'blender' | 'max';
export const materials: {value: MaterialKind; label:string; color:string}[] = [
  {value:'white',label:'Pintura branca',color:'#c8cedb'}, {value:'brand',label:'Cor de destaque',color:'#5268ff'},
  {value:'wood',label:'Madeira',color:'#a87542'}, {value:'metal',label:'Metal',color:'#8d99a8'},
  {value:'glass',label:'Vidro',color:'#81bfce'}, {value:'concrete',label:'Concreto',color:'#747b86'},
  {value:'plastic',label:'Plástico',color:'#c4d1e1'}
];
export type Config = {
  name: string; width: number; depth: number; height: number; color: string; target: Target;
  back: boolean; left: boolean; right: boolean; led: boolean;
  counter: boolean; stage: boolean; totem: boolean; spots: boolean;
  ledWidth: number; ledHeight: number; ledBottom: number;
  counterWidth: number; counterDepth:number; counterHeight:number; counterCount:number;
  stageWidth:number; stageDepth:number; stageHeight:number;
  totemWidth:number; totemDepth:number; totemHeight:number; totemCount:number; spotsCount:number;
  floorMat:MaterialKind; wallMat:MaterialKind; counterMat:MaterialKind; stageMat:MaterialKind; totemMat:MaterialKind;
  screenImage:string; screenName:string;
};
export const defaults: Config = { name: 'Meu primeiro stand', width: 10, depth: 5, height: 3.5, color: '#5268ff', target:'blender', back: true, left: false, right: false, led: true, counter: true, stage: false, totem: false, spots: true,
 ledWidth:4,ledHeight:2,ledBottom:.65,counterWidth:2,counterDepth:.65,counterHeight:1,counterCount:1,
 stageWidth:4.5,stageDepth:1.4,stageHeight:.3,totemWidth:.55,totemDepth:.25,totemHeight:1.8,totemCount:1,spotsCount:3,
 floorMat:'white',wallMat:'white',counterMat:'brand',stageMat:'metal',totemMat:'brand',screenImage:'',screenName:'' };
export function geometry(c: Config) {
  return {ledW:c.ledWidth,ledH:c.ledHeight,ledZ:.1+c.ledBottom+c.ledHeight/2,
    counterW:c.counterWidth,stageW:c.stageWidth,stageD:c.stageDepth,stageY:c.depth*.18,counterY:-c.depth*.28,
    counterXs:Array.from({length:Math.min(6,Math.max(0,c.counterCount||0))},(_,i)=>(i-(c.counterCount-1)/2)*(c.counterWidth+.4)),
    totemXs:Array.from({length:Math.min(6,Math.max(0,c.totemCount||0))},(_,i)=>(i-(c.totemCount-1)/2)*(c.totemWidth+.5)),totemY:-c.depth*.07,
    spotYs:Array.from({length:Math.min(10,Math.max(0,c.spotsCount||0))},(_,i)=>c.spotsCount===1?0:-c.depth*.27+i*(c.depth*.54/(c.spotsCount-1)))};
}
export function validate(c: Config) {
  if (!c.name.trim() || c.name.length > 80) throw new Error('Dê um nome ao projeto, com até 80 caracteres.');
  for (const k of ['width', 'depth', 'height'] as const) {
    const min = k === 'height' ? 2 : 3; const max = k === 'height' ? 8 : 30;
    if (!Number.isFinite(c[k]) || c[k] < min || c[k] > max) throw new Error(k === 'height' ? 'A altura deve estar entre 2 e 8 m.' : 'Largura e profundidade devem estar entre 3 e 30 m.');
  }
  if (!/^#[0-9a-f]{6}$/i.test(c.color)) throw new Error('Escolha uma cor válida.');
  if(!['blender','max'].includes(c.target)) throw new Error('Escolha Blender ou 3ds Max.');
  for (const k of ['back', 'left', 'right', 'led', 'counter', 'stage', 'totem', 'spots'] as const) if (typeof c[k] !== 'boolean') throw new Error('Seleção de elementos inválida.');
  for(const [key, initial] of Object.entries(defaults)) if(typeof initial==='number'&&(!Number.isFinite(c[key as keyof Config] as number))) throw new Error('Confira os parâmetros dos elementos: todas as medidas e quantidades devem conter números.');
  for(const k of ['floorMat','wallMat','counterMat','stageMat','totemMat'] as const) if(!materials.some(m=>m.value===c[k])) throw new Error('Material inválido.');
  const check=(keys:(keyof Config)[],label:string)=>{for(const k of keys)if(typeof c[k]!=='number'||!Number.isFinite(c[k])||(c[k] as number)<.1||(c[k] as number)>30)throw new Error('Confira as medidas de '+label+' (mínimo 0,1 m).');};
  const count=(value:number,label:string,max:number)=>{if(!Number.isInteger(value)||value<1||value>max)throw new Error(label+': use uma quantidade inteira de 1 a '+max+'.');};
  if(c.led){check(['ledWidth','ledHeight'],'LED');if(!Number.isFinite(c.ledBottom)||c.ledBottom<.1||c.ledBottom>8)throw new Error('A altura da base do LED deve ser de 0,1 a 8 m.');if(c.ledWidth+.24>c.width-.3||c.ledBottom+c.ledHeight+.06>c.height)throw new Error('O LED deve caber na largura e na altura do stand, incluindo a moldura.');}
  if(c.counter){check(['counterWidth','counterDepth','counterHeight'],'balcão');count(c.counterCount,'Balcões',6);if(c.counterHeight>c.height)throw new Error('O balcão deve ser menor que a altura do stand.');}
  if(c.stage){check(['stageWidth','stageDepth','stageHeight'],'palco');if(c.stageHeight>Math.min(1,c.height))throw new Error('A altura do palco deve ser de 0,1 a 1 m.');}
  if(c.totem){check(['totemWidth','totemDepth','totemHeight'],'totem');count(c.totemCount,'Totens',6);if(c.totemHeight>c.height)throw new Error('O totem deve caber na altura do stand.');}
  if(c.spots)count(c.spotsCount,'Spots por lado',10);
  const g=geometry(c);const rects:{label:string;x:number;y:number;w:number;d:number}[]=[];
  if(c.counter)g.counterXs.forEach(x=>rects.push({label:'balcão',x,y:g.counterY,w:c.counterWidth+.08,d:c.counterDepth+.08}));
  if(c.totem)g.totemXs.forEach(x=>rects.push({label:'totem',x,y:g.totemY,w:c.totemWidth+.15,d:c.totemDepth+.2}));
  if(c.stage)rects.push({label:'palco',x:0,y:g.stageY,w:c.stageWidth,d:c.stageDepth});
  for(const r of rects)if(Math.abs(r.x)+r.w/2>c.width/2-.2||Math.abs(r.y)+r.d/2>c.depth/2-.5)throw new Error('As medidas ou quantidades de '+r.label+' ultrapassam o espaço disponível. Reduza o tamanho ou a quantidade.');
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];if(Math.abs(a.x-b.x)<(a.w+b.w)/2+.1&&Math.abs(a.y-b.y)<(a.d+b.d)/2+.1)throw new Error('Há sobreposição entre '+a.label+' e '+b.label+'. Reduza suas medidas.');}
  if(c.screenImage&&(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(c.screenImage)||c.screenImage.length>2800000))throw new Error('Use uma imagem JPG ou PNG de até 2 MB.');
  return c;
}
export function filename(c: Config) { return (c.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'stand') + (c.target==='max'?'.ms':'.py'); }
export function generate(c:Config) {validate(c);return c.target==='max'?generateMax(c):generateBlender(c);}
export function generateBlender(c: Config) {
  validate(c);
  const rgb = [1,3,5].map(i=> +(parseInt(c.color.slice(i,i+2),16)/255).toFixed(5));
  return `# CODE BUDDY | Cenografia
# Modelo conceitual em metros. Projeto: ${c.name.replace(/[\r\n]/g, ' ')}
# Blender: Scripting > New > cole este código > Run Script.
# Reexecutar substitui apenas a coleção CodeBuddy_Gerado.
# LARGURA, PROFUNDIDADE e ALTURA controlam as medidas principais.
import bpy
import math
import base64
import tempfile
import os
from mathutils import Vector

LARGURA = ${c.width}
PROFUNDIDADE = ${c.depth}
ALTURA = ${c.height}
COR_MARCA = (${rgb.join(', ')}, 1)
PAREDE_FUNDO = ${c.back ? 'True' : 'False'}
PAREDE_ESQUERDA = ${c.left ? 'True' : 'False'}
PAREDE_DIREITA = ${c.right ? 'True' : 'False'}
ADICIONAR_LED = ${c.led ? 'True' : 'False'}
ADICIONAR_BALCAO = ${c.counter ? 'True' : 'False'}
ADICIONAR_PALCO = ${c.stage ? 'True' : 'False'}
ADICIONAR_TOTEM = ${c.totem ? 'True' : 'False'}
ADICIONAR_SPOTS = ${c.spots ? 'True' : 'False'}

LED_LARGURA = ${c.ledWidth}
LED_ALTURA = ${c.ledHeight}
LED_BASE = ${c.ledBottom}
BALCAO_LARGURA = ${c.counterWidth}
BALCAO_PROFUNDIDADE = ${c.counterDepth}
BALCAO_ALTURA = ${c.counterHeight}
BALCOES = ${c.counterCount}
PALCO_LARGURA = ${c.stageWidth}
PALCO_PROFUNDIDADE = ${c.stageDepth}
PALCO_ALTURA = ${c.stageHeight}
TOTEM_LARGURA = ${c.totemWidth}
TOTEM_PROFUNDIDADE = ${c.totemDepth}
TOTEM_ALTURA = ${c.totemHeight}
TOTENS = ${c.totemCount}
SPOTS_POR_LADO = ${c.spotsCount}
MATERIAL_PISO = '${c.floorMat}'
MATERIAL_PAREDES = '${c.wallMat}'
MATERIAL_BALCAO = '${c.counterMat}'
MATERIAL_PALCO = '${c.stageMat}'
MATERIAL_TOTEM = '${c.totemMat}'
IMAGEM_TV = '${c.led?c.screenImage:''}'

COLECAO = 'CodeBuddy_Gerado'
colecao = None

def preparar():
    global colecao
    antiga = bpy.data.collections.get(COLECAO)
    if antiga:
        for objeto in list(antiga.all_objects):
            bpy.data.objects.remove(objeto, do_unlink=True)
        bpy.data.collections.remove(antiga)
    colecao = bpy.data.collections.new(COLECAO)
    bpy.context.scene.collection.children.link(colecao)
    cena = bpy.context.scene
    cena.unit_settings.system = 'METRIC'
    cena.unit_settings.scale_length = 1.0

def organizar(objeto):
    for origem in list(objeto.users_collection):
        origem.objects.unlink(objeto)
    colecao.objects.link(objeto)
    return objeto

def material(nome, cor, emissao=0):
    # Reutiliza materiais nas próximas execuções.
    mat = bpy.data.materials.get('CB_' + nome) or bpy.data.materials.new('CB_' + nome)
    mat.diffuse_color = cor
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    saida = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(shader.outputs['BSDF'], saida.inputs['Surface'])
    shader.inputs['Base Color'].default_value = cor
    shader.inputs['Roughness'].default_value = 0.45
    entrada = shader.inputs.get('Emission Color')
    if entrada is None:
        entrada = shader.inputs.get('Emission')
    if entrada is not None:
        entrada.default_value = cor
    forca = shader.inputs.get('Emission Strength')
    if forca is not None:
        forca.default_value = emissao
    return mat

def acabamento(tipo):
    cores = {'white': (0.88, 0.88, 0.88, 1), 'brand': COR_MARCA,
             'wood': (0.42, 0.20, 0.075, 1), 'metal': (0.58, 0.62, 0.68, 1),
             'glass': (0.92, 0.97, 1, 1), 'concrete': (0.38, 0.4, 0.43, 1),
             'plastic': (0.78, 0.82, 0.88, 1)}
    mat = material('Acabamento_' + tipo, cores[tipo])
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Roughness'].default_value = {'metal': .22, 'glass': .04, 'wood': .55, 'concrete': .85, 'plastic': .25}.get(tipo, .45)
    if tipo == 'metal':
        shader.inputs['Metallic'].default_value = 1
    if tipo == 'glass':
        entrada = shader.inputs.get('Transmission Weight')
        if entrada is None:
            entrada = shader.inputs.get('Transmission')
        if entrada is not None:
            entrada.default_value = 1
        shader.inputs['IOR'].default_value = 1.45
    if tipo in ['wood', 'concrete']:
        coord = nodes.new('ShaderNodeTexCoord')
        textura = nodes.new('ShaderNodeTexNoise')
        textura.inputs['Scale'].default_value = 6 if tipo == 'wood' else 35
        textura.inputs['Detail'].default_value = 3
        if tipo == 'wood':
            escala = nodes.new('ShaderNodeVectorMath')
            escala.operation = 'MULTIPLY'
            escala.inputs[1].default_value = (3, 45, 3)
            links.new(coord.outputs['Generated'], escala.inputs[0])
            links.new(escala.outputs['Vector'], textura.inputs['Vector'])
        else:
            links.new(coord.outputs['Generated'], textura.inputs['Vector'])
        rampa = nodes.new('ShaderNodeValToRGB')
        rampa.color_ramp.elements[0].color = (0.12, .045, .015, 1) if tipo == 'wood' else (.27, .28, .3, 1)
        rampa.color_ramp.elements[1].color = (.58, .32, .12, 1) if tipo == 'wood' else (.48, .5, .53, 1)
        links.new(textura.outputs['Fac'], rampa.inputs['Fac'])
        links.new(rampa.outputs['Color'], shader.inputs['Base Color'])
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .15
        bump.inputs['Distance'].default_value = .003
        links.new(textura.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat

def material_tv():
    mat = material('LED', COR_MARCA, 2)
    if not IMAGEM_TV:
        return mat
    mime, dados = IMAGEM_TV.split(',', 1)
    sufixo = '.png' if 'image/png' in mime else '.jpg'
    caminho = None
    try:
        with tempfile.NamedTemporaryFile(suffix=sufixo, delete=False) as arquivo:
            caminho = arquivo.name
            arquivo.write(base64.b64decode(dados))
        imagem = bpy.data.images.load(caminho, check_existing=False)
        imagem.name = 'CB_Textura_TV'
        imagem.pack()
        textura = mat.node_tree.nodes.new('ShaderNodeTexImage')
        textura.image = imagem
        shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        mat.node_tree.links.new(textura.outputs['Color'], shader.inputs['Base Color'])
        entrada = shader.inputs.get('Emission Color')
        if entrada is None:
            entrada = shader.inputs.get('Emission')
        if entrada is not None:
            mat.node_tree.links.new(textura.outputs['Color'], entrada)
    finally:
        if caminho and os.path.exists(caminho):
            os.remove(caminho)
    return mat

def tela_tv(largura, altura, y, z, mat):
    # Face frontal com UV explícito: a arte aparece inteira e sem espelhamento.
    mesh = bpy.data.meshes.new('CB_Tela_Mesh')
    mesh.from_pydata([(-largura/2, y, z-altura/2), (largura/2, y, z-altura/2),
                     (largura/2, y, z+altura/2), (-largura/2, y, z+altura/2)], [], [(0,1,2,3)])
    mesh.update()
    obj = bpy.data.objects.new('LED_Tela', mesh)
    colecao.objects.link(obj)
    mesh.materials.append(mat)
    uv = mesh.uv_layers.new(name='UVMap')
    for i, valor in enumerate([(0,0), (1,0), (1,1), (0,1)]):
        uv.data[i].uv = valor

def caixa(nome, dimensoes, posicao, mat, arredondar=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=posicao)
    obj = organizar(bpy.context.object)
    obj.name = nome
    obj.dimensions = dimensoes
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if arredondar:
        bevel = obj.modifiers.new('Bordas suaves', 'BEVEL')
        bevel.width = arredondar
        bevel.segments = 3
    return obj

def apontar(objeto, alvo):
    direcao = Vector(alvo) - objeto.location
    objeto.rotation_euler = direcao.to_track_quat('-Z', 'Y').to_euler()

def luz(nome, tipo, posicao, alvo, energia, cor=(1, 1, 1), tamanho=4):
    dados = bpy.data.lights.new(nome, tipo)
    dados.energy = energia
    dados.color = cor
    obj = bpy.data.objects.new(nome, dados)
    colecao.objects.link(obj)
    obj.location = posicao
    apontar(obj, alvo)
    if tipo == 'AREA':
        dados.shape = 'DISK'
        dados.size = tamanho
    if tipo == 'SPOT':
        dados.spot_size = math.radians(65)
        dados.spot_blend = 0.5
        dados.shadow_soft_size = 0.15
    return obj

def criar_estrutura(branco, marca):
    caixa('Piso', (LARGURA, PROFUNDIDADE, 0.1), (0, 0, 0.05), acabamento(MATERIAL_PISO), 0.02)
    if PAREDE_FUNDO:
        caixa('Parede_Fundo', (LARGURA, 0.15, ALTURA), (0, PROFUNDIDADE/2 - 0.075, ALTURA/2 + 0.1), acabamento(MATERIAL_PAREDES))
        caixa('Faixa_Marca', (LARGURA - 0.3, 0.025, 0.22), (0, PROFUNDIDADE/2 - 0.165, ALTURA - 0.15), marca)
    for nome, ativo, sinal in [('Esquerda', PAREDE_ESQUERDA, -1), ('Direita', PAREDE_DIREITA, 1)]:
        if ativo:
            caixa('Parede_' + nome, (0.15, PROFUNDIDADE, ALTURA), (sinal*(LARGURA/2 - 0.075), 0, ALTURA/2 + 0.1), acabamento(MATERIAL_PAREDES))

def criar_elementos(branco, marca, escuro, tela):
    if ADICIONAR_LED:
        largura_led = LED_LARGURA
        altura_led = LED_ALTURA
        y = PROFUNDIDADE/2 - 0.35
        z = 0.1 + LED_BASE + LED_ALTURA/2
        caixa('LED_Moldura', (largura_led + 0.12, 0.12, altura_led + 0.12), (0, y, z), escuro, 0.02)
        tela_tv(largura_led, altura_led, y - 0.075, z, tela)
        if not PAREDE_FUNDO:
            for x in [-largura_led*0.4, largura_led*0.4]:
                suporte_h = z - altura_led/2 - 0.1
                caixa('LED_Suporte', (0.09, 0.09, suporte_h), (x, y, 0.1 + suporte_h/2), escuro)
                caixa('LED_Base', (0.45, 0.5, 0.06), (x, y, 0.13), escuro)
    if ADICIONAR_BALCAO:
        for i in range(BALCOES):
            x = (i - (BALCOES-1)/2)*(BALCAO_LARGURA + .4)
            y = -PROFUNDIDADE*.28
            caixa('Balcao_Corpo', (BALCAO_LARGURA, BALCAO_PROFUNDIDADE, BALCAO_ALTURA-.06), (x, y, .1+(BALCAO_ALTURA-.06)/2), acabamento(MATERIAL_BALCAO), .02)
            caixa('Balcao_Tampo', (BALCAO_LARGURA+.08, BALCAO_PROFUNDIDADE+.08, .06), (x, y, .1+BALCAO_ALTURA-.03), branco, .02)
    if ADICIONAR_PALCO:
        caixa('Palco', (PALCO_LARGURA, PALCO_PROFUNDIDADE, PALCO_ALTURA), (0, PROFUNDIDADE*.18, .1+PALCO_ALTURA/2), acabamento(MATERIAL_PALCO), .02)
    if ADICIONAR_TOTEM:
        for i in range(TOTENS):
            x = (i - (TOTENS-1)/2)*(TOTEM_LARGURA + .5)
            y = -PROFUNDIDADE*.07
            caixa('Totem', (TOTEM_LARGURA, TOTEM_PROFUNDIDADE, TOTEM_ALTURA), (x, y, .1+TOTEM_ALTURA/2), acabamento(MATERIAL_TOTEM), .02)
            caixa('Totem_Base', (TOTEM_LARGURA+.15, TOTEM_PROFUNDIDADE+.2, .06), (x, y, .13), escuro, .01)

def criar_iluminacao(escuro):
    # Luz ampla para o render e spots laterais opcionais.
    luz('Luz_Principal', 'AREA', (0, -PROFUNDIDADE*0.6, ALTURA + 3), (0, 0, 1), max(1000, LARGURA*PROFUNDIDADE*60), tamanho=max(LARGURA, PROFUNDIDADE))
    luz('Luz_Preenchimento', 'AREA', (LARGURA/2, 0, ALTURA + 1), (0, 0, 1), max(600, LARGURA*PROFUNDIDADE*25), tamanho=max(3, PROFUNDIDADE))
    if ADICIONAR_SPOTS:
        # Trilhos independentes, mesmo sem paredes laterais.
        for sinal in [-1, 1]:
            x = sinal*(LARGURA/2 - 0.35)
            caixa('Poste_Luz', (0.07, 0.07, ALTURA), (x, PROFUNDIDADE/2 - 0.35, ALTURA/2 + 0.1), escuro)
            caixa('Trilho_Spots', (0.07, PROFUNDIDADE - 0.5, 0.07), (x, 0, ALTURA + 0.1), escuro)
            for i in range(SPOTS_POR_LADO):
                y = 0 if SPOTS_POR_LADO == 1 else -PROFUNDIDADE*.27 + i*(PROFUNDIDADE*.54/(SPOTS_POR_LADO-1))
                alvo = (sinal*LARGURA*0.15, y, 0.1)
                spot = luz('Spot_Lateral', 'SPOT', (x, y, ALTURA), alvo, 250, (1, 0.84, 0.65))
                caixa('Spot_Corpo', (0.15, 0.15, 0.2), (x, y, ALTURA + 0.05), escuro, 0.02)

def configurar_render():
    cena = bpy.context.scene
    bpy.ops.object.camera_add(location=(0, -max(PROFUNDIDADE*1.8, LARGURA*1.35), ALTURA*1.45))
    camera = organizar(bpy.context.object)
    camera.name = 'Camera_Frontal'
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = max(LARGURA*1.25, PROFUNDIDADE*1.4, ALTURA*2.5)
    apontar(camera, (0, 0, ALTURA*0.35))
    cena.camera = camera
    cena.render.engine = 'CYCLES'
    cena.cycles.samples = 64
    cena.cycles.use_denoising = True
    cena.render.resolution_x = 1920
    cena.render.resolution_y = 1080
    cena.render.resolution_percentage = 100
    mundo = bpy.data.worlds.get('CB_Mundo') or bpy.data.worlds.new('CB_Mundo')
    cena.world = mundo
    mundo.use_nodes = True
    fundo = mundo.node_tree.nodes.get('Background')
    fundo.inputs['Color'].default_value = (0.12, 0.14, 0.2, 1)
    fundo.inputs['Strength'].default_value = 0.4

def gerar_stand():
    preparar()
    branco = material('Branco', (0.88, 0.88, 0.88, 1))
    marca = material('Marca', COR_MARCA)
    escuro = material('Grafite', (0.025, 0.03, 0.045, 1))
    tela = material_tv()
    criar_estrutura(branco, marca)
    criar_elementos(branco, marca, escuro, tela)
    criar_iluminacao(escuro)
    configurar_render()
    print('Code Buddy: stand pronto. Use NumPad 0 para a câmera e F12 para renderizar.')

gerar_stand()
`;
}
