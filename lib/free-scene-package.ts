import { strToU8, zipSync } from 'three/addons/libs/fflate.module.js';
import { sceneFilename, validateFreeScene } from './free-scene';
import type { FreeScene } from './free-scene';
import { exportFreeBlender, exportFreeMax } from './free-scene-exporters';

export function exportFreePackage(scene: FreeScene, target: 'blender' | 'max'): Uint8Array {
    validateFreeScene(scene);

    const files: Record<string, Uint8Array> = {};
    const artwork = new Map<string, string>();
    for (const { image } of scene.objects) {
        if (!image || artwork.has(image)) continue;

        const comma = image.indexOf(',');
        const extension = image.startsWith('data:image/png;') ? 'png' : 'jpg';
        const path = 'materiais/arte-' + (artwork.size + 1) + '.' + extension;
        files[path] = Uint8Array.from(atob(image.slice(comma + 1)), char => char.charCodeAt(0));
        artwork.set(image, path);
    }

    const scriptName = sceneFilename(scene, target === 'blender' ? 'py' : 'ms');
    const script = target === 'blender' ? exportFreeBlender(scene, artwork) : exportFreeMax(scene, artwork);
    files[scriptName] = strToU8(script);
    files['LEIA-ME.txt'] = strToU8([
        'CenoLab - Cena Livre 3D',
        '',
        '1. Extraia todo o ZIP para uma pasta.',
        '2. Mantenha a pasta materiais ao lado do script ' + scriptName + '.',
        target === 'blender'
            ? '3. No Blender, abra o script em Scripting > Open e clique em Run Script. As imagens serão incorporadas ao salvar o .blend.'
            : '3. No 3ds Max, use Scripting > Run Script. Mantenha os arquivos de materiais ao compartilhar a cena .max.',
        '',
    ].join('\r\n'));
    return zipSync(files, { level: 0 });
}
