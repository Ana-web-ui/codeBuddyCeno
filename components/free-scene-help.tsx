'use client';

import { useEffect, useRef } from 'react';

export const tourSteps = [
    { id: 'insert', title: 'Crie sua primeira peça', description: 'Em Adicionar, clique em Bloco para adicionar uma peça. Você também pode pressionar T para inserir texto.', keys: ['T'] },
    { id: 'move', title: 'Selecione e mova uma peça', description: 'Clique em uma peça. Arraste uma seta colorida para mover em um eixo ou use V e arraste a própria peça. Segure Shift durante o arraste para travar em X ou Y.', keys: ['M', 'V', 'Shift'] },
    { id: 'draw', title: 'Desenhe na planta', description: 'Abra Planta. Pressione R e arraste entre dois cantos para criar um bloco. Use B para desenhar uma parede. As medidas aparecem enquanto você arrasta. Esc cancela o desenho.', keys: ['R', 'B', 'Esc'] },
    { id: 'adjust', title: 'Ajuste e duplique', description: 'Em Propriedades, use Menor e Maior para mudar o tamanho em 10%. Manter proporções ajusta as três medidas juntas. As medidas também aparecem na cena durante o desenho e o redimensionamento. Você também pode usar G para girar, S para redimensionar e Ctrl + D para duplicar, ou Ctrl + C e Ctrl + V.', keys: ['G', 'S', 'Ctrl + D', 'Ctrl + C', 'Ctrl + V'] },
    { id: 'environment', title: 'Escolha um cenário', description: 'Abra Ambiente e grade → Cenário para escolher o fundo branco, a área com grama, o hall de hotel ou o pavilhão cinza.', keys: [] },
    { id: 'save', title: 'Salve ou exporte', description: 'Salve em JSON para editar depois. Escolha Blender ou 3ds Max. Use Baixar para obter o arquivo indicado ou Copiar script para copiar o conteúdo. Cenas com fotos ou logos baixam em ZIP com a pasta materiais.', keys: ['Ctrl + Z', 'Ctrl + S'] },
] as const;

const shortcuts = [
    ['M', 'Selecionar'], ['V', 'Mover'], ['G', 'Girar'], ['S', 'Redimensionar'],
    ['Shift + arrastar a peça', 'Mover em uma direção horizontal (X ou Y)'],
    ['H', 'Navegar'], ['R', 'Desenhar retângulo'], ['B', 'Desenhar parede'],
    ['T', 'Inserir texto'], ['0', 'Enquadrar a cena'],
    ['Ctrl + D', 'Duplicar a peça'], ['Ctrl + C', 'Copiar a peça selecionada'], ['Ctrl + V', 'Colar a peça copiada'], ['Delete ou Backspace', 'Excluir a peça'],
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
