import { defaults, validate } from './generator';
import type { Config } from './generator';
import { createProjectConfig } from './project-types';
import { checkTransforms } from './assembly';
import { storageDefaults } from './storage';
import { activationDefaults, photoDefaults, demoDefaults } from './activation';
import { materials } from './generator';
import { samplingDefaults } from './sampling';
import { receptionFinishDefaults } from './reception-finish';
import { counterDefaults } from './counter';
import { receptionDefaults, receptionQueueDefaults } from './reception';
import { panelDefaults } from './panel';
import { shelvingDefaults } from './shelving';

export const MAX_PROJECT_BYTES = 4 * 1024 * 1024;
const FORMAT = 'code-buddy-project';
const VERSION = 16;

function object(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Arquivos antigos recebem os padrões do seu tipo, sem substituir valores presentes. */
function checkedConfig(
    value: unknown,
    legacy = false,
    migrateStorage = false,
    migrateActivation = false,
    migrateZones = false,
    migratePhoto = false,
    migrateDemo = false,
    migrateSampling = false,
    migrateReception = false,
    migrateReceptionQueue = false,
    migrateCounter = false,
    migrateReceptionFinish = false,
    migratePanel = false,
    migrateShelving = false,
): Config  {
    if (!object(value)) {
        throw new Error('O projeto é inválido.');
    }
    if (
        value.projectType !== 'stand' &&
        value.projectType !== 'palco' &&
        value.projectType !== 'lounge' &&
        value.projectType !== 'activation' &&
        value.projectType !== 'reception'
    ) {
        throw new Error('Tipo de projeto inválido.');
    }
    if (Object.keys(value).some(key => !Object.hasOwn(defaults, key))) {
        throw new Error('O projeto contém campos desconhecidos. Confira se foi salvo nesta versão do Code Buddy.');
    }
    const initial = createProjectConfig(value.projectType);
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(defaults) as (keyof Config)[]) {
        const present = Object.hasOwn(value, key);

        const canUseDefault =
            legacy ||
            (migrateShelving && Object.hasOwn(shelvingDefaults, key)) ||
            (migratePanel && Object.hasOwn(panelDefaults, key)) ||
            (migrateReceptionFinish && Object.hasOwn(receptionFinishDefaults, key)) ||
            (migrateCounter && Object.hasOwn(counterDefaults, key)) ||
            (
                migrateReceptionQueue &&
                Object.hasOwn(receptionQueueDefaults, key)
            ) ||
            (
                migrateReception &&
                Object.hasOwn(receptionDefaults, key)
            ) ||
            (
                migrateSampling &&
                Object.hasOwn(samplingDefaults, key)
            ) ||
            (
                migrateDemo &&
                Object.hasOwn(demoDefaults, key)
            ) ||
            (
                migratePhoto &&
                Object.hasOwn(photoDefaults, key)
            ) ||
            (
                migrateZones &&
                key !== 'activationModel' &&
                Object.hasOwn(activationDefaults, key)
            ) ||
            (
                migrateStorage &&
                Object.hasOwn(storageDefaults, key)
            ) ||
            (
                migrateActivation &&
                Object.hasOwn(activationDefaults, key)
            );

        if (!present && !canUseDefault) {
            throw new Error(`O campo “${key}” está ausente.`);
        }

        const item = present ? value[key]
            : Object.hasOwn(shelvingDefaults, key)
                ? shelvingDefaults[key as keyof typeof shelvingDefaults]
            : Object.hasOwn(panelDefaults, key)
                ? panelDefaults[key as keyof typeof panelDefaults]
            : Object.hasOwn(receptionFinishDefaults, key)
                ? receptionFinishDefaults[key as keyof typeof receptionFinishDefaults]
            : Object.hasOwn(counterDefaults, key)
                ? counterDefaults[key as keyof typeof counterDefaults]
                : initial[key];
        if (key === 'objectTransforms') {
            checkTransforms(item);
            clean[key] = Object.fromEntries(Object.entries(item).map(([id, t]) => [id, { x: t.x, y: t.y, rotation: t.rotation }]));
        } else {
            if (typeof item !== typeof defaults[key] || (typeof item === 'number' && !Number.isFinite(item))) {
                throw new Error(`O campo “${key}” tem um valor inválido.`);
            }
            clean[key] = item;
        }
    }
    const enums: Record<string, readonly string[]> = {
        activationModel: ['touch', 'photo', 'demo', 'sampling'],
        samplingWasteSide: ['left','right'],
        chairDistribution: ['central', 'lateral'],
        chairGenerationMode: ['quantity', 'fill'],
        stoolDistribution: ['free', 'bistro'],
        loungeMode: ['free', 'set'],

        storageDoorSide: ['front', 'back', 'left', 'right'],
        storageDoorHinge: ['left', 'right'],
        storageDoorOpening: ['inward', 'outward'],
        receptionExitSide: ['left', 'right'],
    };
    for (const [key, options] of Object.entries(enums)) {
        if (!options.includes(clean[key] as string)) throw new Error(`Opção inválida no campo “${key}”.`);
    }
    if ((clean.screenName as string).length > 255) throw new Error('O nome da imagem é muito longo.');
    const config = clean as Config;
    validate(config);
    for (
        const key of ['storageWallMat', 'storageDoorMat'] as const
    ) {
        if (!materials.some(material => material.value === clean[key])) {
            throw new Error(`Material inválido no campo “${key}”.`);
        }
    }

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
    if (!object(document)) throw new Error('O arquivo de projeto é inválido.');
    if (Object.hasOwn(document, 'format') || Object.hasOwn(document, 'version')) {
        if (document.format !== FORMAT) throw new Error('Escolha um projeto JSON salvo pelo Code Buddy.');
                  if (
            document.version !== 1 &&
            document.version !== 2 &&
            document.version !== 3 &&
            document.version !== 4 &&
            document.version !== 5 &&
            document.version !== 6 &&
            document.version !== 7 &&
            document.version !== 8 &&
            document.version !== 9 &&
            document.version !== 10 &&
            document.version !== 11 &&
            document.version !== 12 &&
            document.version !== 13 &&
            document.version !== 14 &&
            document.version !== 15 &&
            document.version !== VERSION
        ) {
            throw new Error(
                'A versão deste arquivo de projeto não é compatível com este Code Buddy.',
            );
        
        }

        return checkedConfig(
            document.config,
            document.version === 1 || document.version === 2,
            document.version === 3,
            document.version === 3 || document.version === 4 || document.version === 5,
            typeof document.version === 'number' && document.version <= 6,
            typeof document.version === 'number' && document.version <= 7,
            typeof document.version === 'number' && document.version <= 8,
            typeof document.version === 'number' && document.version <= 9,
            typeof document.version === 'number' && document.version <= 10,
            typeof document.version === 'number' && document.version <= 11,
            typeof document.version === 'number' && document.version <= 12,
            typeof document.version === 'number' && document.version <= 13,
            typeof document.version === 'number' && document.version <= 14,
            typeof document.version === 'number' && document.version <= 15,
        );
    }
    // Formatos antigos da interface: { config } e configuração direta.
    return checkedConfig(Object.hasOwn(document, 'config') ? document.config : document, true);
}

export function projectFilename(config: Config): string {
    const name = config.name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/[. ]+$/g, '');
    return `${name || 'projeto'}.json`;
}
