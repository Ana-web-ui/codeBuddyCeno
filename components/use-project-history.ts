"use client";
import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Config } from '@/lib/generator';

/** Histórico local da edição: imagens e OBJ compartilham as strings imutáveis. */
export function useProjectHistory(initial: () => Config) {
    const [history, setHistory] = useState(() => ({ past: [] as Config[], present: initial(), future: [] as Config[] }));
    const setConfig: Dispatch<SetStateAction<Config>> = useCallback(action => setHistory(previous => {
        const next = typeof action === 'function' ? action(previous.present) : action;
        if (next === previous.present) return previous;
        return { past: [...previous.past.slice(-39), previous.present], present: next, future: [] };
    }), []);
    const undo = useCallback(() => setHistory(h => h.past.length ? {
        past: h.past.slice(0,-1), present: h.past[h.past.length-1], future: [h.present,...h.future].slice(0,40),
    } : h), []);
    const redo = useCallback(() => setHistory(h => h.future.length ? {
        past: [...h.past,h.present].slice(-40), present: h.future[0], future: h.future.slice(1),
    } : h), []);
    return { config: history.present, setConfig, undo, redo, canUndo: !!history.past.length, canRedo: !!history.future.length };
}
