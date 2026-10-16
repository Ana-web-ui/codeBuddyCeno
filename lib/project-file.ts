import { defaults, filename, validate } from './generator';
import type { Config } from './generator';

export const MAX_PROJECT_BYTES = 4 * 1024 * 1024;
const FORMAT = 'code-buddy-project';
const VERSION = 1;

function object(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Copia somente campos conhecidos e confere os tipos antes da validação geométrica. */
function checkedConfig(value: unknown): Config {
    if (!object(value)) throw new Error('O arquivo não contém uma configuração de projeto válida.');
    const keys = Object.keys(defaults) as (keyof Config)[];
    if (Object.keys(value).some(key => !Object.hasOwn(defaults, key))) {
        throw new Error('O projeto contém campos desconhecidos. Confira se foi salvo nesta versão do Code Buddy.');
    }
    const clean: Record<string, unknown> = {};
    for (const key of keys) {
        const item = value[key];
        if (!Object.hasOwn(value, key) || typeof item !== typeof defaults[key] ||
            (typeof item === 'number' && !Number.isFinite(item))) {
            throw new Error(`O campo “${key}” está ausente ou tem um valor inválido.`);
        }
        clean[key] = item;
    }
    const enums: Record<string, readonly string[]> = {
        chairDistribution: ['central', 'lateral'],
        chairGenerationMode: ['quantity', 'fill'],
        stoolDistribution: ['free', 'bistro'],
        loungeMode: ['free', 'set'],
    };
    for (const [key, options] of Object.entries(enums)) {
        if (!options.includes(clean[key] as string)) throw new Error(`Opção inválida no campo “${key}”.`);
    }
    if ((clean.screenName as string).length > 255) throw new Error('O nome da imagem é muito longo.');
    const config = clean as Config;
    validate(config);
    return config;
}

export function serializeProject(config: Config): string {
    const clean = checkedConfig(config);
    const text = JSON.stringify({ format: FORMAT, version: VERSION, config: clean }, null, 2);
    if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) {
        throw new Error('O projeto ultrapassa 4 MB. Reduza a imagem da tela e tente novamente.');
    }
    return text;
}

export function parseProject(text: string): Config {
    if (new TextEncoder().encode(text).length > MAX_PROJECT_BYTES) throw new Error('Use um arquivo de projeto de até 4 MB.');
    let document: unknown;
    try { document = JSON.parse(text); }
    catch { throw new Error('Não foi possível abrir: o arquivo não é um JSON válido.'); }
    if (!object(document) || document.format !== FORMAT) {
        throw new Error('Escolha um projeto JSON salvo pelo Code Buddy.');
    }
    if (document.version !== VERSION) {
        throw new Error('A versão deste arquivo de projeto não é compatível com este Code Buddy.');
    }
    return checkedConfig(document.config);
}

export function projectFilename(config: Config): string {
    return filename(config).replace(/\.(py|ms)$/, '.codebuddy.json');
}
