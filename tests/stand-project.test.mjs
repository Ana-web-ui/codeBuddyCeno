import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const output = mkdtempSync(join(tmpdir(), 'codebuddy-stand-tests-'));
const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--outDir', output,
    'lib/project-file.ts'], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stdout + result.stderr);
writeFileSync(join(output, 'package.json'), '{"type":"commonjs"}');
const { defaults, validate, generate } = require(join(output, 'generator.js'));
const { createProjectConfig } = require(join(output, 'project-types.js'));
const { projectTypes } = require(join(output, 'project-types.js'));
const { getStandWalls } = require(join(output, 'stand-config.js'));
const { libraryCatalog } = require(join(output, 'library.js'));
const { assemblyGeometry } = require(join(output, 'generator.js'));
const { parseProject, serializeProject, MAX_PROJECT_BYTES } = require(join(output, 'project-file.js'));
const base = () => structuredClone(defaults);
const old = () => {
    const c = base();
    delete c.standLayout; delete c.frontRotation; delete c.cornerOpenSide;
    return c;
};
const walls = c => [c.back, c.left, c.right];
const layouts = [
    ['front','right',[true,true,true]],
    ['corner','right',[true,true,false]],
    ['corner','left',[true,false,true]],
    ['peninsula','right',[true,false,false]],
    ['island','right',[false,false,false]],
    ['custom','right',[true,false,false]],
];
for (const [layout, side, expected] of layouts) {
    test(`paredes e JSON: ${layout}/${side}, quatro orientações e dois exportadores`, () => {
        for (const rotation of [0,90,180,270]) {
            const c = {...base(), standLayout:layout, cornerOpenSide:side, frontRotation:rotation,
                ...getStandWalls(layout,side,defaults)};
            assert.deepEqual(walls(c),expected);
            validate(c);
            const restored=parseProject(serializeProject(c));
            assert.deepEqual(restored,c);
            for(const target of ['blender','max']) {
                assert.equal(generate({...restored,target}),generate({...c,target}));
            }
        }
    });
}
test('JSON preserva imagem e ajustes de móveis em todas as orientações', () => {
    for (const rotation of [0,90,180,270]) {
        const c = {...base(), frontRotation:rotation, pedestals:true,pedestalCount:1,
            screenName:'imagem.png',screenImage:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
            objectTransforms:{'pedestals:0':{x:1,y:0,rotation:30}}};
        assert.deepEqual(parseProject(serializeProject(c)),c);
    }
});
test('migração dos quatro formatos antigos mantém paredes e posição original', () => {
    const c=old(); delete c.objectTransforms;
    c.back=false; c.left=true; c.right=true;
    for (const doc of [c,{config:c},... [1,2].map(version=>({format:'code-buddy-project',version,config:c}))]) {
        const parsed=parseProject(JSON.stringify(doc));
        assert.deepEqual(walls(parsed),[false,true,true]);
        assert.equal(parsed.standLayout,'custom');
        assert.equal(parsed.frontRotation,0);
        assert.deepEqual(parsed.objectTransforms,{});
        assert.deepEqual(parseProject(serializeProject(parsed)),parsed);
    }
});
test('plenária usa os próprios padrões e preserva o JSON completo', () => {
    const c=createProjectConfig('palco');
    assert.deepEqual(parseProject(serializeProject(c)),c);
    const legacy=parseProject(JSON.stringify({projectType:'palco',name:'Legado'}));
    assert.equal(legacy.stage,true); assert.equal(legacy.width,20);
    assert.equal(legacy.counter,false); assert.equal(legacy.attendeeCount,300);
});
test('campos ausentes na versão atual são erros; valores inválidos não viram padrões', () => {
    const doc=JSON.parse(serializeProject(base()));
    delete doc.config.frontRotation;
    assert.throws(()=>parseProject(JSON.stringify(doc)),/ausente/);
    for (const changes of [{frontRotation:45},{frontRotation:'90'},{standLayout:'outro'},
        {cornerOpenSide:null},{name:123},{width:null},{left:'false'},
        {objectTransforms:[]},{objectTransforms:{'inexistente:0':{x:0,y:0,rotation:0}}},
        {chairDistribution:'outro'},{unknownField:true}]) {
        assert.throws(()=>parseProject(JSON.stringify({config:{...base(),...changes}})));
    }
});
test('recusa modelo com paredes contraditórias ao abrir e ao salvar', () => {
    const c={...base(),standLayout:'island',back:true};
    assert.throws(()=>parseProject(JSON.stringify({config:c})),/paredes/);
    assert.throws(()=>serializeProject(c),/paredes/);
});
test('recusa JSON quebrado, envelope inválido, versão futura e arquivo acima de 4 MB', () => {
    for (const text of ['{','null','[]','{"config":null}',
        JSON.stringify({format:'outro',version:3,config:base()}),
        JSON.stringify({format:'code-buddy-project',version:99,config:base()}),
        JSON.stringify({version:3,config:base()})]) assert.throws(()=>parseProject(text));
    assert.throws(()=>parseProject(' '.repeat(MAX_PROJECT_BYTES+1)),/4 MB/);
});
test('edição real da interface aplica modelos, personaliza paredes e preserva ajustes ao girar', () => {
    const source=readFileSync(resolve('app/page.tsx'),'utf8');
    assert.match(source,/import \{ MAX_PROJECT_BYTES, serializeProject, parseProject, projectFilename \} from '@\/lib\/project-file'/);
    const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let declaration;
    function visit(n) {
        if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='update') declaration=n;
        ts.forEachChild(n,visit);
    }
    visit(ast); assert.ok(declaration);
    const c={...base(),pedestals:true,pedestalCount:1,objectTransforms:{'pedestals:0':{x:1,y:0,rotation:30}}};
    const ctx=vm.createContext({c,getStandWalls,setC:fn=>Object.assign(c,fn(c)),
        setError:()=>{},setAssemblyError:()=>{},setNotice:()=>{}});
    vm.runInContext(ts.transpileModule('const '+declaration.getText(ast)+'; globalThis.change=update;',
        {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
    ctx.change('frontRotation',90);
    assert.equal(c.objectTransforms['pedestals:0'].rotation,30);
    ctx.change('standLayout','corner'); assert.deepEqual(walls(c),[true,true,false]);
    assert.equal(Object.keys(c.objectTransforms).length,0);
    ctx.change('cornerOpenSide','left'); assert.deepEqual(walls(c),[true,false,true]);
    ctx.change('right',false); assert.equal(c.standLayout,'custom');
    assert.deepEqual(walls(c),[true,false,false]);
    assert.deepEqual(parseProject(serializeProject(c)),JSON.parse(JSON.stringify(c)));
});

test('troca para Lounge recupera rascunhos ausentes e parciais do recarregamento automático', () => {
    const source=readFileSync(resolve('app/page.tsx'),'utf8');
    const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let fn;
    function visit(n) {
        if(ts.isFunctionDeclaration(n)&&n.name?.text==='changeProjectType') fn=n;
        ts.forEachChild(n,visit);
    }
    visit(ast); assert.ok(fn);
    for (const draft of [undefined, {target:'blender'}, {name:'Lounge editado',width:12,color:'#123456'}]) {
        const c={...base(),name:'Meu estande editado',target:'max'};
        let state=c;
        const projectDrafts={current:{stand:c,palco:createProjectConfig('palco')}};
        if(draft) projectDrafts.current.lounge=draft;
        const ctx=vm.createContext({c,projectDrafts,projectTypes,createProjectConfig,
            imageRequest:{current:0},setC:next=>{state=next;},
            setSelectedId:()=>{},setAssemblyError:()=>{},setOutput:()=>{},
            setTab:()=>{},setError:()=>{},setNotice:()=>{},setCopied:()=>{}});
        vm.runInContext(ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
        ctx.changeProjectType('lounge');
        assert.equal(state.projectType,'lounge');
        assert.equal(state.target,'max');
        assert.equal(state.color.toUpperCase(),draft?.color?.toUpperCase()??defaults.color.toUpperCase());
        assert.equal(state.name,draft?.name??'Meu primeiro lounge');
        assert.equal(state.width,draft?.width??10);
        validate(state);
        assert.deepEqual(parseProject(serializeProject(state)),JSON.parse(JSON.stringify(state)));
        ctx.c=state;
        ctx.changeProjectType('stand');
        assert.equal(state.name,'Meu estande editado');
        assert.equal(state.target,'max');
    }
});

test('Lounge libera somente o catálogo mínimo e conta assentos reais', () => {
    assert.deepEqual(libraryCatalog.filter(item=>item.projectTypes.includes('lounge')).map(item=>item.id).sort(),
        ['roundRugs','coffeeTables','armchairs','puffs','bistroTables','stools'].sort());
    const c=createProjectConfig('lounge'); validate(c);
    const count=config=>assemblyGeometry(config).flatMap(unit=>unit.members)
        .filter(member=>['armchairs','puffs','stools'].includes(member.role)).length;
    assert.equal(count(c),8);
    const three={...c,coffeeTableCount:3}; validate(three); assert.equal(count(three),12);
    const free={...c,loungeMode:'free'}; validate(free); assert.equal(count(free),8);
    const bistro={...c,bistroTables:true,bistroTableCount:1,stools:true,stoolDistribution:'bistro',stoolsPerBistro:2};
    validate(bistro); assert.equal(count(bistro),10);
    assert.deepEqual(parseProject(serializeProject(bistro)),bistro);
    for(const target of ['blender','max']) assert.ok(generate({...bistro,target}).length>1000);
});

test('controles reais de lounge e banquetas limpam ajustes ao trocar a distribuição', () => {
    const source=readFileSync(resolve('app/page.tsx'),'utf8');
    const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const callbacks={};
    function visit(n) {
        if(ts.isJsxOpeningElement(n)&&n.tagName.getText(ast)==='Select') {
            const attrs=n.attributes.properties;
            const value=attrs.find(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='value');
            const handler=attrs.find(a=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='onValueChange');
            if(value?.initializer&&ts.isJsxExpression(value.initializer)&&handler?.initializer&&ts.isJsxExpression(handler.initializer)) {
                callbacks[value.initializer.expression.getText(ast)]=handler.initializer.expression.getText(ast);
            }
        }
        ts.forEachChild(n,visit);
    }
    visit(ast);
    let state=createProjectConfig('lounge');
    const ctx=vm.createContext({setC:fn=>{state=fn(state);},setSelectedId:()=>{},setAssemblyError:()=>{},setError:()=>{},setNotice:()=>{}});
    for(const [property,values] of [['c.loungeMode',['free','set']],['c.stoolDistribution',['bistro','free']]]) {
        assert.ok(callbacks[property]);
        vm.runInContext(ts.transpileModule('globalThis.change='+callbacks[property],{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
        if(property==='c.stoolDistribution') state={...state,stools:true};
        for(const value of values) {
            state={...state,objectTransforms:{'coffeeTables:0':{x:0,y:0,rotation:0}}};
            ctx.change(value);
            assert.equal(Object.keys(state.objectTransforms).length,0);
            validate(state);
        }
    }
    assert.equal(state.bistroTables,true);
});

test('ativação inicial contém somente dois equipamentos touch e salva JSON versão 15',()=>{
    const c=createProjectConfig('activation');
    validate(c);
    assert.equal(c.projectType,'activation'); assert.equal(c.activationModel,'touch');
    assert.deepEqual([c.width,c.depth,c.height],[8,6,3.5]);
    assert.equal(c.touchCount,2); assert.equal(c.touchScreens,true);
    const units=assemblyGeometry(c);
    assert.equal(units.length,2);
    assert.ok(units.every(unit=>unit.id.startsWith('touchScreens:')));
    const text=serializeProject(c);
    assert.equal(JSON.parse(text).version,15);
    writeFileSync(join(output,'activation.json'),text);
    const restored=parseProject(readFileSync(join(output,'activation.json'),'utf8'));
    assert.deepEqual(restored,c);
    for(const target of ['blender','max']) assert.equal(generate({...c,target}),generate({...restored,target}));
});

test('ativação preserva equipamento movido, girado e seu material no JSON',()=>{
    const c={...createProjectConfig('activation'),width:12,depth:10,touchMat:'metal',
        objectTransforms:{'touchScreens:0':{x:0,y:0,rotation:45}}};
    validate(c);
    assert.deepEqual(parseProject(serializeProject(c)),c);
    for(const target of ['blender','max']) assert.ok(generate({...c,target}).length>1000);
});

test('JSON de versões 1 a 5 recebe o novo campo sem perder projetos existentes',()=>{
    for(const type of ['stand','palco','lounge']) for(const version of [1,2,3,4,5]) {
        const c=createProjectConfig(type); c.name='Arquivo antigo '+type;
        const legacy={...c}; delete legacy.activationModel;
        if(version<=3) for(const key of Object.keys(legacy)) if(key.startsWith('storage')) delete legacy[key];
        if(version<=2) { delete legacy.standLayout; delete legacy.frontRotation; delete legacy.cornerOpenSide; }
        const restored=parseProject(JSON.stringify({format:'code-buddy-project',version,config:legacy}));
        assert.equal(restored.activationModel,'touch');
        assert.equal(restored.projectType,type); assert.equal(restored.name,c.name);
        assert.equal(restored.width,c.width); assert.equal(restored.color,c.color);
        assert.deepEqual(parseProject(serializeProject(restored)),restored);
    }
    const c=createProjectConfig('lounge'); delete c.activationModel;
    for(const legacy of [c,{config:c}]) assert.equal(parseProject(JSON.stringify(legacy)).projectType,'lounge');
});

test('JSON versão 6 exige modelo e versões antigas não mascaram modelo inválido',()=>{
    const doc=JSON.parse(serializeProject(createProjectConfig('activation')));
    delete doc.config.activationModel;
    assert.throws(()=>parseProject(JSON.stringify(doc)),/ausente/);
    for(const version of [5,6]) for(const activationModel of ['outro',null,12]) {
        assert.throws(()=>parseProject(JSON.stringify({format:'code-buddy-project',version,
            config:{...createProjectConfig('activation'),activationModel}})));
    }
    assert.throws(()=>parseProject(JSON.stringify({...doc,version:16})),/versão/);
});

test('troca real para ativação recupera rascunho ausente e preserva o estande',()=>{
    const source=readFileSync(resolve('app/page.tsx'),'utf8');
    const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let fn;
    function visit(n) {if(ts.isFunctionDeclaration(n)&&n.name?.text==='changeProjectType') fn=n; ts.forEachChild(n,visit);}
    visit(ast); assert.ok(fn);
    const c={...base(),name:'Estande em edição',target:'max'};
    const projectDrafts={current:{stand:c,palco:createProjectConfig('palco'),lounge:createProjectConfig('lounge')}};
    let state=c;
    const ctx=vm.createContext({c,projectDrafts,projectTypes,createProjectConfig,imageRequest:{current:0},
        setC:value=>{state=value;},setSelectedId:()=>{},setAssemblyError:()=>{},setOutput:()=>{},
        setTab:()=>{},setError:()=>{},setNotice:()=>{},setCopied:()=>{}});
    vm.runInContext(ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
    ctx.changeProjectType('activation');
    assert.equal(state.projectType,'activation'); assert.equal(state.target,'max'); validate(state);
    ctx.c=state; ctx.changeProjectType('stand');
    assert.equal(state.name,'Estande em edição'); assert.equal(state.target,'max');
});
