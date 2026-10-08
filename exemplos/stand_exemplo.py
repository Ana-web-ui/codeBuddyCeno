# CODE BUDDY | Cenografia
# Modelo conceitual em metros. Projeto: Meu primeiro stand
# Blender: Scripting > New > cole este código > Run Script.
# Reexecutar substitui apenas a coleção CodeBuddy_Gerado.
# LARGURA, PROFUNDIDADE e ALTURA controlam as medidas principais.
import bpy
import math
from mathutils import Vector

LARGURA = 10
PROFUNDIDADE = 5
ALTURA = 3.5
COR_MARCA = (0.32157, 0.40784, 1, 1)
PAREDE_FUNDO = True
PAREDE_ESQUERDA = False
PAREDE_DIREITA = False
ADICIONAR_LED = True
ADICIONAR_BALCAO = True
ADICIONAR_PALCO = False
ADICIONAR_TOTEM = False
ADICIONAR_SPOTS = True

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
    shader = mat.node_tree.nodes.get('Principled BSDF')
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
    caixa('Piso', (LARGURA, PROFUNDIDADE, 0.1), (0, 0, 0.05), branco, 0.02)
    if PAREDE_FUNDO:
        caixa('Parede_Fundo', (LARGURA, 0.15, ALTURA), (0, PROFUNDIDADE/2 - 0.075, ALTURA/2 + 0.1), branco)
        caixa('Faixa_Marca', (LARGURA - 0.3, 0.025, 0.22), (0, PROFUNDIDADE/2 - 0.165, ALTURA - 0.15), marca)
    for nome, ativo, sinal in [('Esquerda', PAREDE_ESQUERDA, -1), ('Direita', PAREDE_DIREITA, 1)]:
        if ativo:
            caixa('Parede_' + nome, (0.15, PROFUNDIDADE, ALTURA), (sinal*(LARGURA/2 - 0.075), 0, ALTURA/2 + 0.1), branco)

def criar_elementos(branco, marca, escuro, tela):
    if ADICIONAR_LED:
        largura_led = min(4, LARGURA*0.55)
        altura_led = min(2, ALTURA*0.48)
        y = PROFUNDIDADE/2 - 0.35
        z = 0.1 + ALTURA*0.56
        caixa('LED_Moldura', (largura_led + 0.12, 0.12, altura_led + 0.12), (0, y, z), escuro, 0.02)
        caixa('LED_Tela', (largura_led, 0.025, altura_led), (0, y - 0.075, z), tela)
        if not PAREDE_FUNDO:
            for x in [-largura_led*0.4, largura_led*0.4]:
                suporte_h = z - altura_led/2 - 0.1
                caixa('LED_Suporte', (0.09, 0.09, suporte_h), (x, y, 0.1 + suporte_h/2), escuro)
                caixa('LED_Base', (0.45, 0.5, 0.06), (x, y, 0.13), escuro)
    if ADICIONAR_BALCAO:
        largura = min(2, LARGURA*0.25)
        x, y = -LARGURA*0.22, -PROFUNDIDADE*0.28
        caixa('Balcao_Corpo', (largura, 0.65, 0.95), (x, y, 0.575), marca, 0.03)
        caixa('Balcao_Tampo', (largura + 0.08, 0.73, 0.06), (x, y, 1.08), branco, 0.02)
    if ADICIONAR_PALCO:
        caixa('Palco', (LARGURA*0.45, min(2, PROFUNDIDADE*0.28), 0.3), (0, PROFUNDIDADE*0.15, 0.25), escuro, 0.02)
    if ADICIONAR_TOTEM:
        x, y = LARGURA*0.32, -PROFUNDIDADE*0.15
        caixa('Totem', (0.55, 0.25, 1.8), (x, y, 1), marca, 0.02)
        caixa('Totem_Base', (0.7, 0.45, 0.06), (x, y, 0.13), escuro, 0.01)

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
            for y in [-PROFUNDIDADE*0.27, 0, PROFUNDIDADE*0.27]:
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
    tela = material('LED', COR_MARCA, 2)
    criar_estrutura(branco, marca)
    criar_elementos(branco, marca, escuro, tela)
    criar_iluminacao(escuro)
    configurar_render()
    print('Code Buddy: stand pronto. Use NumPad 0 para a câmera e F12 para renderizar.')

gerar_stand()
