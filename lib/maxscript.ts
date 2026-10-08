import type {Config} from './generator';
const msString=(value:string)=>'"'+value.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\r\n]/g,' ')+'"';
export function generateMax(c:Config){
  const rgb=[1,3,5].map(i=>parseInt(c.color.slice(i,i+2),16));
  const settings:Record<string,number|boolean>={LARGURA:c.width,PROFUNDIDADE:c.depth,ALTURA:c.height,PAREDE_FUNDO:c.back,PAREDE_ESQUERDA:c.left,PAREDE_DIREITA:c.right,ADICIONAR_LED:c.led,ADICIONAR_BALCAO:c.counter,ADICIONAR_PALCO:c.stage,ADICIONAR_TOTEM:c.totem,ADICIONAR_SPOTS:c.spots,LED_LARGURA:c.ledWidth,LED_ALTURA:c.ledHeight,LED_BASE:c.ledBottom,BALCAO_LARGURA:c.counterWidth,BALCAO_PROFUNDIDADE:c.counterDepth,BALCAO_ALTURA:c.counterHeight,BALCOES:c.counterCount,PALCO_LARGURA:c.stageWidth,PALCO_PROFUNDIDADE:c.stageDepth,PALCO_ALTURA:c.stageHeight,TOTEM_LARGURA:c.totemWidth,TOTEM_PROFUNDIDADE:c.totemDepth,TOTEM_ALTURA:c.totemHeight,TOTENS:c.totemCount,SPOTS_POR_LADO:c.spotsCount};
  const data=c.led&&c.screenImage?c.screenImage.split(',')[1]:'';
  return `-- CODE BUDDY | Cenografia | 3ds Max (Physical Material)
-- Projeto: ${c.name.replace(/[\r\n]/g,' ')}
-- Scripting > Run Script > selecione este arquivo .ms.
-- Medidas em metros, convertidas para as unidades atuais da cena.
-- Reexecutar substitui somente os objetos marcados pelo Code Buddy.
-- Materiais e render dependem do renderizador configurado no 3ds Max.
(
${Object.entries(settings).map(([k,v])=>`local ${k} = ${v}`).join('\n')}
local COR_MARCA = color ${rgb.join(' ')}
local MATERIAL_PISO = ${msString(c.floorMat)}
local MATERIAL_PAREDES = ${msString(c.wallMat)}
local MATERIAL_BALCAO = ${msString(c.counterMat)}
local MATERIAL_PALCO = ${msString(c.stageMat)}
local MATERIAL_TOTEM = ${msString(c.totemMat)}
local IMAGEM_TV = ${msString(data)}
local EXTENSAO_TV = ${msString(c.screenImage.startsWith('data:image/png')?'.png':'.jpg')}
local METRO = units.decodeValue "1m"
local marcaObjetos = "CodeBuddy_Gerado_v2"
local criados = #()

fn cbRegistrar obj =
(
    setUserProp obj "CodeBuddy" marcaObjetos
    append criados obj
    obj
)
fn cbCaixa nome largura profundidade altura x y z mat =
(
    -- A origem do Box fica na base; z representa o centro da peça.
    local obj = box name:("CB_"+nome) width:(largura*METRO) length:(profundidade*METRO) height:(altura*METRO) pos:[x*METRO,y*METRO,(z-altura/2.0)*METRO] mapcoords:true
    obj.material = mat
    cbRegistrar obj
)
fn cbMaterial tipo =
(
    local mat = Physical_Material name:("CB_"+tipo)
    mat.base_color = color 225 225 225
    mat.roughness = .45
    case tipo of
    (
        "brand": (mat.base_color = COR_MARCA)
        "wood":
        (
            mat.base_color = color 160 100 50
            mat.roughness = .55
            local mapa = Noise color1:(color 62 30 12) color2:(color 181 126 68) size:(.12*METRO)
            mapa.coords.tiling = [1,12,1]
            mat.base_color_map = mapa
        )
        "metal": (mat.base_color = color 170 180 195; mat.metalness = 1; mat.roughness = .22)
        "glass": (mat.base_color = color 240 249 255; mat.transparency = 1; mat.trans_ior = 1.45; mat.roughness = .04)
        "concrete":
        (
            mat.base_color = color 115 120 127
            mat.roughness = .85
            mat.base_color_map = Noise color1:(color 85 90 98) color2:(color 145 149 155) size:(.03*METRO)
        )
        "plastic": (mat.base_color = color 207 216 229; mat.roughness = .25)
    )
    mat
)
fn cbTV =
(
    local mat = Physical_Material name:"CB_TV"
    mat.base_color = COR_MARCA
    mat.emission = 1
    mat.emit_color = COR_MARCA
    mat.emit_luminance = 500
    if IMAGEM_TV != "" do
    (
        -- A arte incorporada ao .ms é extraída para uma pasta durável do Max.
        local pasta = (getDir #userScripts)+"/CodeBuddy_Texturas/"
        makeDir pasta
        local guid = ((dotNetClass "System.Guid").NewGuid()).ToString()
        local caminho = pasta+guid+EXTENSAO_TV
        local bytes = (dotNetClass "System.Convert").FromBase64String IMAGEM_TV
        (dotNetClass "System.IO.File").WriteAllBytes caminho bytes
        local mapa = Bitmaptexture filename:caminho
        mat.base_color = color 255 255 255
        mat.emit_color = color 255 255 255
        mat.base_color_map = mapa
        mat.emit_color_map = mapa
    )
    mat
)
fn cbTela largura altura y z mat =
(
    -- Mesh frontal, normal para -Y e UV explícito para a imagem inteira.
    local obj = mesh name:"CB_LED_Tela" vertices:#([-largura/2.0*METRO,y*METRO,(z-altura/2.0)*METRO],[largura/2.0*METRO,y*METRO,(z-altura/2.0)*METRO],[largura/2.0*METRO,y*METRO,(z+altura/2.0)*METRO],[-largura/2.0*METRO,y*METRO,(z+altura/2.0)*METRO]) faces:#([1,2,3],[1,3,4])
    setNumTVerts obj 4
    buildTVFaces obj
    setTVert obj 1 [0,0,0]
    setTVert obj 2 [1,0,0]
    setTVert obj 3 [1,1,0]
    setTVert obj 4 [0,1,0]
    setTVFace obj 1 [1,2,3]
    setTVFace obj 2 [1,3,4]
    update obj
    obj.material = mat
    showTextureMap mat on
    cbRegistrar obj
)
fn cbSpot nome posicao alvo potencia cor =
(
    local destino = cbRegistrar (TargetObject name:("CB_Alvo_"+nome) pos:(alvo*METRO))
    local obj = Targetspot name:("CB_"+nome) pos:(posicao*METRO) target:destino multiplier:potencia rgb:cor hotspot:40 falloff:65
    obj.castShadows = true
    cbRegistrar obj
)

-- Apaga apenas objetos que trazem a marca da geração anterior.
local antigos = for obj in objects where (getUserProp obj "CodeBuddy") == marcaObjetos collect obj
local branco = cbMaterial "white"
local marca = cbMaterial "brand"
local piso = cbMaterial MATERIAL_PISO
local parede = cbMaterial MATERIAL_PAREDES
local balcao = cbMaterial MATERIAL_BALCAO
local palco = cbMaterial MATERIAL_PALCO
local totem = cbMaterial MATERIAL_TOTEM
local tela = if ADICIONAR_LED then cbTV() else undefined
local escuro = cbMaterial "metal"
escuro.base_color = color 30 35 43

undo "Gerar stand Code Buddy" on
(
    if antigos.count > 0 do delete antigos
    cbCaixa "Piso" LARGURA PROFUNDIDADE .1 0 0 .05 piso
    if PAREDE_FUNDO do
    (
        cbCaixa "Parede_Fundo" LARGURA .15 ALTURA 0 (PROFUNDIDADE/2.0-.075) (ALTURA/2.0+.1) parede
        cbCaixa "Faixa_Marca" (LARGURA-.3) .025 .22 0 (PROFUNDIDADE/2.0-.165) (ALTURA-.15) marca
    )
    if PAREDE_ESQUERDA do cbCaixa "Parede_Esquerda" .15 PROFUNDIDADE ALTURA (-LARGURA/2.0+.075) 0 (ALTURA/2.0+.1) parede
    if PAREDE_DIREITA do cbCaixa "Parede_Direita" .15 PROFUNDIDADE ALTURA (LARGURA/2.0-.075) 0 (ALTURA/2.0+.1) parede
    if ADICIONAR_LED do
    (
        local y = PROFUNDIDADE/2.0-.35
        local z = .1+LED_BASE+LED_ALTURA/2.0
        cbCaixa "LED_Moldura" (LED_LARGURA+.12) .12 (LED_ALTURA+.12) 0 y z escuro
        cbTela LED_LARGURA LED_ALTURA (y-.075) z tela
        if not PAREDE_FUNDO do for sinal in #(-1,1) do
        (
            local x = sinal*LED_LARGURA*.4
            cbCaixa "LED_Suporte" .09 .09 LED_BASE x y (.1+LED_BASE/2.0) escuro
            cbCaixa "LED_Base" .45 .5 .06 x y .13 escuro
        )
    )
    if ADICIONAR_BALCAO do for i = 1 to BALCOES do
    (
        local x = (i-1-(BALCOES-1)/2.0)*(BALCAO_LARGURA+.4)
        local y = -PROFUNDIDADE*.28
        cbCaixa "Balcao_Corpo" BALCAO_LARGURA BALCAO_PROFUNDIDADE (BALCAO_ALTURA-.06) x y (.1+(BALCAO_ALTURA-.06)/2.0) balcao
        cbCaixa "Balcao_Tampo" (BALCAO_LARGURA+.08) (BALCAO_PROFUNDIDADE+.08) .06 x y (.1+BALCAO_ALTURA-.03) branco
    )
    if ADICIONAR_PALCO do cbCaixa "Palco" PALCO_LARGURA PALCO_PROFUNDIDADE PALCO_ALTURA 0 (PROFUNDIDADE*.18) (.1+PALCO_ALTURA/2.0) palco
    if ADICIONAR_TOTEM do for i = 1 to TOTENS do
    (
        local x = (i-1-(TOTENS-1)/2.0)*(TOTEM_LARGURA+.5)
        local y = -PROFUNDIDADE*.07
        cbCaixa "Totem" TOTEM_LARGURA TOTEM_PROFUNDIDADE TOTEM_ALTURA x y (.1+TOTEM_ALTURA/2.0) totem
        cbCaixa "Totem_Base" (TOTEM_LARGURA+.15) (TOTEM_PROFUNDIDADE+.2) .06 x y .13 escuro
    )
    cbSpot "Luz_Principal" [0,-PROFUNDIDADE*.6,ALTURA+3] [0,0,1] 1.2 (color 255 245 235)
    cbSpot "Luz_Preenchimento" [LARGURA/2.0,0,ALTURA+1] [0,0,1] .6 (color 220 230 255)
    if ADICIONAR_SPOTS do for sinal in #(-1,1) do
    (
        local x = sinal*(LARGURA/2.0-.35)
        cbCaixa "Poste_Luz" .07 .07 ALTURA x (PROFUNDIDADE/2.0-.35) (ALTURA/2.0+.1) escuro
        cbCaixa "Trilho_Spots" .07 (PROFUNDIDADE-.5) .07 x 0 (ALTURA+.1) escuro
        for i = 1 to SPOTS_POR_LADO do
        (
            local y = if SPOTS_POR_LADO == 1 then 0 else -PROFUNDIDADE*.27+(i-1)*(PROFUNDIDADE*.54/(SPOTS_POR_LADO-1))
            cbSpot "Spot_Lateral" [x,y,ALTURA] [sinal*LARGURA*.15,y,.1] .65 (color 255 214 166)
            cbCaixa "Spot_Corpo" .15 .15 .2 x y (ALTURA+.05) escuro
        )
    )
    local distancia = amax (PROFUNDIDADE*1.8) (LARGURA*1.35)
    local destino = cbRegistrar (TargetObject name:"CB_Alvo_Camera" pos:[0,0,ALTURA*.35*METRO])
    local camera = cbRegistrar (TargetCamera name:"CB_Camera_Frontal" pos:[0,-distancia*METRO,ALTURA*1.45*METRO] target:destino)
    local tamanho = amax #(LARGURA*1.25,PROFUNDIDADE*1.4,ALTURA*2.5)
    camera.fov = 2*atan(tamanho/(2*distancia))
    renderWidth = 1920
    renderHeight = 1080
)
select criados
max zoomext sel all
format "Code Buddy: stand criado. Selecione CB_Camera_Frontal para visualizar.\\n"
)
`;
}
