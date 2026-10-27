import type { Config } from './generator';
import { samplingLayout, validateSampling } from './sampling';

export type Zone = { name: string; x: number; y: number; width: number; depth: number };
export type DemoGeometry = {
    bench: Zone; product: Zone & { z: number; height: number };
    presenter: Zone; audience: Zone; reserved: Zone; stationId: string; rotation: number;
};
export type SamplingGeometry = ReturnType<typeof samplingLayout> & { stationId:string; rotation:number };
type Point = { x: number; y: number };
const EPS = 1e-7;
export function zonesOverlap(a: Zone, b: Zone) {
    return Math.abs(a.x-b.x) < (a.width+b.width)/2-EPS && Math.abs(a.y-b.y) < (a.depth+b.depth)/2-EPS;
}
function segment(a: Point, b: Point, width: number): Zone {
    return { name:'Circulação', x:(a.x+b.x)/2, y:(a.y+b.y)/2,
        width:Math.abs(a.x-b.x)+width, depth:Math.abs(a.y-b.y)+width };
}

/** Rede ortogonal com largura real: cada trecho é testado contra as zonas ocupadas. */
function route(start: Point, end: Point, obstacles: Zone[], width: number, area: Zone): Zone[] {
    const half=width/2, left=-area.width/2+half, right=area.width/2-half;
    const bottom=-area.depth/2+half, top=area.depth/2-half;
    const unique=(values:number[], min:number,max:number)=>[...new Set(values.filter(v=>v>=min-EPS&&v<=max+EPS).map(v=>Number(v.toFixed(7))))].sort((a,b)=>a-b);
    const xs=unique([left,right,start.x,end.x,...obstacles.flatMap(o=>[o.x-o.width/2-half,o.x+o.width/2+half])],left,right);
    const ys=unique([bottom,top,start.y,end.y,...obstacles.flatMap(o=>[o.y-o.depth/2-half,o.y+o.depth/2+half])],bottom,top);
    const points=ys.flatMap(y=>xs.map(x=>({x,y})));
    const clear=(a:Point,b:Point)=>!obstacles.some(o=>zonesOverlap(segment(a,b,width),o));
    const find=(p:Point)=>points.findIndex(q=>Math.abs(p.x-q.x)<EPS&&Math.abs(p.y-q.y)<EPS);
    const from=find(start),to=find(end);
    if(from<0||to<0) throw new Error('O acesso não cabe na área disponível.');
    const previous=new Map<number,number>([[from,-1]]), queue=[from];
    for(let k=0;k<queue.length&&!previous.has(to);k++) {
        const id=queue[k],ix=id%xs.length,iy=Math.floor(id/xs.length);
        for(const next of [ix>0?id-1:-1,ix+1<xs.length?id+1:-1,iy>0?id-xs.length:-1,iy+1<ys.length?id+xs.length:-1]) {
            if(next<0||previous.has(next)||!clear(points[id],points[next])) continue;
            previous.set(next,id); queue.push(next);
        }
    }
    if(!previous.has(to)) throw new Error('A circulação está bloqueada. Aumente a área ou reposicione a espera e a estação.');
    const ids=[to]; while(ids[ids.length-1]!==from) ids.push(previous.get(ids[ids.length-1])!);
    ids.reverse();
    if(ids.length===1) return [segment(start,end,width)];
    const turns=ids.filter((id,i)=>i===0||i===ids.length-1||
        !((Math.abs(points[ids[i-1]].x-points[ids[i+1]].x)<EPS)||(Math.abs(points[ids[i-1]].y-points[ids[i+1]].y)<EPS)));
    return turns.slice(1).map((id,i)=>segment(points[turns[i]],points[id],width));
}

export function activationGeometry(c: Config) {
    if(c.projectType!=='activation') return null;
    for(const [key,min,max] of [
        ['activationEdgeMargin',0,2],['activationWaitingWidth',.5,15],['activationWaitingDepth',.5,15],
        ['activationParticipationWidth',.5,5],['activationParticipationDepth',.5,5],
        ['activationStationGap',0,5],['activationCirculationWidth',.6,5],
        ['activationEntranceWidth',.6,5],['activationExitWidth',.6,5],
        ['activationWaitingX',-30,30],['activationWaitingY',-30,30],
    ] as const) if(!Number.isFinite(c[key])||c[key]<min||c[key]>max) throw new Error(`Confira ${key}: valor entre ${min} e ${max} m.`);
    for(const key of ['activationWaitingEnabled','activationWaitingManual','activationExportGuides'] as const)
        if(typeof c[key]!=='boolean') throw new Error('Configuração de zonas inválida.');
    const sides=['front','right','back','left'];
    if(!sides.includes(c.activationEntranceSide)||!sides.includes(c.activationExitSide)||c.activationEntranceSide===c.activationExitSide)
        throw new Error('Escolha lados diferentes para entrada e saída.');
    if(c.activationEntranceWidth<c.activationCirculationWidth||c.activationExitWidth<c.activationCirculationWidth)
        throw new Error('Entrada e saída devem ter pelo menos a largura da circulação.');
    const isPhoto=c.activationModel==='photo', isDemo=c.activationModel==='demo',isSampling=c.activationModel==='sampling';
    if(!isPhoto&&!isDemo&&!isSampling&&(!c.touchScreens||!Number.isInteger(c.touchCount)||c.touchCount<1||c.touchCount>30))
        throw new Error('A ativação precisa de 1 a 30 totens de interação.');
    if(isPhoto&&(!c.backdrops||c.backdropCount!==1||c.touchScreens))
        throw new Error('Espaço para fotos precisa de um backdrop e não inclui totens touch.');
    if(isDemo&&(c.backdrops||c.touchScreens)) throw new Error('Demonstração de produto inclui apenas a bancada, o produto e as zonas de atividade.');
    if(isSampling) {
        if(c.backdrops||c.touchScreens)throw new Error('Experimentação e amostras não inclui backdrop ou totem touch.');
        validateSampling(c);
    }
    if(!isPhoto&&c.backdrops) throw new Error('Interação em totem não inclui backdrop.');
    if([c.back,c.left,c.right,c.led,c.counter,c.stage,c.totem,c.spots,c.chairs,c.storageEnabled,c.roundTables,c.rectTables,c.bistroTables,c.stools,c.coffeeTables,c.armchairs,c.puffs,c.pedestals,c.showcases,c.shelving,c.cabinets,c.openCubes,c.roundRugs].some(Boolean))
        throw new Error('Este modelo de ativação contém elementos que não estão disponíveis.');
    if(isPhoto) {
        for(const [key,min,max] of [
            ['activationPhotoPersonDistance',.5,5],['activationPhotoCameraDistance',.5,8],
            ['activationPhotoCameraWidth',.5,3],['activationPhotoCameraDepth',.5,3],['activationPhotoCameraHeight',.5,2.5],
        ] as const) if(!Number.isFinite(c[key])||c[key]<min||c[key]>max) throw new Error(`Confira ${key}: valor entre ${min} e ${max} m.`);
        if(c.activationPhotoCameraHeight>c.height) throw new Error('A altura da câmera deve caber na montagem.');
        if(c.activationPhotoPersonDistance<c.backdropBaseDepth/2+c.activationParticipationDepth/2+.1-EPS)
            throw new Error('Afaste a pessoa do backdrop para liberar as bases de apoio.');
        if(c.activationPhotoCameraDistance<(c.activationParticipationDepth+c.activationPhotoCameraDepth)/2+.2-EPS)
            throw new Error('Afaste a câmera da pessoa para separar as áreas de operação e participação.');
    }
    if(isDemo) {
        for(const [key,min,max] of [
            ['demoBenchWidth',.6,5],['demoBenchDepth',.4,2],['demoBenchHeight',.5,1.5],
            ['demoProductWidth',.05,3],['demoProductDepth',.05,3],['demoProductHeight',.05,2],
            ['demoProductX',-3,3],['demoProductY',-2,2],
            ['demoPresenterWidth',.6,3],['demoPresenterDepth',.6,3],
            ['demoPresenterGap',.1,2],['demoAudienceGap',.2,3],
        ] as const) if(!Number.isFinite(c[key])||c[key]<min||c[key]>max) throw new Error(`Confira ${key}: valor entre ${min} e ${max} m.`);
        // O tampo avança 4 cm em cada lado; mantém 5 cm livres até sua borda.
        if(Math.abs(c.demoProductX)+c.demoProductWidth/2>(c.demoBenchWidth+.08)/2-.05+EPS ||
            Math.abs(c.demoProductY)+c.demoProductDepth/2>(c.demoBenchDepth+.08)/2-.05+EPS)
            throw new Error('O produto deve caber no tampo com uma margem de 5 cm das bordas.');
        if(c.demoBenchHeight+c.demoProductHeight>c.height+EPS)
            throw new Error('A bancada e o produto juntos ultrapassam a altura da montagem.');
    }
    const angle=sides.indexOf(c.activationEntranceSide)*90, r=angle*Math.PI/180;
    const rotate=(p:Point):Point=>({x:p.x*Math.cos(r)-p.y*Math.sin(r),y:p.x*Math.sin(r)+p.y*Math.cos(r)});
    const sideways=angle%180!==0, width=sideways?c.depth:c.width, depth=sideways?c.width:c.depth;
    const margin=c.activationEdgeMargin, cw=c.activationCirculationWidth;
    const area:Zone={name:'Área',x:0,y:0,width:c.width-2*margin,depth:c.depth-2*margin};
    const orient=(z:Zone):Zone=>({...z,...rotate(z),width:sideways?z.depth:z.width,depth:sideways?z.width:z.depth});
    const localSampling=isSampling?samplingLayout(c):null;
    const stationWidth=localSampling?localSampling.reserved.width:isDemo?Math.max(c.demoBenchWidth+.08,c.demoPresenterWidth,c.activationParticipationWidth):isPhoto?Math.max(c.backdropWidth,c.activationParticipationWidth,c.activationPhotoCameraWidth):Math.max(c.touchWidth+.1,c.activationParticipationWidth);
    const stationCount=isPhoto||isDemo||isSampling?1:c.touchCount,baseDepth=isDemo?c.demoBenchDepth+.08:isPhoto?c.backdropBaseDepth:c.touchBaseDepth;
    const opposite=sides.indexOf(c.activationExitSide)===(sides.indexOf(c.activationEntranceSide)+2)%4;
    const centerGap=opposite?Math.max(c.activationStationGap,c.activationExitWidth,cw):c.activationStationGap;
    const span=stationCount*stationWidth+(stationCount-1)*c.activationStationGap+(opposite?centerGap-c.activationStationGap:0);
    if(span>width-2*margin+EPS) throw new Error('A fileira de estações não cabe. Aumente a largura disponível ou reduza a quantidade e as folgas.');
    const leftCount=Math.ceil(stationCount/2);
    const baseStations=Array.from({length:stationCount},(_,i)=>{
        const x=opposite?(i<leftCount?-centerGap/2-stationWidth/2-(leftCount-1-i)*(stationWidth+c.activationStationGap):centerGap/2+stationWidth/2+(i-leftCount)*(stationWidth+c.activationStationGap)):(i-(stationCount-1)/2)*(stationWidth+c.activationStationGap);
        const y=localSampling?depth/2-margin-localSampling.reserved.y-localSampling.reserved.depth/2:depth/2-margin-baseDepth/2-(isDemo?c.demoPresenterDepth+c.demoPresenterGap:0);
        return {...rotate({x:x-(localSampling?.reserved.x??0),y}),rotation:angle,id:`${isSampling?'samplingStations':isDemo?'demoStations':isPhoto?'backdrops':'touchScreens'}:${i}`};
    });
    const stations=baseStations.map(base=>({...base,...c.objectTransforms[base.id]}));
    for(const id of Object.keys(c.objectTransforms)) if(!stations.some(s=>s.id===id)) throw new Error('Há um ajuste de objeto que não existe nesta ativação. Restaure a distribuição.');
    const equipment:Zone[]=[], participation:Zone[]=[], terminals:Point[]=[], connectors:Zone[]=[];
    function inside(z:Zone) {
        if(Math.abs(z.x)+z.width/2>area.width/2+EPS||Math.abs(z.y)+z.depth/2>area.depth/2+EPS)
            throw new Error(`${z.name}: ultrapassa a área disponível ou a margem das bordas.`);
    }
    function access(z:Zone,n:Point) {
        const distance=(n.x?z.width:z.depth)/2;
        const point={x:z.x+n.x*(distance+cw/2),y:z.y+n.y*(distance+cw/2)};
        // O conector termina exatamente na borda da zona, sem ocupá-la.
        const connector:Zone={name:'Circulação',x:z.x+n.x*(distance+cw/4),y:z.y+n.y*(distance+cw/4),width:n.x?cw/2:cw,depth:n.y?cw/2:cw};
        inside(connector); connectors.push(connector); terminals.push(point);
    }
    let photo: { capture:Zone; person:Zone; camera:Zone; stationId:string; rotation:number } | null=null;
    let demo: DemoGeometry | null=null;
    let sampling:SamplingGeometry|null=null;
    stations.forEach((s,i)=>{
        const a=s.rotation*Math.PI/180,n={x:Math.sin(a),y:-Math.cos(a)},cos=Math.abs(Math.cos(a)),sin=Math.abs(Math.sin(a));
        if(localSampling) {
            const placed=(z:Zone):Zone=>({...z,x:s.x+Math.cos(a)*z.x-Math.sin(a)*z.y,y:s.y+Math.sin(a)*z.x+Math.cos(a)*z.y,width:cos*z.width+sin*z.depth,depth:sin*z.width+cos*z.depth});
            const data={counter:placed(localSampling.counter),support:placed(localSampling.support),team:placed(localSampling.team),audience:placed(localSampling.audience),waste:localSampling.waste?placed(localSampling.waste):null,reserved:placed(localSampling.reserved),samples:localSampling.samples.map(placed),stationId:s.id,rotation:s.rotation};
            for(const z of [data.counter,data.support,data.team,data.audience,data.reserved,...(data.waste?[data.waste]:[])])inside(z);
            sampling=data;
            equipment.push(data.counter,data.support,...(data.waste?[data.waste]:[]));participation.push(data.audience);
            const side={x:Math.cos(a),y:Math.sin(a)};
            const normal=Math.abs(side.x)>Math.abs(side.y)?{x:Math.sign(side.x),y:0}:{x:0,y:Math.sign(side.y)};
            for(const z of [data.team,data.audience])access({...data.reserved,...(normal.x?{y:z.y}:{x:z.x})},normal);
            if(data.waste) {
                const sign=c.samplingWasteSide==='left'?-1:1;
                const wasteNormal={x:normal.x*sign,y:normal.y*sign};
                access({...data.reserved,...(wasteNormal.x?{y:data.waste.y}:{x:data.waste.x})},wasteNormal);
            }
            return;
        }
        if(isDemo) {
            const zone=(name:string,distance:number,w:number,d:number):Zone=>({name,x:s.x+n.x*distance,y:s.y+n.y*distance,width:cos*w+sin*d,depth:sin*w+cos*d});
            const bench=zone('Bancada',0,c.demoBenchWidth+.08,baseDepth);
            const presenter=zone('Demonstrador',-(baseDepth/2+c.demoPresenterGap+c.demoPresenterDepth/2),c.demoPresenterWidth,c.demoPresenterDepth);
            const audience=zone('Público',baseDepth/2+c.demoAudienceGap+c.activationParticipationDepth/2,c.activationParticipationWidth,c.activationParticipationDepth);
            const back=baseDepth/2+c.demoPresenterGap+c.demoPresenterDepth;
            const front=baseDepth/2+c.demoAudienceGap+c.activationParticipationDepth;
            const reserved=zone('Área de demonstração',(front-back)/2,stationWidth,front+back);
            const product={...zone('Produto',0,c.demoProductWidth,c.demoProductDepth),
                x:s.x+Math.cos(a)*c.demoProductX-Math.sin(a)*c.demoProductY,
                y:s.y+Math.sin(a)*c.demoProductX+Math.cos(a)*c.demoProductY,
                z:.1+c.demoBenchHeight+c.demoProductHeight/2,height:c.demoProductHeight};
            for(const z of [bench,presenter,audience,reserved]) inside(z);
            demo={bench,product,presenter,audience,reserved,stationId:s.id,rotation:s.rotation};
            equipment.push(bench);participation.push(audience);
            const side={x:Math.cos(a),y:Math.sin(a)};
            const normal=Math.abs(side.x)>Math.abs(side.y)?{x:Math.sign(side.x),y:0}:{x:0,y:Math.sign(side.y)};
            // Portas laterais independentes para público e demonstrador, fora do bloco reservado.
            for(const z of [presenter,audience]) access({...reserved,...(normal.x?{y:z.y}:{x:z.x})},normal);
            return;
        }
        if(isPhoto) {
            const zone=(name:string,distance:number,w:number,d:number):Zone=>({name,x:s.x+n.x*distance,y:s.y+n.y*distance,width:cos*w+sin*d,depth:sin*w+cos*d});
            const person=zone('Pessoa na foto',c.activationPhotoPersonDistance,c.activationParticipationWidth,c.activationParticipationDepth);
            const camera=zone('Câmera / fotógrafo',c.activationPhotoPersonDistance+c.activationPhotoCameraDistance,c.activationPhotoCameraWidth,c.activationPhotoCameraDepth);
            const end=c.activationPhotoPersonDistance+c.activationPhotoCameraDistance+c.activationPhotoCameraDepth/2;
            const capture=zone('Área de captura',(end-baseDepth/2)/2,stationWidth,end+baseDepth/2);
            const backdrop=zone('Backdrop',0,c.backdropWidth,baseDepth);
            for(const z of [person,camera,capture,backdrop]) inside(z);
            photo={capture,person,camera,stationId:s.id,rotation:s.rotation};
            equipment.push(backdrop);participation.push(person);
            // A circulação chega à lateral do espaço de captura e não cruza o enquadramento.
            const side={x:Math.cos(a),y:Math.sin(a)};
            access(capture,Math.abs(side.x)>Math.abs(side.y)?{x:Math.sign(side.x),y:0}:{x:0,y:Math.sign(side.y)});
            return;
        }
        const e:Zone={name:`Totem ${i+1}`,...s,width:cos*(c.touchWidth+.1)+sin*c.touchBaseDepth,depth:sin*(c.touchWidth+.1)+cos*c.touchBaseDepth};
        const d=(c.touchBaseDepth+c.activationParticipationDepth)/2;
        const p:Zone={name:`Participação ${i+1}`,x:s.x+n.x*d,y:s.y+n.y*d,width:sin*c.activationParticipationDepth+cos*c.activationParticipationWidth,depth:cos*c.activationParticipationDepth+sin*c.activationParticipationWidth};
        inside(e);inside(p);equipment.push(e);participation.push(p);
        // Rotações livres usam envoltórias conservadoras; o acesso segue a face voltada ao participante.
        access(p,Math.abs(n.x)>Math.abs(n.y)?{x:Math.sign(n.x),y:0}:{x:0,y:Math.sign(n.y)});
    });
    const autoWaiting=orient({name:'Espera',x:-width/2+margin+c.activationWaitingWidth/2,y:-depth/2+margin+c.activationWaitingDepth/2,width:c.activationWaitingWidth,depth:c.activationWaitingDepth});
    const waiting=c.activationWaitingEnabled?{...autoWaiting,...(c.activationWaitingManual?{x:c.activationWaitingX,y:c.activationWaitingY}:{})}:null;
    if(waiting) {inside(waiting);access(waiting,rotate({x:0,y:1}));}
    const photoGeometry=photo as { capture:Zone; person:Zone; camera:Zone; stationId:string; rotation:number } | null;
    const demoGeometry=demo as DemoGeometry | null;
    const samplingGeometry=sampling as SamplingGeometry|null;
    const occupied=[...(samplingGeometry?[samplingGeometry.reserved]:demoGeometry?[demoGeometry.reserved]:photoGeometry?[photoGeometry.capture]:[...equipment,...participation]),...(waiting?[waiting]:[])];
    occupied.forEach((a,i)=>{if(occupied.slice(i+1).some(b=>{
        const ownStation=(a.name.startsWith('Totem ')&&b.name===a.name.replace('Totem ','Participação '));
        return !ownStation&&zonesOverlap(a,b);
    })) throw new Error(`${a.name}: há sobreposição entre espera, participação ou equipamentos.`);});
    for(const connector of connectors) if(occupied.some(o=>zonesOverlap(connector,o))) throw new Error('O acesso de uma zona está bloqueado por outra zona ou totem.');
    function portal(side:string,w:number,name:string):Zone {
        const horizontal=side==='front'||side==='back';
        const length=horizontal?c.width:c.depth;
        if(w>length-2*margin) throw new Error(`${name}: o vão não cabe neste lado.`);
        return {name,x:side==='left'?-c.width/2+margin+cw/2:side==='right'?c.width/2-margin-cw/2:0,
            y:side==='front'?-c.depth/2+margin+cw/2:side==='back'?c.depth/2-margin-cw/2:0,width:horizontal?w:cw,depth:horizontal?cw:w};
    }
    const entrance=portal(c.activationEntranceSide,c.activationEntranceWidth,'Entrada'),exit=portal(c.activationExitSide,c.activationExitWidth,'Saída');
    for(const p of [entrance,exit]) {inside(p);if(occupied.some(o=>zonesOverlap(p,o))) throw new Error(`${p.name} bloqueada. Reposicione as zonas ou aumente a área.`);}
    const edgeAccess=(side:string,w:number):Zone=>({name:'Circulação',
        x:side==='left'?-c.width/2+margin/2:side==='right'?c.width/2-margin/2:0,
        y:side==='front'?-c.depth/2+margin/2:side==='back'?c.depth/2-margin/2:0,
        width:side==='front'||side==='back'?w:margin,depth:side==='front'||side==='back'?margin:w});
    const circulation=[entrance,exit,...(margin>0?[edgeAccess(c.activationEntranceSide,c.activationEntranceWidth),edgeAccess(c.activationExitSide,c.activationExitWidth)]:[]),...connectors,...route(entrance,exit,occupied,cw,area)];
    for(const terminal of terminals) circulation.push(...route(entrance,terminal,occupied,cw,area));
    const uniqueCirculation=[...new Map(circulation.map(z=>[[z.x,z.y,z.width,z.depth].map(v=>v.toFixed(7)).join(','),z])).values()];
    return {baseStations,stations,equipment,participation,waiting,entrance,exit,circulation:uniqueCirculation,photo:photoGeometry,demo:demoGeometry,sampling:samplingGeometry};
}
