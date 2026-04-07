import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { outputDir, rootDir } from './config.mjs';

function ensureDirSync(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

async function canReach(url) {
    try {
        const response = await fetch(url);
        return response.ok;
    } catch {
        return false;
    }
}

async function waitUntilReachable(url, label, timeoutMs = 30000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (await canReach(url)) {
            return true;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`No se pudo levantar ${label} en ${url} dentro de ${timeoutMs}ms.`);
}

function createLogStream(fileName) {
    ensureDirSync(path.resolve(outputDir, 'runtime'));
    return fs.openSync(path.resolve(outputDir, 'runtime', fileName), 'a');
}

function spawnDetachedWithLogs(command, args, options, logFileName) {
    const logFd = createLogStream(logFileName);
    const errFd = createLogStream(logFileName.replace(/\.log$/i, '.err.log'));
    const child = spawn(command, args, {
        ...options,
        detached: true,
        stdio: ['ignore', logFd, errFd]
    });

    child.unref();
    return child.pid;
}

export async function ensureLocalQaServers({ backendHealthUrl, uiBaseUrl }) {
    const backendUp = await canReach(backendHealthUrl);
    if (!backendUp) {
        spawnDetachedWithLogs(
            'node',
            ['src/server-clean.js'],
            { cwd: path.resolve(rootDir, 'backend'), shell: true },
            'qa-backend.log'
        );
        await waitUntilReachable(backendHealthUrl, 'backend local');
    }

    const frontendLoginUrl = `${uiBaseUrl}/login.html`;
    const frontendUp = await canReach(frontendLoginUrl);
    if (!frontendUp) {
        spawnDetachedWithLogs(
            'python',
            ['-m', 'http.server', '8080'],
            { cwd: path.resolve(rootDir, 'frontend'), shell: true },
            'qa-frontend.log'
        );
        await waitUntilReachable(frontendLoginUrl, 'frontend local');
    }
}
