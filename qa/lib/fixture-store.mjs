import fs from 'node:fs/promises';
import path from 'node:path';
import { fixturesPath } from './config.mjs';

export async function loadFixtures() {
    try {
        const raw = await fs.readFile(fixturesPath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }

        throw error;
    }
}

export async function saveFixtures(fixtures) {
    await fs.mkdir(path.dirname(fixturesPath), { recursive: true });
    await fs.writeFile(fixturesPath, JSON.stringify(fixtures, null, 2), 'utf8');
    return fixturesPath;
}
