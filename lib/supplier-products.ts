import type { V3 } from './free-scene';

export type SupplierMount = 'pedestal' | 'wall';
export type ScreenOrientation = 'horizontal' | 'vertical';

export type SupplierProduct = {
    id: string;
    supplier: string;
    model: string;
    size: V3;
    cabinetWidth?: number;
    cabinetDepth?: number;
    display?: {
        size: V3;
        defaultMount: SupplierMount;
        pedestalHeight: number;
        baseWidth: number;
        baseDepth: number;
    };
};

// Medidas em metros da proposta Touk WT55V Slim fornecida pela TV1.
// Tela, espessura da base e rodízios são aproximações para estudo de layout.
export const supplierProducts: SupplierProduct[] = [{
    id: 'touk-wt55v-slim',
    supplier: 'Touk',
    model: 'WT55V Vertical Slim',
    size: [.93, .50, 1.93],
    cabinetWidth: .81,
    cabinetDepth: .07,
}, {
    id: 'touk-wt21s', supplier: 'Touk', model: 'WT21S',
    size: [.534, .091, .33],
    display: { size: [.534, .091, .33], defaultMount: 'wall', pedestalHeight: .95, baseWidth: .5, baseDepth: .45 },
}, {
    id: 'touk-wt55s', supplier: 'Touk', model: 'WT55S',
    size: [1.28, .12, .76],
    display: { size: [1.28, .12, .76], defaultMount: 'pedestal', pedestalHeight: .95, baseWidth: .8, baseDepth: .6 },
}];

export function getSupplierProduct(id: unknown): SupplierProduct | undefined {
    return supplierProducts.find(product => product.id === id);
}

// Gabinetes conforme os PDFs. Pedestais a 45° e suportes de parede sem cotas,
// representados com medidas aproximadas para planejamento.
export function supplierDisplayLayout(product: SupplierProduct, mount: SupplierMount, orientation: ScreenOrientation) {
    const display = product.display;
    if (!display) throw new Error('Este modelo é um totem integrado.');
    const [width, depth, height] = display.size;
    const w = orientation === 'horizontal' ? width : height;
    const h = orientation === 'horizontal' ? height : width;
    const angle = mount === 'pedestal' ? -Math.PI / 4 : 0;
    const projectedHeight = h * Math.cos(angle) + depth * Math.abs(Math.sin(angle));
    const projectedDepth = h * Math.abs(Math.sin(angle)) + depth * Math.cos(angle);
    const bottom = mount === 'pedestal' ? display.pedestalHeight : 0;
    const size: V3 = mount === 'pedestal'
        ? [Math.max(w, display.baseWidth), Math.max(projectedDepth, display.baseDepth), bottom + projectedHeight]
        : [w, depth + .044, h];
    return { width: w, depth, height: h, angle, bottom, projectedHeight, size };
}

export function supplierObjectSize(product: SupplierProduct, mount?: SupplierMount, orientation: ScreenOrientation = 'horizontal'): V3 {
    return product.display
        ? supplierDisplayLayout(product, mount ?? product.display.defaultMount, orientation).size
        : [...product.size];
}
