const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../config.env') });

const fileBackedEnvKeys = [
    'DB_PASSWORD',
    'JWT_SECRET',
    'MYSQL_ROOT_PASSWORD',
    'SMTP_PASS',
    'APP_ADMIN_PASSWORD_HASH'
];

function readSecretFile(filePath, key) {
    try {
        return fs.readFileSync(filePath, 'utf8').trim();
    } catch (error) {
        throw new Error(`No se pudo leer ${key}_FILE (${filePath}): ${error.message}`);
    }
}

function applyFileBackedEnv(env = process.env) {
    fileBackedEnvKeys.forEach((key) => {
        const filePath = env[`${key}_FILE`];
        if (!filePath) {
            return;
        }

        env[key] = readSecretFile(filePath, key);
    });

    return env;
}

module.exports = {
    applyFileBackedEnv
};
