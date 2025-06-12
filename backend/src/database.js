const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'gymtec.db');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDB();
    }
});

function initializeDB() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            // No mostrar error si las tablas ya existen, es un comportamiento esperado.
            if (!err.message.includes('already exists')) {
                console.error('Error initializing database schema:', err.message);
            }
        } else {
            console.log('Database schema initialized successfully.');
        }
    });
}

module.exports = db; 