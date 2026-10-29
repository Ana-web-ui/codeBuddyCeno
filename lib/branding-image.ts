export const MAX_ARTWORK_BYTES = 2 * 1024 * 1024;
export const MAX_ARTWORK_PIXELS = 16 * 1024 * 1024;
const dimensions = new Map<string, Readonly<{ width: number; height: number }>>();

/** Lê os cabeçalhos locais; não busca URLs nem depende do DOM para abrir um JSON. */
export function artworkImageSize(image: string): Readonly<{ width: number; height: number }> {
    if (typeof image !== 'string' || image.length > 64 + 4 * Math.ceil(MAX_ARTWORK_BYTES / 3))
        throw new Error('Use uma imagem de até 2 MB.');
    const cached = dimensions.get(image);
    if (cached) return cached;
    const match = image.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) throw new Error('Use uma imagem PNG ou JPG.');
    let binary: string;
    try { binary = atob(match[2]); } catch { throw new Error('Os dados da imagem são inválidos.'); }
    if (binary.length > MAX_ARTWORK_BYTES) throw new Error('Use uma imagem de até 2 MB.');
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)), view = new DataView(bytes.buffer);
    let width = 0, height = 0;
    if (match[1] === 'png') {
        if (bytes.length < 33 || ![137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) ||
            view.getUint32(8) !== 13 || String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR')
            throw new Error('O cabeçalho da imagem PNG é inválido.');
        width = view.getUint32(16); height = view.getUint32(20);
    } else {
        if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new Error('O cabeçalho da imagem JPG é inválido.');
        let p = 2;
        while (p < bytes.length) {
            if (bytes[p++] !== 255) break;
            while (p < bytes.length && bytes[p] === 255) p++;
            const marker = bytes[p++];
            if (marker === 217 || marker === 218) break;
            if (marker === 1 || marker === 216 || (marker >= 208 && marker <= 215)) continue;
            if (p + 2 > bytes.length) break;
            const length = view.getUint16(p);
            if (length < 2 || p + length > bytes.length) break;
            if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
                if (length < 8) break;
                height = view.getUint16(p + 3); width = view.getUint16(p + 5); break;
            }
            p += length;
        }
    }
    if (!width || !height) throw new Error('Não foi possível ler as dimensões da imagem.');
    if (width > 8192 || height > 8192 || width * height > MAX_ARTWORK_PIXELS)
        throw new Error('Use uma imagem com até 16 megapixels e 8192 pixels em cada lado.');
    const result = Object.freeze({ width, height });
    if (dimensions.size >= 4) dimensions.delete(dimensions.keys().next().value!);
    dimensions.set(image, result);
    return result;
}
