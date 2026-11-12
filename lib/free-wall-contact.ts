import type { FreeObject, FreeScene, V3, WallLink } from './free-scene';

export const WALL_SNAP_DISTANCE = .1;
const EPS = 1e-7;
const CONTACT = 1e-5;
const dot = (a: V3, b: V3) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const add = (a: V3, b: V3): V3 => a.map((value, axis) => value + b[axis]) as V3;
const subtract = (a: V3, b: V3): V3 => a.map((value, axis) => value - b[axis]) as V3;
const multiply = (a: V3, factor: number): V3 => a.map(value => value * factor) as V3;
const length = (a: V3) => Math.hypot(...a);

type WallBox = {center: V3; axes: V3[]; half: V3};
function wallBox(wall: FreeObject): WallBox {
    const [x,y,z] = wall.rotation.map(value => value * Math.PI / 180);
    const [sx,cx,sy,cy,sz,cz] = [Math.sin(x),Math.cos(x),Math.sin(y),Math.cos(y),Math.sin(z),Math.cos(z)];
    const axes: V3[] = [[cz*cy,sz*cy,-sy],[cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx],[cz*sy*cx+sz*sx,sz*sy*cx-cz*sx,cy*cx]];
    return {center:add(wall.position,multiply(axes[2],wall.size[2]/2)),axes,half:wall.size.map(value=>value/2) as V3};
}
function radius(box: WallBox, axis: V3): number {
    return box.axes.reduce((sum, direction, i) => sum + Math.abs(dot(direction,axis))*box.half[i],0);
}
function separationAxes(a: WallBox, b: WallBox): V3[] {
    const axes = [...a.axes,...b.axes];
    for (const u of a.axes) for (const v of b.axes) {
        const cross: V3 = [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        const size = length(cross);
        if (size > EPS) axes.push(multiply(cross,1/size));
    }
    return axes;
}
function gap(a: WallBox, b: WallBox): number {
    const distance = subtract(a.center,b.center);
    return Math.max(...separationAxes(a,b).map(axis=>Math.abs(dot(distance,axis))-radius(a,axis)-radius(b,axis)));
}
export function wallsOverlap(a: FreeObject, b: FreeObject): boolean {
    return gap(wallBox(a),wallBox(b)) < -EPS;
}
export function wallIntersectsScene(scene: FreeScene, wall: FreeObject): boolean {
    return scene.objects.some(other=>other.id!==wall.id && other.kind==='wall' && other.visible && wallsOverlap(wall,other));
}

/** Sweep the complete movement, so a fast drag cannot tunnel through a thin wall. */
function firstContact(a: WallBox, b: WallBox, delta: V3): number | null {
    if (gap(a,b) < -EPS) return null; // Existing overlapping scenes can still be separated.
    const distance = subtract(a.center,b.center);
    let entry = -Infinity, exit = Infinity;
    const timeTolerance = EPS/Math.max(1,length(delta));
    for (const axis of separationAxes(a,b)) {
        const extent = radius(a,axis)+radius(b,axis);
        const start = dot(distance,axis), speed = dot(delta,axis);
        if (Math.abs(speed) < EPS) {
            if (Math.abs(start) >= extent-EPS) return null;
            continue;
        }
        const t1 = (-extent-start)/speed, t2 = (extent-start)/speed;
        entry = Math.max(entry,Math.min(t1,t2));
        exit = Math.min(exit,Math.max(t1,t2));
    }
    return entry >= exit-timeTolerance || exit <= timeTolerance || entry > 1 ? null : Math.max(0,entry);
}

export function connectedWallIds(scene: FreeScene, ids: number[]): number[] {
    const members = new Set(ids);
    let changed = true;
    while (changed) {
        changed = false;
        for (const [a,b] of scene.wallLinks ?? []) {
            if (!members.has(a) && !members.has(b)) continue;
            const peers=[a,b,...(scene.groups ?? []).filter(group=>group.objectIds.includes(a) || group.objectIds.includes(b)).flatMap(group=>group.objectIds)];
            for (const id of peers) if (!members.has(id)) {members.add(id);changed=true;}
        }
    }
    return [...members];
}

function touching(a: WallBox, b: WallBox): boolean {
    if (Math.abs(a.axes[2][2]) < 1-EPS || Math.abs(b.axes[2][2]) < 1-EPS) return false;
    const low = Math.max(a.center[2]-a.half[2],b.center[2]-b.half[2]);
    const high = Math.min(a.center[2]+a.half[2],b.center[2]+b.half[2]);
    const separation = gap(a,b);
    return high-low > CONTACT && Math.abs(separation) <= CONTACT;
}

export function constrainWallMotion(scene: FreeScene, ids: number[], requested: V3, snapAtRest = false): {delta: V3; blocked: boolean} {
    const members = new Set(connectedWallIds(scene,ids));
    const moving = scene.objects.filter(wall=>wall.kind==='wall' && wall.visible && members.has(wall.id)).map(wallBox);
    const fixed = scene.objects.filter(wall=>wall.kind==='wall' && wall.visible && !members.has(wall.id)).map(wallBox);
    function fraction(delta: V3): number {
        let allowed = 1;
        for (const a of moving) for (const b of fixed) allowed = Math.min(allowed,firstContact(a,b,delta) ?? 1);
        return allowed;
    }
    const allowed = fraction(requested);
    const limited = multiply(requested,allowed);
    let delta = limited;
    let nearest = WALL_SNAP_DISTANCE + EPS;
    for (const start of moving) for (const target of fixed) {
        const moved = {...start,center:add(start.center,limited)};
        if (Math.abs(start.axes[2][2]) < 1-EPS || Math.abs(target.axes[2][2]) < 1-EPS) continue;
        for (const axis of [...start.axes.slice(0,2),...target.axes.slice(0,2)]) {
            const distance = dot(subtract(moved.center,target.center),axis);
            const extent = radius(start,axis)+radius(target,axis);
            const correction = (distance < 0 ? -extent : extent)-distance;
            const magnitude = Math.abs(correction);
            if (magnitude > WALL_SNAP_DISTANCE || magnitude >= nearest) continue;
            if (!snapAtRest && axis.some((value,i)=>Math.abs(value*correction)>EPS && Math.abs(requested[i])<EPS)) continue;
            const originalGap = Math.abs(Math.abs(dot(subtract(start.center,target.center),axis))-extent);
            if (!snapAtRest && magnitude > EPS && magnitude >= originalGap-EPS) continue;
            const candidate = add(limited,multiply(axis,correction));
            if (!touching({...start,center:add(start.center,candidate)},target) || fraction(candidate) < 1-EPS/Math.max(1,length(candidate))) continue;
            if (moving.some(a=>fixed.some(b=>gap({...a,center:add(a.center,candidate)},b)<-CONTACT && gap(a,b)>=-EPS))) continue;
            delta = candidate;nearest = magnitude;
        }
    }
    return {delta,blocked:allowed < 1-EPS};
}

export function placeFreeWall(scene: FreeScene, wall: FreeObject, relocate: boolean): FreeObject {
    let placed = wall;
    if (wallIntersectsScene(scene,placed)) {
        if (!relocate) throw new Error('Esta parede atravessa outra. Termine o desenho no contato entre elas.');
        const fixed = scene.objects.filter(other=>other.kind==='wall' && other.visible).map(wallBox);
        const box = wallBox(wall), axis: V3 = [1,0,0];
        const right = Math.max(...fixed.map(other=>other.center[0]+radius(other,axis)));
        placed = {...wall,position:add(wall.position,[right-(box.center[0]-radius(box,axis)),0,0])};
    }
    const {delta} = constrainWallMotion({...scene,objects:[...scene.objects,placed]},[placed.id],[0,0,0],true);
    return {...placed,position:add(placed.position,delta)};
}

export function placeWallCopies(scene: FreeScene, copies: FreeObject[]): FreeObject[] {
    const walls = copies.filter(object=>object.kind==='wall' && object.visible);
    if (!walls.some(wall=>wallIntersectsScene(scene,wall))) return copies;
    const axis: V3 = [1,0,0];
    const right = Math.max(...scene.objects.filter(object=>object.kind==='wall' && object.visible).map(object=>{
        const box=wallBox(object);return box.center[0]+radius(box,axis);
    }));
    const left = Math.min(...walls.map(object=>{const box=wallBox(object);return box.center[0]-radius(box,axis);}));
    return copies.map(object=>({...object,position:add(object.position,[right-left,0,0])}));
}

export function trimDrawnWall(scene: FreeScene, wall: FreeObject): FreeObject {
    if (!wallIntersectsScene(scene,wall)) return placeFreeWall(scene,wall,false);
    const direction = wallBox(wall).axes[0];
    const start = subtract(wall.position,multiply(direction,wall.size[0]/2));
    const atLength = (size: number): FreeObject => ({...wall,size:[size,wall.size[1],wall.size[2]],position:add(start,multiply(direction,size/2))});
    let low=.05, high=wall.size[0];
    if (wallIntersectsScene(scene,atLength(low))) throw new Error('Comece a parede fora da outra parede e desenhe em direção ao encontro.');
    for (let step=0;step<40 && high-low>EPS;step++) {
        const middle=(low+high)/2;
        if (wallIntersectsScene(scene,atLength(middle))) high=middle;else low=middle;
    }
    return atLength(low);
}

export function toggleWallLink(scene: FreeScene, a: number, b: number): FreeScene {
    const existing = scene.wallLinks ?? [];
    const hasLink = existing.some(pair=>pair.includes(a) && pair.includes(b));
    if (hasLink) return {...scene,wallLinks:existing.filter(pair=>!(pair.includes(a) && pair.includes(b)))};
    const first = scene.objects.find(wall=>wall.id===a && wall.kind==='wall');
    const second = scene.objects.find(wall=>wall.id===b && wall.kind==='wall');
    if (a===b || !first || !second || !touching(wallBox(first),wallBox(second))) throw new Error('Encoste as duas paredes antes de ligar o ímã.');
    const pair: WallLink = a < b ? [a,b] : [b,a];
    return {...scene,wallLinks:[...existing,pair]};
}

function contactPoint(a: WallBox, b: WallBox): V3 {
    function corners(box: WallBox): V3[] {
        return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>add(box.center,add(multiply(box.axes[0],x*box.half[0]),multiply(box.axes[1],y*box.half[1]))));
    }
    const ac = corners(a), bc = corners(b);
    let nearest = Infinity;
    let points: V3[] = [];
    for (const [vertices,edges] of [[ac,bc],[bc,ac]]) for (const vertex of vertices) for (let i=0;i<4;i++) {
        const start = edges[i], end = edges[(i+1)%4];
        const direction: V3 = [end[0]-start[0],end[1]-start[1],0];
        const offset: V3 = [vertex[0]-start[0],vertex[1]-start[1],0];
        const t = Math.max(0,Math.min(1,dot(offset,direction)/Math.max(EPS,dot(direction,direction))));
        const projected = add(start,multiply(direction,t));
        const distance = Math.hypot(vertex[0]-projected[0],vertex[1]-projected[1]);
        if (distance < nearest-CONTACT) {nearest=distance;points=[];}
        if (distance <= nearest+CONTACT) {
            const point=multiply(add(vertex,projected),.5);
            if (!points.some(existing=>Math.hypot(existing[0]-point[0],existing[1]-point[1])<CONTACT)) points.push(point);
        }
    }
    const point = multiply(points.reduce(add,[0,0,0] as V3),1/Math.max(1,points.length));
    const low = Math.max(a.center[2]-a.half[2],b.center[2]-b.half[2]);
    const high = Math.min(a.center[2]+a.half[2],b.center[2]+b.half[2]);
    point[2] = (low+high)/2;
    return point;
}

export function wallMagnetContacts(scene: FreeScene, selectedIds: number[]) {
    const selected = new Set(connectedWallIds(scene,selectedIds));
    const walls = scene.objects.filter(wall=>wall.kind==='wall' && wall.visible);
    const contacts: {a:number;b:number;point:V3;linked:boolean;label:string}[] = [];
    for (let i=0;i<walls.length;i++) for (let j=i+1;j<walls.length;j++) {
        const a=walls[i],b=walls[j];
        if (!selected.has(a.id) && !selected.has(b.id)) continue;
        const linked = scene.wallLinks?.some(pair=>pair.includes(a.id) && pair.includes(b.id)) ?? false;
        const first=wallBox(a),second=wallBox(b);
        if (!touching(first,second)) continue;
        contacts.push({a:a.id,b:b.id,point:contactPoint(first,second),linked,label:`${linked?'Soltar':'Conectar'} ${a.name} ${a.id} e ${b.name} ${b.id}`});
    }
    return contacts;
}
