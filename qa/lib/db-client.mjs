import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../../backend/src/db-adapter.js');

export async function dbGet(sql, params = []) {
    return db.getAsync(sql, params);
}

export async function dbAll(sql, params = []) {
    return db.allAsync(sql, params);
}

export async function dbRun(sql, params = []) {
    return db.runAsync(sql, params);
}

export async function getTableColumns(tableName) {
    const rows = await dbAll(`SHOW COLUMNS FROM ${tableName}`);
    return new Set((rows || []).map((row) => row.Field));
}

export async function closeDbConnection() {
    if (typeof db.close === 'function') {
        await db.close();
    }
}
