import { artworkImageSize, MAX_ARTWORK_BYTES } from './branding-image';

/** Decodifica antes de aceitar; o canvas normaliza orientação EXIF e preserva alfa do PNG. */
export async function readArtworkFile(file: File): Promise<string> {
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > MAX_ARTWORK_BYTES)
        throw new Error('Escolha uma imagem PNG ou JPG de até 2 MB.');
    const raw = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagem inválida.'));
        reader.readAsDataURL(file);
    });
    artworkImageSize(raw);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('A imagem não pôde ser decodificada. Exporte novamente como PNG ou JPG.'));
        img.src = raw;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.');
    context.drawImage(image, 0, 0);
    const normalized = canvas.toDataURL(file.type, .92);
    artworkImageSize(normalized);
    return normalized;
}
