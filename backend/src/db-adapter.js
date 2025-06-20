const mysqlDb = require('./mysql-database');

// Adaptador para mantener compatibilidad con SQLite callback style
class DatabaseAdapter {
    constructor() {
        this.mysql = mysqlDb;
    }

    // Inicializar la base de datos
    async initialize() {
        await this.mysql.initializeDB();
    }

    // Función para emular el comportamiento de SQLite db.all()
    all(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        this.mysql.all(sql, params)
            .then(rows => callback(null, rows))
            .catch(err => callback(err));
    }

    // Función para emular el comportamiento de SQLite db.get()
    get(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        this.mysql.get(sql, params)
            .then(row => callback(null, row))
            .catch(err => callback(err));
    }

    // Función para emular el comportamiento de SQLite db.run()
    run(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        this.mysql.run(sql, params)
            .then(result => {
                // Crear contexto similar a SQLite
                const context = {
                    lastID: result.insertId,
                    changes: result.affectedRows
                };
                callback.call(context, null, result);
            })
            .catch(err => callback(err));
    }

    // Función para emular el comportamiento de SQLite db.exec()
    exec(sql, callback) {
        this.mysql.query(sql)
            .then(result => callback(null, result))
            .catch(err => callback(err));
    }

    // Funciones adicionales para compatibilidad
    async close() {
        await this.mysql.close();
    }

    async testConnection() {
        return await this.mysql.testConnection();
    }
}

// Crear instancia única del adaptador
const dbAdapter = new DatabaseAdapter();

// Inicializar cuando se importe
dbAdapter.initialize().catch(err => {
    console.error('❌ Error inicializando base de datos:', err.message);
});

module.exports = dbAdapter; 