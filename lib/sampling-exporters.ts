import type { Config,MaterialKind } from './generator';
import { samplingLayout } from './sampling';
type Part={name:string;role:string;size:number[];center:number[];material:MaterialKind};

/** Peças editáveis: atendimento, apoio, armário, amostras e descarte aberto. */
export function samplingParts(c:Config,x=0,y=0):Part[] {
    const layout=samplingLayout(c),parts:Part[]=[],floor=.1,t=.06;
    const box=(name:string,role:string,size:number[],center:number[],material:MaterialKind)=>parts.push({name,role,size,center:[x+center[0],y+center[1],center[2]],material});
    box('Sampling_Balcao_Corpo','sampling_counter',[c.samplingCounterWidth,c.samplingCounterDepth,c.samplingCounterHeight-t],[0,0,floor+(c.samplingCounterHeight-t)/2],c.samplingCounterMat);
    box('Sampling_Balcao_Tampo','sampling_counter_top',[layout.counter.width,layout.counter.depth,t],[0,0,floor+c.samplingCounterHeight-t/2],'white');
    const support=layout.support;
    box('Sampling_Apoio_Tampo','sampling_support',[support.width,support.depth,t],[support.x,support.y,floor+c.samplingSupportHeight-t/2],c.samplingSupportMat);
    const h=c.samplingSupportHeight-t;
    if(c.samplingStorageEnabled) {
        box('Sampling_Armario_Corpo','sampling_storage',[c.samplingSupportWidth,c.samplingSupportDepth,h],[0,support.y,floor+h/2],c.samplingSupportMat);
        for(const sign of [-1,1]) {
            box(`Sampling_Armario_Porta_${sign===-1?'E':'D'}`,'sampling_storage_door',[c.samplingSupportWidth/2-.008,.018,h-.04],[sign*c.samplingSupportWidth/4,support.y-c.samplingSupportDepth/2-.009,floor+h/2],c.samplingSupportMat);
            box(`Sampling_Armario_Puxador_${sign===-1?'E':'D'}`,'sampling_storage_handle',[.015,.02,.08],[sign*.05,support.y-c.samplingSupportDepth/2-.028,floor+h*.65],'metal');
        }
    } else {
        for(const sx of [-1,1])for(const sy of [-1,1])box(`Sampling_Apoio_Pe_${sx}_${sy}`,'sampling_support_leg',[.05,.05,h],[sx*(c.samplingSupportWidth/2-.05),support.y+sy*(c.samplingSupportDepth/2-.05),floor+h/2],'metal');
    }
    for(const [i,sample] of layout.samples.entries())box(`Sampling_Amostra_${i+1}`,'sampling_sample',[sample.width,sample.depth,c.samplingSampleHeight],[sample.x,sample.y,floor+c.samplingCounterHeight+c.samplingSampleHeight/2],c.samplingSampleMat);
    if(layout.waste) {
        const w=layout.waste,wall=.02,h=c.samplingWasteHeight;
        box('Sampling_Descarte_Fundo','sampling_waste',[w.width,w.depth,wall],[w.x,w.y,floor+wall/2],'plastic');
        for(const sign of [-1,1]) {
            box(`Sampling_Descarte_Lado_X_${sign}`,'sampling_waste',[wall,w.depth,h-wall],[w.x+sign*(w.width-wall)/2,w.y,floor+wall+(h-wall)/2],'plastic');
            box(`Sampling_Descarte_Lado_Y_${sign}`,'sampling_waste',[w.width-2*wall,wall,h-wall],[w.x,w.y+sign*(w.depth-wall)/2,floor+wall+(h-wall)/2],'plastic');
        }
    }
    return parts;
}
type Layout={positions:[number,number][]};
export function blenderSampling(c:Config,layout:Layout) {
    return layout.positions.flatMap(([x,y])=>samplingParts(c,x,y)).map(p=>`
objeto_sampling = caixa('${p.name}', ${JSON.stringify(p.size)}, ${JSON.stringify(p.center)}, acabamento('${p.material}'))
objeto_sampling['code_buddy_role'] = '${p.role}'
`).join('');
}
export function maxSampling(c:Config,layout:Layout) {
    return `
(
    local pecaSampling
${layout.positions.flatMap(([x,y])=>samplingParts(c,x,y)).map(p=>`    pecaSampling = cbCaixa "${p.name}" ${p.size.join(' ')} ${p.center.join(' ')} (cbMaterial "${p.material}")
    setUserProp pecaSampling "code_buddy_role" "${p.role}"`).join('\n')}
)
`;
}
