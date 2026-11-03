'use client';

import { useEffect, useRef } from 'react';

export const tourSteps = [
    { id: 'insert', title: 'Crie sua primeira peça', description: 'Em Inserir, clique em Bloco para adicionar uma peça. Você também pode pressionar T para inserir texto.', keys: ['T'] },
    { id: 'move', title: 'Selecione e mova uma peça', description: 'Clique em uma peça. Arraste uma seta colorida para mover em um eixo ou use V e arraste a própria peça.', keys: ['M', 'V'] },
    { id: 'draw', title: 'Desenhe na planta', description: 'Abra Planta. Pressione R e arraste entre dois cantos para criar um bloco. Use B para desenhar uma parede. Esc cancela o desenho.', keys: ['R', 'B', 'Esc'] },
    { id: 'adjust', title: 'Ajuste e duplique', description: 'Com uma peça selecionada, pressione G para girar, S para redimensionar ou Ctrl + D para duplicar.', keys: ['G', 'S', 'Ctrl + D'] },
    { id: 'environment', title: 'Escolha um cenário', description: 'Abra Cena → Cenário para escolher o fundo branco, a área com grama, o hall de hotel ou o pavilhão cinza.', keys: [] },
    { id: 'save', title: 'Salve ou exporte', description: 'Salve em JSON para editar depois. Em Exportar, escolha Blender ou 3ds Max. Cenas com fotos ou logos baixam em ZIP com a pasta materiais.', keys: ['Ctrl + Z', 'Ctrl + S'] },
] as const;

const shortcuts = [
    ['M', 'Selecionar'], ['V', 'Mover'], ['G', 'Girar'], ['S', 'Redimensionar'],
    ['H', 'Navegar'], ['R', 'Desenhar retângulo'], ['B', 'Desenhar parede'],
    ['T', 'Inserir texto'], ['0', 'Enquadrar a cena'],
    ['Ctrl + D', 'Duplicar a peça'], ['Delete ou Backspace', 'Excluir a peça'],
    ['Ctrl + Z', 'Desfazer'], ['Ctrl + Shift + Z ou Ctrl + Y', 'Refazer'],
    ['Ctrl + S', 'Salvar a cena em JSON'], ['Esc', 'Cancelar o gesto ou limpar a seleção'],
] as const;

export type FreeHelpMode = 'welcome' | 'menu' | 'tour' | 'shortcuts' | null;
export const freeTourStorageKey = 'code-buddy-free-tour-seen-v1';

type Props = {
    mode: Exclude<FreeHelpMode, null>;
    step: number;
    onStep: (index: number) => void;
    onShortcuts: () => void;
    onClose: () => void;
};

export function FreeSceneHelp({ mode, step, onStep, onShortcuts, onClose }: Props) {
    const titleRef = useRef<HTMLHeadingElement>(null);
    const current = tourSteps[step];
    const last = step === tourSteps.length - 1;

    useEffect(() => { titleRef.current?.focus(); }, [mode, step]);

    const title = mode === 'tour' ? current.title
        : mode === 'shortcuts' ? 'Atalhos da Cena Livre'
        : mode === 'welcome' ? 'Conheça a Cena Livre 3D'
        : 'Ajuda do editor';

    return (
        <section className="free-help-card" role="dialog" aria-labelledby="free-help-title" data-free-help
            onKeyDown={event=>{
                if (event.key === 'Escape') {
                    event.stopPropagation();
                    onClose();
                }
            }}>
            <div className="free-help-heading">
                <h2 ref={titleRef} tabIndex={-1} id="free-help-title">{title}</h2>
                <button type="button" aria-label="Fechar ajuda" onClick={onClose}>×</button>
            </div>
            {mode === 'welcome' && <p>Experimente as ferramentas básicas e aprenda os atalhos enquanto monta a cena.</p>}
            {mode === 'tour' && <>
                <small>Etapa {step + 1} de {tourSteps.length}</small>
                <p>{current.description}</p>
                {current.keys.length > 0 && <div className="free-help-keys">{current.keys.map(key=><kbd key={key}>{key}</kbd>)}</div>}
            </>}
            {mode === 'shortcuts' && <>
                <p>Use as teclas com o foco no editor, fora dos campos de texto e medidas. No Mac, use ⌘ no lugar de Ctrl.</p>
                <dl className="free-help-shortcuts">
                    {shortcuts.map(([key, action])=><div key={key}><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>)}
                </dl>
            </>}
            <div className="free-help-actions">
                {mode === 'welcome' && <>
                    <button type="button" onClick={onClose}>Pular</button>
                    <button type="button" className="free-primary" onClick={()=>onStep(0)}>Começar tour</button>
                </>}
                {mode === 'menu' && <>
                    <button type="button" onClick={()=>onStep(0)}>Rever tour</button>
                    <button type="button" className="free-primary" onClick={onShortcuts}>Ver todos os atalhos</button>
                </>}
                {mode === 'tour' && <>
                    <button type="button" onClick={onClose}>Pular tour</button>
                    <button type="button" onClick={()=>onStep(step - 1)} disabled={step === 0}>Voltar</button>
                    <button type="button" className="free-primary" onClick={()=>last ? onClose() : onStep(step + 1)}>{last ? 'Concluir' : 'Próximo'}</button>
                </>}
                {mode === 'shortcuts' && <button type="button" onClick={onClose}>Fechar</button>}
            </div>
        </section>
    );
}
