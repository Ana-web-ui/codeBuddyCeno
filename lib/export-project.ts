/** Chave estável e curta para nomear coleções e camadas por projeto. */
export function exportProjectKey(name: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
        hash = Math.imul(hash ^ name.charCodeAt(i), 0x01000193);
    }
    const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        .slice(0, 24) || 'projeto';
    return `${slug}_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
