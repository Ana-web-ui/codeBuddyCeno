import { artworkImageSize } from './branding-image';
export { MAX_ARTWORK_BYTES } from './branding-image';
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

        try { artworkImageSize(image); }
        catch (error) { throw new Error(`${label}: ${error instanceof Error ? error.message : 'Imagem inválida.'}`); }
    }
}
