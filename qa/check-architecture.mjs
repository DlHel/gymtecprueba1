import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { rootDir } from './lib/config.mjs';

async function getFiles(dir, predicate = () => true) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const absolutePath = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await getFiles(absolutePath, predicate));
        } else if (predicate(absolutePath)) {
            files.push(absolutePath);
        }
    }

    return files;
}

function runModalCheck() {
    return new Promise((resolve, reject) => {
        const child = spawn('node qa/check-modals.mjs', {
            cwd: rootDir,
            shell: true,
            stdio: 'pipe'
        });

        let stderr = '';
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(stderr || 'qa/check-modals.mjs falló'));
        });
    });
}

const backendSourceFiles = await getFiles(
    path.resolve(rootDir, 'backend', 'src'),
    (filePath) => filePath.endsWith('.js')
);
const moduleFiles = backendSourceFiles.filter((filePath) => filePath.includes(`${path.sep}modules${path.sep}`));
const disallowedAppFiles = backendSourceFiles.filter(
    (filePath) => !filePath.includes(`${path.sep}core${path.sep}bootstrap${path.sep}`)
        && !filePath.endsWith(`${path.sep}modules${path.sep}index.js`)
);

const failures = [];

for (const filePath of moduleFiles) {
    const content = await fs.readFile(filePath, 'utf8');
    if (/require\(['"][^'"]*routes\//.test(content) || /from ['"][^'"]*routes\//.test(content)) {
        failures.push(`Dependencia prohibida desde modules hacia routes: ${path.relative(rootDir, filePath)}`);
    }
}

for (const filePath of disallowedAppFiles) {
    const content = await fs.readFile(filePath, 'utf8');
    if (/app\.(get|post|put|delete|patch|use)\s*\(/.test(content)) {
        failures.push(`Uso directo de app.<método> fuera de bootstrap: ${path.relative(rootDir, filePath)}`);
    }
}

try {
    await runModalCheck();
} catch (error) {
    failures.push(error.message);
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
    modulesChecked: moduleFiles.length,
    backendFilesChecked: disallowedAppFiles.length
}, null, 2));
