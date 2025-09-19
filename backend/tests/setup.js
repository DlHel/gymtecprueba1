const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../config.env') });

const setupTestDatabase = async () => {
    console.log('--- RUNNING GLOBAL TEST SETUP ---');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    };
    const dbName = process.env.DB_NAME || 'gymtec_erp_test';

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log(`Dropping database ${dbName} if it exists...`);
        await connection.query(`DROP DATABASE IF EXISTS \\\`${dbName}\\\``);
        console.log(`Creating database ${dbName}...`);
        await connection.query(`CREATE DATABASE \\\`${dbName}\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.changeUser({ database: dbName });
        console.log(`Database ${dbName} created and selected.`);

        console.log('Reading schema file...');
        const schemaPath = path.join(__dirname, '../database/mysql-schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

        console.log(`Executing ${statements.length} statements from schema...`);
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
            }
        }

        console.log('--- GLOBAL TEST SETUP COMPLETE ---');

    } catch (error) {
        console.error('FATAL: Test database setup failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

module.exports = setupTestDatabase;