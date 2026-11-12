import type { Config, MaterialKind } from './generator';
import type { Zone } from './activation-geometry';

export const samplingDefaults = {
    samplingCounterWidth:2, samplingCounterDepth:.65, samplingCounterHeight:1,
    samplingCounterMat:'brand' as MaterialKind,
    samplingSupportWidth:1.6, samplingSupportDepth:.6, samplingSupportHeight:.9,
    samplingSupportMat:'white' as MaterialKind,
    samplingStorageEnabled:true,
    samplingTeamWidth:1.2, samplingTeamDepth:1.2, samplingTeamGap:.2, samplingSupportGap:.2,
    samplingCustomerGap:.3,
    samplingSampleCount:6, samplingSampleWidth:.1, samplingSampleDepth:.1, samplingSampleHeight:.15,
    samplingSampleMat:'white' as MaterialKind,
    samplingWasteEnabled:false, samplingWasteSide:'left' as 'left'|'right',
    samplingWasteWidth:.35, samplingWasteDepth:.35, samplingWasteHeight:.6,
};

/** Coordenadas locais da estação; o balcão de entrega é a origem e o público fica em −Y. */
export function samplingLayout(c:Config) {
    const zone=(name:string,x:number,y:number,width:number,depth:number):Zone=>({name,x,y,width,depth});
    const counter=zone('Entrega de amostras',0,0,c.samplingCounterWidth+.08,c.samplingCounterDepth+.08);
    const team=zone('Equipe',0,counter.depth/2+c.samplingTeamGap+c.samplingTeamDepth/2,c.samplingTeamWidth,c.samplingTeamDepth);
    const support=zone('Preparo / apoio',0,counter.depth/2+c.samplingTeamGap+c.samplingTeamDepth+c.samplingSupportGap+(c.samplingSupportDepth+.08)/2,c.samplingSupportWidth+.08,c.samplingSupportDepth+.08);
    const audience=zone('Experimentação / retirada',0,-counter.depth/2-c.samplingCustomerGap-c.activationParticipationDepth/2,c.activationParticipationWidth,c.activationParticipationDepth);
    const waste=c.samplingWasteEnabled?zone('Descarte',(c.samplingWasteSide==='left'?-1:1)*(counter.width/2+.2+c.samplingWasteWidth/2),0,c.samplingWasteWidth,c.samplingWasteDepth):null;
    const all=[counter,team,support,audience,...(waste?[waste]:[])];
    for(let i=0;i<all.length;i++)for(const b of all.slice(i+1)) {
        const a=all[i];
        if(Math.abs(a.x-b.x)<(a.width+b.width)/2-1e-8&&Math.abs(a.y-b.y)<(a.depth+b.depth)/2-1e-8)
            throw new Error(`${a.name} e ${b.name}: há sobreposição. Ajuste as dimensões ou os vãos da estação.`);
    }
    const left=Math.min(...all.map(z=>z.x-z.width/2)),right=Math.max(...all.map(z=>z.x+z.width/2));
    const bottom=Math.min(...all.map(z=>z.y-z.depth/2)),top=Math.max(...all.map(z=>z.y+z.depth/2));
    const reserved=zone('Área de experimentação',(left+right)/2,(bottom+top)/2,right-left,top-bottom);
    const samples:Zone[]=[];
    const gap=.08,usableW=counter.width-.1,usableD=counter.depth-.1;
    const cols=Math.floor((usableW+gap+1e-8)/(c.samplingSampleWidth+gap));
    const rows=Math.floor((usableD+gap+1e-8)/(c.samplingSampleDepth+gap));
    if(c.samplingSampleCount>cols*rows) throw new Error('As amostras não cabem no balcão com 5 cm de margem. Reduza a quantidade ou aumente o tampo.');
    const usedCols=Math.min(cols,c.samplingSampleCount),usedRows=usedCols?Math.ceil(c.samplingSampleCount/usedCols):0;
    for(let i=0;i<c.samplingSampleCount;i++) {
        const row=Math.floor(i/usedCols),column=i%usedCols;
        const rowCount=Math.min(usedCols,c.samplingSampleCount-row*usedCols);
        samples.push(zone(`Amostra ${i+1}`,(column-(rowCount-1)/2)*(c.samplingSampleWidth+gap),(row-(usedRows-1)/2)*(c.samplingSampleDepth+gap),c.samplingSampleWidth,c.samplingSampleDepth));
    }
    return {counter,support,team,audience,waste,reserved,samples};
}

export function validateSampling(c:Config) {
    for(const [key,min,max] of [
        ['samplingCounterWidth',.6,5],['samplingCounterDepth',.4,2],['samplingCounterHeight',.6,1.3],
        ['samplingSupportWidth',.6,4],['samplingSupportDepth',.4,2],['samplingSupportHeight',.6,1.3],
        ['samplingTeamWidth',.6,3],['samplingTeamDepth',.6,3],['samplingTeamGap',.1,1],['samplingSupportGap',.1,1],['samplingCustomerGap',.2,2],
        ['samplingSampleCount',0,24],['samplingSampleWidth',.03,.5],['samplingSampleDepth',.03,.5],['samplingSampleHeight',.03,.6],
        ['samplingWasteWidth',.2,.8],['samplingWasteDepth',.2,.8],['samplingWasteHeight',.3,1],
    ] as const) if(!Number.isFinite(c[key])||c[key]<min||c[key]>max)throw new Error(`Confira ${key}: valor entre ${min} e ${max}.`);
    if(!Number.isInteger(c.samplingSampleCount))throw new Error('Use uma quantidade inteira de amostras de referência.');
    if(typeof c.samplingStorageEnabled!=='boolean'||typeof c.samplingWasteEnabled!=='boolean')throw new Error('Seleção de armazenamento ou descarte inválida.');
    if(!['left','right'].includes(c.samplingWasteSide))throw new Error('Escolha o lado do descarte.');
    if(Math.max(c.samplingSupportHeight,c.samplingCounterHeight+(c.samplingSampleCount?c.samplingSampleHeight:0),c.samplingWasteEnabled?c.samplingWasteHeight:0)>c.height)throw new Error('Os elementos de sampling devem caber na altura da montagem.');
}
