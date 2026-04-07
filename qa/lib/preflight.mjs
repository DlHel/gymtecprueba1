import { spawn } from 'node:child_process';
import { backendHealthUrl, uiBaseUrl } from './config.mjs';
import { ensureLocalQaServers } from './server-manager.mjs';

function runCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, {
            cwd,
            shell: true,
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Comando falló (${code}): ${command}`));
        });
    });
}

async function assertReachable(url, label) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${label} respondió ${response.status} en ${url}`);
    }
}

export async function runPreflight({ rootDir, ensureSeed = true }) {
    if (!process.env.QA_SKIP_LINT) {
        await runCommand('npm run lint', rootDir);
    }

    if (!process.env.QA_SKIP_TESTS) {
        await runCommand('npm run test', rootDir);
    }

    await ensureLocalQaServers({ backendHealthUrl, uiBaseUrl });
    await assertReachable(backendHealthUrl, 'Backend');
    await assertReachable(`${uiBaseUrl}/login.html`, 'Frontend');

    if (ensureSeed) {
        const { seedFixtures } = await import('../seed-fixtures.mjs');
        await seedFixtures();
    }
}
