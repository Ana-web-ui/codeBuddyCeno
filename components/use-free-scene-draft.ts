'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createFreeSceneDraft } from '@/lib/free-scene-draft';
import type { FreeScene } from '@/lib/free-scene';

type DraftStatus = 'restoring' | 'ready' | 'saving' | 'saved' | 'error' | 'restore-error';

export function useFreeSceneDraft(onRestore: (scene: FreeScene | null) => void) {
    const store = useRef<ReturnType<typeof createFreeSceneDraft> | null>(null);
    const revision = useRef(0);
    const unsaved = useRef(false);
    const mounted = useRef(false);
    const [restoring, setRestoring] = useState(true);
    const [status, setStatus] = useState<DraftStatus>('restoring');

    useEffect(() => {
        let active = true;
        mounted.current = true;
        const restore = async () => {
            try {
                const database = createFreeSceneDraft(window.indexedDB);
                store.current = database;
                const scene = await database.read();
                if (!active) return;
                onRestore(scene);
                setStatus(scene ? 'saved' : 'ready');
            } catch {
                if (!active) return;
                onRestore(null);
                setStatus('restore-error');
            } finally {
                if (active) setRestoring(false);
            }
        };
        void restore();
        const beforeUnload = (event: BeforeUnloadEvent) => {
            const input = document.activeElement;
            if (input instanceof HTMLInputElement && input.type === 'number') input.blur();
            if (!unsaved.current) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => {
            active = false;
            mounted.current = false;
            store.current?.close();
            window.removeEventListener('beforeunload', beforeUnload);
        };
    }, [onRestore]);

    const save = useCallback((scene: FreeScene) => {
        const ticket = ++revision.current;
        unsaved.current = true;
        setStatus('saving');
        const write = async () => {
            try {
                if (!store.current) store.current = createFreeSceneDraft(window.indexedDB);
                await store.current.write(scene);
                if (ticket !== revision.current || !mounted.current) return;
                unsaved.current = false;
                setStatus('saved');
            } catch {
                if (ticket === revision.current && mounted.current) setStatus('error');
            }
        };
        void write();
    }, []);

    return {restoring, status, save};
}
