import { parseFreeScene, stringifyFreeScene } from './free-scene';
import type { FreeScene } from './free-scene';

export function createFreeSceneDraft(factory: IDBFactory) {
    let connection: Promise<IDBDatabase> | null = null;

    function open(): Promise<IDBDatabase> {
        if (connection) return connection;
        connection = new Promise((resolve, reject) => {
            let blocked = false;
            const request = factory.open('cenolab-drafts', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('scenes');
            request.onerror = () => { connection = null; reject(request.error); };
            request.onblocked = () => { blocked = true; connection = null; reject(new Error('O armazenamento está ocupado em outra aba.')); };
            request.onsuccess = () => {
                const database = request.result;
                if (blocked) { database.close(); return; }
                database.onversionchange = () => { database.close(); connection = null; };
                resolve(database);
            };
        });
        return connection;
    }

    return {
        async read(): Promise<FreeScene | null> {
            const database = await open();
            const text = await new Promise<unknown>((resolve, reject) => {
                const transaction = database.transaction('scenes', 'readonly');
                const request = transaction.objectStore('scenes').get('current');
                transaction.oncomplete = () => resolve(request.result);
                transaction.onabort = () => reject(transaction.error ?? new Error('Não foi possível recuperar o rascunho.'));
            });
            if (text === undefined) return null;
            if (typeof text !== 'string') throw new Error('O rascunho salvo está inválido.');
            return parseFreeScene(text);
        },
        async write(scene: FreeScene): Promise<void> {
            // Serialize before waiting for the database, capturing this exact edit.
            const text = stringifyFreeScene(scene);
            const database = await open();
            await new Promise<void>((resolve, reject) => {
                const transaction = database.transaction('scenes', 'readwrite');
                transaction.oncomplete = () => resolve();
                transaction.onabort = () => reject(transaction.error ?? new Error('Não foi possível salvar o rascunho.'));
                transaction.objectStore('scenes').put(text, 'current');
            });
        },
        close() { void connection?.then(database => database.close(), () => {}); },
    };
}
