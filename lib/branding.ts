export type ArtworkMode = 'contain' | 'cover';

export type BrandingConfig = {
    panelArtEnabled: boolean;
    panelArtImage: string;
    panelArtName: string;
    panelArtMode: ArtworkMode;
    panelArtScale: number;
    panelArtOffsetX: number;
    panelArtOffsetY: number;

    counterArtEnabled: boolean;
    counterArtImage: string;
    counterArtName: string;
    counterArtMode: ArtworkMode;
    counterArtScale: number;
    counterArtOffsetX: number;
    counterArtOffsetY: number;
};

export const MAX_ARTWORK_BYTES = 2 * 1024 * 1024;

export const brandingDefaults: BrandingConfig = {
    panelArtEnabled: false,
    panelArtImage: '',
    panelArtName: '',
    panelArtMode: 'contain',
    panelArtScale: 1,
    panelArtOffsetX: 0,
    panelArtOffsetY: 0,

    counterArtEnabled: false,
    counterArtImage: '',
    counterArtName: '',
    counterArtMode: 'contain',
    counterArtScale: 1,
    counterArtOffsetX: 0,
    counterArtOffsetY: 0,
};

/**
 * contain: preserva a imagem inteira, indicado para logos.
 * cover: preenche a superfície, podendo recortar a imagem.
 *
 * Scale: 1 = tamanho definido pelo enquadramento.
 * OffsetX/Y: fração da largura/altura da superfície.
 * Valores positivos deslocam para direita/cima,
 * olhando a peça de frente.
 */
export function validateBranding(c: BrandingConfig): void {
    for (const prefix of ['panelArt', 'counterArt'] as const) {
        const label = prefix === 'panelArt'
            ? 'Arte dos painéis'
            : 'Arte dos balcões';

        const enabled = c[`${prefix}Enabled`];
        const image = c[`${prefix}Image`];
        const name = c[`${prefix}Name`];
        const mode = c[`${prefix}Mode`];
        const scale = c[`${prefix}Scale`];
        const offsetX = c[`${prefix}OffsetX`];
        const offsetY = c[`${prefix}OffsetY`];

        if (typeof enabled !== 'boolean') {
            throw new Error(`${label}: opção de ativação inválida.`);
        }

        if (typeof name !== 'string' || name.length > 255) {
            throw new Error(`${label}: use um nome de até 255 caracteres.`);
        }

        if (mode !== 'contain' && mode !== 'cover') {
            throw new Error(`${label}: enquadramento inválido.`);
        }

        if (!Number.isFinite(scale) || scale < .1 || scale > 3) {
            throw new Error(`${label}: use uma escala entre 0,1 e 3.`);
        }

        if (
            !Number.isFinite(offsetX) ||
            !Number.isFinite(offsetY) ||
            Math.abs(offsetX) > .5 ||
            Math.abs(offsetY) > .5
        ) {
            throw new Error(
                `${label}: os deslocamentos devem ficar entre -0,5 e 0,5.`,
            );
        }

        if (typeof image !== 'string') {
            throw new Error(`${label}: imagem inválida.`);
        }

        if (!image) {
            if (enabled) {
                throw new Error(`${label}: escolha uma imagem para ativar.`);
            }
            continue;
        }

        // Limita o tamanho antes de decodificar.
        const maxDataUrlLength =
            64 + 4 * Math.ceil(MAX_ARTWORK_BYTES / 3);

        if (image.length > maxDataUrlLength) {
            throw new Error(`${label}: use uma imagem de até 2 MB.`);
        }

        const match = image.match(
            /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/,
        );

        if (!match) {
            throw new Error(`${label}: use uma imagem PNG ou JPG.`);
        }

        let bytes: string;

        try {
            bytes = atob(match[2]);
        } catch {
            throw new Error(`${label}: os dados da imagem são inválidos.`);
        }

        if (bytes.length > MAX_ARTWORK_BYTES) {
            throw new Error(`${label}: use uma imagem de até 2 MB.`);
        }

        const signature = match[1] === 'png'
            ? [137, 80, 78, 71, 13, 10, 26, 10]
            : [255, 216, 255];

        if (
            !signature.every(
                (value, index) => bytes.charCodeAt(index) === value,
            )
        ) {
            throw new Error(
                `${label}: o conteúdo não corresponde a uma imagem PNG ou JPG.`,
            );
        }
    }
}