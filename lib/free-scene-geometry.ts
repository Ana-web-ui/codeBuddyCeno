import { supplierDisplayParts } from './supplier-display-geometry';
import { getSupplierProduct } from './supplier-products';
import type { FreeObject, V3 } from './free-scene';
import { modelGeometry } from './imported-models';
export type FreePart = {name:string;shape:'box'|'cylinder'|'text'|'image'|'mesh';size:V3;center:V3;color:string;opacity:number;text?:string;image?:string;vertices?:V3[];faces?:[number,number,number][]};
/** A prévia e os dois exportadores usam as mesmas peças, em metros e com Z para cima. */
export function freeParts(o:FreeObject):FreePart[] {
    const [w,d,h]=o.size, parts:FreePart[]=[];
    const box=(name:string,size:V3,center:V3,color=o.color,opacity=1)=>parts.push({name,shape:'box',size:size.map(n=>Math.max(.001,n)) as V3,center,color,opacity:opacity*o.opacity});
    const cyl=(name:string,size:V3,center:V3,color=o.color)=>parts.push({name,shape:'cylinder',size:size.map(n=>Math.max(.001,n)) as V3,center,color,opacity:o.opacity});
    const board=Math.min(.035,w/8,d/8,h/12), white='#f1f1ed',dark='#374256';
    switch(o.kind) {
        case 'supplierTotem': {
            const product = getSupplierProduct(o.productId);
            if (!product) throw new Error('Modelo de fornecedor desconhecido.');
            if (product.display) {
                parts.push(...supplierDisplayParts(o, product));
                break;
            }
            const bodyWidth = w * product.cabinetWidth! / product.size[0];
            const bodyDepth = d * product.cabinetDepth! / product.size[1];
            const wheelHeight = h * .04 / product.size[2];
            const baseHeight = h * .02 / product.size[2];
            const bodyBottom = wheelHeight + baseHeight;
            for (const x of [-1, 1]) for (const y of [-1, 1]) {
                box('Rodizio_' + x + '_' + y, [w * .05, d * .12, wheelHeight],
                    [x * w * .4, y * d * .35, wheelHeight / 2], '#252525');
            }
            box('Base', [w, d, baseHeight], [0, 0, wheelHeight + baseHeight / 2]);
            box('Gabinete', [bodyWidth, bodyDepth, h - bodyBottom], [0, 0, (h + bodyBottom) / 2]);
            const screenSize: V3 = [bodyWidth * .84, .002, h * .63];
            const screenCenter: V3 = [0, -bodyDepth / 2 - .002, h * .65];
            box('Tela', screenSize, screenCenter, '#101b29');
            if (o.image) parts.push({
                name: 'Arte_Tela', shape: 'image', size: screenSize,
                center: [0, screenCenter[1] - .002, screenCenter[2]],
                color: '#ffffff', opacity: o.opacity, image: o.image,
            });
            break;
        }
        case 'text': parts.push({name:'Texto',shape:'text',size:[w,.001,h],center:[0,0,h/2],color:o.color,opacity:o.opacity,text:o.text});break;
        case 'obj': {
            const g=modelGeometry({id:1,name:o.name,source:o.source,unit:o.objUnit,upAxis:o.upAxis,scale:1,x:0,y:0,z:0,rotation:0,material:'white'});
            const scale=o.size.map((v,i)=>v/Math.max(g.size[i],.000001));
            for(const mesh of g.meshes) parts.push({name:mesh.name,shape:'mesh',size:[w,d,h],center:[0,0,0],color:o.color,opacity:o.opacity,
                vertices:mesh.vertices.map(v=>v.map((n,i)=>n*scale[i]) as V3),faces:mesh.faces});break;
        }
        case 'cylinder':cyl('Cilindro',[w,d,h],[0,0,h/2]);break;
        case 'counter': {
            const top=Math.min(.06,h*.12),base=Math.min(.08,h*.15);
            box('Rodape',[w*.94,d*.9,base],[0,0,base/2],dark);
            box('Corpo',[w,d,h-top-base],[0,0,base+(h-top-base)/2]);
            box('Tampo',[w+.08,d+.08,top],[0,0,h-top/2],white);break;
        }
        case 'led': {
            const screenH=h*.65, screenZ=h-screenH/2;
            box('Moldura',[w,.12,screenH],[0,0,screenZ],dark);
            box('Tela',[Math.max(.01,w-.08),.012,Math.max(.01,screenH-.08)],[0,-.067,screenZ],o.color);
            break;
        }
        case 'backdrop':
            box('Painel',[w,Math.min(d,.06),h],[0,0,h/2]);
            for(const side of [-1,1])box('Base',[w*.12,d,Math.min(.06,h*.1)],[side*w*.36,0,Math.min(.03,h*.05)],dark);break;
        case 'shelf':
            box('Lateral_E',[board,d,h],[-w/2+board/2,0,h/2]);box('Lateral_D',[board,d,h],[w/2-board/2,0,h/2]);
            box('Fundo',[w,board,h],[0,d/2-board/2,h/2]);
            for(let i=0;i<o.shelves+2;i++)box('Prateleira',[w,d,board],[0,0,board/2+(h-board)*i/(o.shelves+1)]);break;
        case 'showcase': {
            const base=h*.2,glassH=h-base,glass=.008;
            box('Base',[w,d,base],[0,0,base/2]);
            for(const side of [-1,1]) {box('Vidro_Lateral',[glass,d,glassH],[side*(w/2-glass/2),0,base+glassH/2],'#bad9e5',.2);box('Vidro_Frontal',[w,glass,glassH],[0,side*(d/2-glass/2),base+glassH/2],'#bad9e5',.2);}
            box('Teto',[w,d,glass],[0,0,h-glass/2],'#bad9e5',.2);
            for(let i=1;i<=o.shelves;i++)box('Prateleira',[w-.01,d-.01,.01],[0,0,base+glassH*i/(o.shelves+1)],'#bad9e5',.3);break;
        }
        case 'roundTable':case 'bistro':
            cyl('Tampo',[w,d,Math.min(.05,h*.1)],[0,0,h-Math.min(.025,h*.05)]);
            cyl('Haste',[w*.07,d*.07,h*.94],[0,0,h*.47],dark);cyl('Base',[w*.5,d*.5,h*.04],[0,0,h*.02],dark);break;
        case 'coffeeTable':
            box('Tampo',[w,d,h*.1],[0,0,h*.95]);
            for(const x of [-1,1])for(const y of [-1,1])box('Pe',[w*.06,d*.08,h*.9],[x*w*.4,y*d*.35,h*.45],dark);break;
        case 'chair':
            box('Assento',[w,d,h*.08],[0,0,h*.53]);box('Encosto',[w,d*.12,h*.42],[0,d*.44,h*.79]);
            for(const x of [-1,1])for(const y of [-1,1])box('Pe',[w*.08,d*.08,h*.5],[x*w*.4,y*d*.4,h*.25],dark);break;
        case 'armchair':
            box('Base',[w*.8,d*.8,h*.12],[0,0,h*.06],dark);box('Assento',[w,d,h*.4],[0,0,h*.32]);
            box('Encosto',[w,d*.2,h*.52],[0,d*.4,h*.74]);
            for(const side of [-1,1])box('Braco',[w*.16,d,h*.28],[side*w*.42,0,h*.64]);break;
        case 'puff':box('Puff',[w,d,h],[0,0,h/2]);break;
        default:box(o.kind==='wall'?'Parede':o.kind==='floor'?'Piso':o.kind==='stage'?'Palco':'Bloco',[w,d,h],[0,0,h/2]);
    }
    if(o.image && o.kind!=='obj' && o.kind!=='text' && o.kind!=='supplierTotem') {
        const led=o.kind==='led';
        parts.push({name:'Arte',shape:'image',size:[Math.max(.01,led?w-.08:w*.94),.001,Math.max(.01,led?h*.65-.08:h*.85)],center:[0,led?-.075:-d/2-.002,led?h-h*.65/2:h/2],color:'#ffffff',opacity:o.opacity,image:o.image});
    }
    return parts;
}
