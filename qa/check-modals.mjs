import fs from 'node:fs/promises';
import path from 'node:path';
import { getAllFlowSpecs } from './flows/index.mjs';
import { rootDir } from './lib/config.mjs';

const specs = getAllFlowSpecs();
const ownershipMap = new Map();
const failures = [];
const sharedFrontendOwners = new Set([
    'frontend/js/base-modal.js',
    'frontend/js/global-init.js'
]);

async function getFrontendJsFiles() {
    const frontendJsDir = path.resolve(rootDir, 'frontend', 'js');
    const entries = await fs.readdir(frontendJsDir, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
        .map((entry) => path.resolve(frontendJsDir, entry.name));
}

const frontendJsFiles = await getFrontendJsFiles();

for (const spec of specs) {
    const modalEntries = [
        ...((spec.actions || [])
            .filter((action) => action.assertionType === 'modal' && action.expectVisible)
            .map((action) => ({
                label: action.label,
                selector: action.expectVisible,
                ownerFiles: action.ownerFiles || []
            }))),
        ...((spec.modalOwnership || []).map((entry) => ({
            label: entry.label,
            selector: entry.selector,
            ownerFiles: entry.ownerFiles || []
        })))
    ];

    for (const entry of modalEntries) {
        if (!entry.ownerFiles?.length) {
            failures.push(`La acción "${entry.label}" en ${spec.key} no declara ownerFiles.`);
            continue;
        }

        const ownerFiles = entry.ownerFiles.map((ownerFile) => ownerFile.replace(/\\/g, '/'));
        const ownershipKey = `${spec.key}::${entry.selector}`;
        const previousOwner = ownershipMap.get(ownershipKey);
        const ownerSignature = ownerFiles.join('|');
        if (previousOwner && previousOwner !== ownerSignature) {
            failures.push(`El modal ${entry.selector} en ${spec.key} tiene ownership duplicado incompatible.`);
        } else {
            ownershipMap.set(ownershipKey, ownerSignature);
        }

        for (const ownerFile of ownerFiles) {
            const absolutePath = path.resolve(rootDir, ownerFile);
            try {
                await fs.access(absolutePath);
            } catch {
                failures.push(`No existe el ownerFile ${ownerFile} para el modal ${entry.selector}.`);
            }
        }

        const jsOwners = ownerFiles.filter((ownerFile) => ownerFile.startsWith('frontend/js/'));
        if (!jsOwners.length) {
            failures.push(`El modal ${entry.selector} en ${spec.key} no declara un owner JS explícito.`);
        }

        const referencedInUnexpectedFiles = [];
        for (const frontendJsFile of frontendJsFiles) {
            const relativePath = path.relative(rootDir, frontendJsFile).replace(/\\/g, '/');
            const content = await fs.readFile(frontendJsFile, 'utf8');

            if (!content.includes(entry.selector)) {
                continue;
            }

            if (!ownerFiles.includes(relativePath) && !sharedFrontendOwners.has(relativePath)) {
                referencedInUnexpectedFiles.push(relativePath);
            }
        }

        if (referencedInUnexpectedFiles.length) {
            failures.push(
                `El modal ${entry.selector} aparece fuera de sus dueños declarados: ${referencedInUnexpectedFiles.join(', ')}.`
            );
        }
    }
}

if (failures.length) {
    console.error(JSON.stringify({
        ok: false,
        failures
    }, null, 2));
    process.exit(1);
}

console.log(JSON.stringify({
    ok: true,
    modalsChecked: ownershipMap.size
}, null, 2));
