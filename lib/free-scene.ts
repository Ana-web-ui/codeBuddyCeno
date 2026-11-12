import type { SupplierMount, ScreenOrientation } from './supplier-products';
import { getSupplierProduct, supplierObjectSize } from './supplier-products';
import { artworkImageSize } from './branding-image';
import { parseObj } from './imported-models';
export type V3 = [number, number, number];
export type FreeKind = 'wall' | 'box' | 'cylinder' | 'floor' | 'counter' | 'stage' | 'led' | 'text' | 'shelf' | 'showcase' | 'roundTable' | 'bistro' | 'chair' | 'armchair' | 'puff' | 'coffeeTable' | 'backdrop' | 'obj' | 'supplierTotem';
export type FreeObject = {
    originalSize?: V3;
    productId?: string;
    mount?: SupplierMount;
    screenOrientation?: ScreenOrientation;
    id: number; kind: FreeKind; name: string; position: V3; rotation: V3; size: V3;
    color: string; visible: boolean; locked: boolean; text: string; image: string;
    source: string; objUnit: 'm'|'cm'|'mm'; upAxis: 'z'|'y'; shelves: number; roughness: number; opacity: number;
};
export const freeEnvironments = {
    white: 'Branco padrão',
    outdoors: 'Céu azul aberto com grama',
    hotel: 'Hall de hotel',
    pavilion: 'Pavilhão cinza',
} as const;
export type FreeEnvironment = keyof typeof freeEnvironments;
export type FreeGroup = { id: number; name: string; objectIds: number[] };
export type WallLink = [number, number];
export type FreeScene = { name: string; grid: boolean; gridSize: number; environment?: FreeEnvironment; view: '3d'|'plan'; objects: FreeObject[]; groups?: FreeGroup[]; wallLinks?: WallLink[] };
export const MAX_FREE_SCENE_BYTES = 10*1024*1024;
export const freeCatalog: {kind: FreeKind; label: string; size: V3; color: string}[] = [
    {kind:'wall',label:'Parede',size:[3,.12,3],color:'#e1e4eb'},
    {kind:'box',label:'Bloco',size:[1,1,1],color:'#8298d6'},
    {kind:'cylinder',label:'Cilindro',size:[.8,.8,1],color:'#8aa6ba'},
    {kind:'floor',label:'Piso',size:[8,6,.1],color:'#ede7df'},
    {kind:'counter',label:'Balcão',size:[2,.65,1],color:'#596edc'},
    {kind:'stage',label:'Palco',size:[4,2,.3],color:'#454e60'},
    {kind:'led',label:'Painel de LED',size:[3,.12,2.8],color:'#465bdd'},
    {kind:'text',label:'Texto',size:[3,.02,.6],color:'#243657'},
    {kind:'backdrop',label:'Painel / backdrop',size:[3,.45,2.5],color:'#6279dc'},
    {kind:'shelf',label:'Estante',size:[1.5,.4,2],color:'#a87c53'},
    {kind:'showcase',label:'Vitrine',size:[1,.55,1.5],color:'#6279dc'},
    {kind:'roundTable',label:'Mesa redonda',size:[1.2,1.2,.75],color:'#d2b38b'},
    {kind:'bistro',label:'Mesa bistrô',size:[.7,.7,1.05],color:'#d2b38b'},
    {kind:'chair',label:'Cadeira',size:[.5,.52,.85],color:'#6a82a7'},
    {kind:'armchair',label:'Poltrona',size:[.85,.8,.85],color:'#78988d'},
    {kind:'puff',label:'Puff',size:[.6,.6,.42],color:'#b8a4bb'},
    {kind:'coffeeTable',label:'Mesa de centro',size:[1,.6,.42],color:'#bc9875'},
];
export function emptyFreeScene(): FreeScene { return {name:'Cena sem título',grid:true,gridSize:20,environment:'white',view:'3d',objects:[]}; }
/** A stand-base uses ordinary pieces, so it can be edited and exported like any free scene. */
export function createStandBase(depth: 3 | 6): FreeScene {
    const width = 3;
    const floor = newFreeObject('floor', 1);
    floor.size = [width, depth, floor.size[2]];

    const wall = newFreeObject('wall', 2);
    wall.size[0] = width;
    wall.position[1] = (depth - wall.size[1]) / 2;

    const counter = newFreeObject('counter', 3);
    counter.position[1] = -depth / 2 + 0.85;

    return { ...emptyFreeScene(), name: `Stand ${width} × ${depth} m`, objects: [floor, wall, counter] };
}

export function newFreeObject(kind: FreeKind, id: number, productId?: string): FreeObject {
    const item=freeCatalog.find(item=>item.kind===kind);
    if (kind === 'supplierTotem') {
        const product = getSupplierProduct(productId);
        if (!product) throw new Error('Modelo de fornecedor desconhecido.');
        return {
            ...newFreeObject('box', id),
            kind,
            productId: product.id,
            name: (product.display ? 'Tela ' : 'Totem ') + product.supplier + ' ' + product.model,
            ...(product.display ? { mount: product.display.defaultMount, screenOrientation: 'horizontal' as const } : {}),
            size: supplierObjectSize(product),
            color: '#202124',
        };
    }
    if (!item && kind!=='obj') throw new Error('Tipo de peça inválido.');
    // O piso cresce para baixo da cota zero, onde as demais peças se apoiam.
    const height = item?.size[2] ?? 0;
    const z = kind === 'floor' ? -height : kind === 'led' ? -height * .35 : 0;
    return {id,kind,name:item?.label ?? 'Objeto 3D',position:[0,0,z],rotation:[0,0,0],size:[...(item?.size ?? [1,1,1])],
        color:item?.color ?? '#8f9cb2',visible:true,locked:false,text:kind==='text'?'Sua marca':'',image:'',source:'',objUnit:'m',upAxis:'z',shelves:3,roughness:.55,opacity:1};
}
const objectKeys=Object.keys(newFreeObject('box',1)).sort().join(',');
const isRecord=(v:unknown):v is Record<string,unknown>=>!!v && typeof v==='object' && !Array.isArray(v);
export function validateFreeScene(value: unknown): asserts value is FreeScene {
    if(!isRecord(value) || !['grid,gridSize,name,objects,view','environment,grid,gridSize,name,objects,view'].includes(Object.keys(value).filter(key=>key!=='groups' && key!=='wallLinks').sort().join(','))) throw new Error('Cena livre inválida.');
    if ('environment' in value && (typeof value.environment !== 'string' || !Object.hasOwn(freeEnvironments, value.environment))) {
        throw new Error('Cenário desconhecido.');
    }
    if(typeof value.name!=='string' || value.name.length>100 || typeof value.grid!=='boolean' || !['3d','plan'].includes(value.view as string) ||
        typeof value.gridSize!=='number' || !Number.isFinite(value.gridSize) || value.gridSize<2 || value.gridSize>200)
        throw new Error('Confira o nome, a vista e o tamanho da grade (2 a 200 m).');
    if(!Array.isArray(value.objects) || value.objects.length>200) throw new Error('Use até 200 peças na cena.');
    const ids=new Set<number>();let objCount=0,artPixels=0;const arts=new Set<string>();
    for(const item of value.objects) {
        if(!isRecord(item) || Object.keys(item).filter(key=>!['productId','mount','screenOrientation','originalSize'].includes(key)).sort().join(',')!==objectKeys || !Number.isInteger(item.id) || (item.id as number)<1 || (item.id as number)>1000000 || ids.has(item.id as number)) throw new Error('Uma peça tem dados ou identificador inválidos.');
        ids.add(item.id as number);
        if(!freeCatalog.some(entry=>entry.kind===item.kind) && item.kind!=='obj' && item.kind!=='supplierTotem') throw new Error('Tipo de peça desconhecido.');
        if (item.kind === 'supplierTotem') {
            const product = getSupplierProduct(item.productId);
            if (!product) throw new Error('Modelo de fornecedor desconhecido.');
            if (product.display) {
                if ('mount' in item && !['pedestal','wall'].includes(item.mount as string)) throw new Error('Escolha pedestal ou parede.');
                if ('screenOrientation' in item && !['horizontal','vertical'].includes(item.screenOrientation as string)) throw new Error('Escolha tela horizontal ou vertical.');
            } else if ('mount' in item || 'screenOrientation' in item) {
                throw new Error('O totem integrado tem instalação e orientação fixas.');
            }
        } else if (['productId','mount','screenOrientation'].some(key=>key in item)) {
            throw new Error('A identificação do fornecedor pertence a uma peça de fornecedor.');
        }
        if(typeof item.name!=='string' || /[\u0000-\u001f]/.test(item.name) || item.name.length>100 || typeof item.text!=='string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(item.text) || item.text.length>1000 || typeof item.visible!=='boolean' || typeof item.locked!=='boolean' ||
            typeof item.color!=='string' || !/^#[0-9a-fA-F]{6}$/.test(item.color)) throw new Error('Confira o nome, texto e cor da peça.');
        for(const key of ['position','rotation','size','originalSize']) {
            if (key === 'originalSize' && !('originalSize' in item)) continue;
            const vector=item[key];
            if(!Array.isArray(vector) || vector.length!==3 || vector.some(v=>typeof v!=='number' || !Number.isFinite(v) || Math.abs(v)>10000 || ((key==='size' || key==='originalSize') && (v<.01 || v>1000)))) throw new Error('Use dimensões entre 0,01 e 1000 m e transformações finitas.');
        }
        if(typeof item.roughness!=='number' || !Number.isFinite(item.roughness) || item.roughness<0 || item.roughness>1 || typeof item.opacity!=='number' || !Number.isFinite(item.opacity) || item.opacity<.05 || item.opacity>1 || !Number.isInteger(item.shelves) || (item.shelves as number)<0 || (item.shelves as number)>10) throw new Error('Confira acabamento, transparência e prateleiras.');
        if(typeof item.image!=='string' || typeof item.source!=='string' || !['m','cm','mm'].includes(item.objUnit as string) || !['z','y'].includes(item.upAxis as string)) throw new Error('Arte ou modelo inválido.');
        if(item.image){const size=artworkImageSize(item.image);if(!arts.has(item.image)){arts.add(item.image);artPixels+=size.width*size.height;}if(artPixels>64*1024*1024)throw new Error('As artes estão muito grandes juntas. Reduza a resolução das imagens.');if(item.kind==='obj' || item.kind==='text')throw new Error('A arte frontal se aplica a paredes e peças, não a texto ou OBJ.');}
        if(item.kind==='obj') { if(++objCount>5) throw new Error('Use até cinco objetos OBJ personalizados.'); parseObj(item.source); }
        else if(item.source) throw new Error('Somente um objeto personalizado pode conter dados OBJ.');
    }
    if ('groups' in value) {
        if (!Array.isArray(value.groups) || value.groups.length > 100) throw new Error('Grupos inválidos.');
        const groupIds = new Set<number>();
        const members = new Set<number>();
        for (const group of value.groups) {
            if (!isRecord(group) || Object.keys(group).sort().join(',') !== 'id,name,objectIds' ||
                !Number.isInteger(group.id) || (group.id as number) < 1 || (group.id as number) > 1000000 || groupIds.has(group.id as number) ||
                typeof group.name !== 'string' || !group.name.trim() || group.name.length > 100 || /[\u0000-\u001f]/.test(group.name) ||
                !Array.isArray(group.objectIds) || group.objectIds.length < 2 || group.objectIds.length > 200) throw new Error('Confira o nome e as peças do grupo.');
            groupIds.add(group.id as number);
            for (const id of group.objectIds) {
                if (typeof id !== 'number' || !ids.has(id) || members.has(id)) throw new Error('Cada peça deve pertencer a um único grupo existente.');
                members.add(id);
            }
        }
    }
    if ('wallLinks' in value) {
        if (!Array.isArray(value.wallLinks) || value.wallLinks.length > 19900) throw new Error('Conexões de parede inválidas.');
        const walls = new Set((value.objects as FreeObject[]).filter(object=>object.kind==='wall').map(object=>object.id));
        const links = new Set<string>();
        for (const pair of value.wallLinks) {
            if (!Array.isArray(pair) || pair.length!==2 || pair[0]===pair[1] || pair.some(id=>!walls.has(id))) throw new Error('Confira as paredes de cada ímã.');
            const key = [...pair].sort((a,b)=>a-b).join(':');
            if (links.has(key)) throw new Error('Conexão de parede repetida.');
            links.add(key);
        }
    }
    // Arquivos antigos podem conter sobreposições. O editor limita novas movimentações.
}
export function stringifyFreeScene(scene: FreeScene): string {
    validateFreeScene(scene);
    const text=JSON.stringify({format:'code-buddy-free-scene',version:1,scene},null,2);
    if(new TextEncoder().encode(text).length>MAX_FREE_SCENE_BYTES) throw new Error('A cena ultrapassa 10 MB. Reduza as artes e os objetos importados.');
    return text;
}
export function parseFreeScene(text: string): FreeScene {
    if(new TextEncoder().encode(text).length>MAX_FREE_SCENE_BYTES) throw new Error('Use um arquivo de até 10 MB.');
    let data: unknown;try{data=JSON.parse(text);}catch{throw new Error('O arquivo não é um JSON válido.');}
    if(!isRecord(data) || data.format!=='code-buddy-free-scene' || data.version!==1) throw new Error('Abra uma cena livre salva neste editor. Projetos anteriores estão em Projetos guiados.');
    validateFreeScene(data.scene);return data.scene;
}
export function sceneFilename(scene:FreeScene, extension:string):string {
    return (scene.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') || 'cena_livre')+'.'+extension;
}
export function wallBetween(a:V3,b:V3,id:number):FreeObject {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.05) throw new Error('Desenhe uma parede com pelo menos 5 cm.');
    const wall=newFreeObject('wall',id);wall.size[0]=length;wall.position=[(a[0]+b[0])/2,(a[1]+b[1])/2,0];wall.rotation[2]=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;return wall;
}

export function rectangleBetween(a: V3, b: V3, id: number): FreeObject {
    const width = Math.abs(b[0] - a[0]);
    const depth = Math.abs(b[1] - a[1]);

    if (width < 0.05 || depth < 0.05) {
        throw new Error('Desenhe um retângulo com pelo menos 5 cm em cada lado.');
    }

    const block = newFreeObject('box', id);
    block.position = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0];
    block.size = [width, depth, 1];
    return block;
}
