import type { FreeObject, V3 } from './free-scene';
import type { FreePart } from './free-scene-geometry';
import type { SupplierProduct } from './supplier-products';
import { supplierDisplayLayout } from './supplier-products';

export function supplierDisplayParts(object: FreeObject, product: SupplierProduct): FreePart[] {
    const display = product.display;
    if (!display) throw new Error('Modelo sem tela configurável.');
    const mount = object.mount ?? display.defaultMount;
    const layout = supplierDisplayLayout(product, mount, object.screenOrientation ?? 'horizontal');
    const scale = object.size.map((value, axis) => value / layout.size[axis]);
    const parts: FreePart[] = [];
    const faces: [number, number, number][] = [
        [0,2,1],[0,3,2],[4,5,6],[4,6,7],
        [0,1,5],[0,5,4],[1,2,6],[1,6,5],
        [2,3,7],[2,7,6],[3,0,4],[3,4,7],
    ];
    const boxVertices = ([w,d,h]: V3): V3[] => [
        [-w/2,-d/2,-h/2],[w/2,-d/2,-h/2],[w/2,d/2,-h/2],[-w/2,d/2,-h/2],
        [-w/2,-d/2,h/2],[w/2,-d/2,h/2],[w/2,d/2,h/2],[-w/2,d/2,h/2],
    ];
    function box(name: string, size: V3, center: V3, color = object.color) {
        parts.push({ name, shape: 'box', size: size.map((v,i)=>v*scale[i]) as V3,
            center: center.map((v,i)=>v*scale[i]) as V3, color, opacity: object.opacity });
    }
    const centerY = mount === 'wall' ? -.018 : 0;
    const centerZ = layout.bottom + layout.projectedHeight / 2;
    function screenVertex([x,y,z]: V3): V3 {
        return [
            x * scale[0],
            (centerY + y*Math.cos(layout.angle) - z*Math.sin(layout.angle)) * scale[1],
            (centerZ + y*Math.sin(layout.angle) + z*Math.cos(layout.angle)) * scale[2],
        ];
    }
    function screenBox(name: string, size: V3, offsetY: number, color: string) {
        const vertices = boxVertices(size).map(([x,y,z])=>screenVertex([x,y+offsetY,z]));
        parts.push({ name, shape: 'mesh', size, center: [0,0,0], color, opacity: object.opacity, vertices, faces });
    }
    if (mount === 'pedestal') {
        box('Base_Pedestal', [display.baseWidth,display.baseDepth,.03], [0,0,.015]);
        const shaftHeight = centerZ - .03;
        box('Pedestal', [Math.min(.22,display.baseWidth*.4),.1,shaftHeight], [0,layout.depth/2+.05,.03+shaftHeight/2]);
    } else {
        box('Suporte_Parede', [layout.width*.5,.04,layout.height*.45], [0,layout.depth/2+.002,centerZ]);
    }
    screenBox('Gabinete', [layout.width,layout.depth,layout.height], 0, object.color);
    const bezel = Math.min(.04,layout.width*.06,layout.height*.08);
    const screenWidth = layout.width - bezel*2;
    const screenHeight = layout.height - bezel*2;
    screenBox('Tela', [screenWidth,.002,screenHeight], -layout.depth/2-.003, '#101b29');
    if (object.image) {
        const vertices = [
            [-screenWidth/2,-layout.depth/2-.0041,-screenHeight/2],
            [screenWidth/2,-layout.depth/2-.0041,-screenHeight/2],
            [screenWidth/2,-layout.depth/2-.0041,screenHeight/2],
            [-screenWidth/2,-layout.depth/2-.0041,screenHeight/2],
        ].map(vertex=>screenVertex(vertex as V3));
        parts.push({ name: 'Arte_Tela', shape: 'image', size: [screenWidth,.001,screenHeight],
            center: [0,0,0], color: '#ffffff', opacity: object.opacity, image: object.image, vertices });
    }
    return parts;
}
