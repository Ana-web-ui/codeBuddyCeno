"use client";
import { MousePointer2, Move, Hand, CopyPlus, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Trash2 } from 'lucide-react';
export type EditorTool = 'select' | 'move' | 'hand';
export function EditorToolbar({tool, setTool, duplicate, remove, undo, redo, canUndo, canRedo, canDuplicate, canRemove,
    duplicateReason, zoom, setZoom, fit, busy}: {
    tool: EditorTool; setTool: (tool: EditorTool)=>void; duplicate: ()=>void; remove: ()=>void;
    undo: ()=>void; redo: ()=>void; canUndo: boolean; canRedo: boolean; canDuplicate: boolean; canRemove: boolean;
    duplicateReason: string; zoom: number; setZoom: (value: number)=>void; fit: ()=>void; busy: boolean;
}) {
    return <nav className="editor-tools" aria-label="Ferramentas da planta">
        <span className="tools-caption">EDITAR</span>
        {([{id:'select',label:'Selecionar (M)',Icon:MousePointer2},{id:'move',label:'Mover (V)',Icon:Move},{id:'hand',label:'Navegar (H)',Icon:Hand}] as const).map(({id,label,Icon})=>
            <button key={id} type="button" title={label} aria-label={label} aria-pressed={tool===id} disabled={busy} onClick={()=>setTool(id)}><Icon size={20}/></button>)}
        <span className="tool-separator"/>
        <button type="button" title={duplicateReason || 'Duplicar seleção (Ctrl+D)'} aria-label="Duplicar seleção" disabled={!canDuplicate || busy} onClick={duplicate}><CopyPlus size={20}/></button>
        <button type="button" title="Excluir cópia selecionada (Delete). Peças originais são retiradas nos parâmetros." aria-label="Excluir cópia selecionada" disabled={!canRemove || busy} onClick={remove}><Trash2 size={19}/></button>
        <span className="tool-separator"/>
        <button type="button" title="Desfazer (Ctrl+Z)" aria-label="Desfazer edição" disabled={!canUndo || busy} onClick={undo}><Undo2 size={20}/></button>
        <button type="button" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer edição" disabled={!canRedo || busy} onClick={redo}><Redo2 size={20}/></button>
        <span className="tool-separator"/>
        <button type="button" title="Aproximar" aria-label="Aproximar planta" disabled={zoom>=3 || busy} onClick={()=>setZoom(Math.min(3,zoom+.25))}><ZoomIn size={20}/></button>
        <span className="tools-zoom">{Math.round(zoom*100)}%</span>
        <button type="button" title="Afastar" aria-label="Afastar planta" disabled={zoom<=.5 || busy} onClick={()=>setZoom(Math.max(.5,zoom-.25))}><ZoomOut size={20}/></button>
        <button type="button" title="Enquadrar toda a planta (0)" aria-label="Enquadrar planta" disabled={busy} onClick={fit}><Maximize size={19}/></button>
    </nav>;
}
