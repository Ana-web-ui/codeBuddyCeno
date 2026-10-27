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
const { getStandWalls } = require(join(output, 'stand-config.js'));
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
