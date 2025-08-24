const mysqlDb = require('./mysql-database');

// Adaptador para MySQL
class DatabaseAdapter {
    constructor() {
        this.db = mysqlDb;
    }

    // Inicializar la base de datos MySQL
    async initialize() {
        try {
            await this.db.testConnection();
            console.log('✅ Base de datos MySQL conectada correctamente');
        } catch (error) {
            console.error('❌ Error conectando a MySQL:', error.message);
            throw error;
        }
    }

    // Función para MySQL db.all() - convertir callback a promesa
    all(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        this.db.query(sql, params)
            .then(results => {
                if (callback) callback(null, results);
            })
            .catch(error => {
                if (callback) callback(error);
            });
    }

    // Función para MySQL db.get() - obtener solo el primer resultado
    get(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        this.db.query(sql, params)
            .then(results => {
                const row = results.length > 0 ? results[0] : null;
                callback(null, row);
            })
            .catch(error => callback(error));
    }

    // Función para MySQL db.run() - para INSERT, UPDATE, DELETE
    run(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        this.db.query(sql, params)
            .then(result => {
                // Simular el objeto de resultado de SQLite
                const sqliteResult = {
                    lastID: result.insertId || null,
                    changes: result.affectedRows || 0
                };
                callback.call(sqliteResult, null);
            })
            .catch(error => callback(error));
    }

    // Función para MySQL db.exec() - ejecutar múltiples statements
    exec(sql, callback) {
        this.db.query(sql)
            .then(() => callback(null))
            .catch(error => callback(error));
    }

    // Funciones adicionales
    async close() {
        await this.db.close();
    }

    async testConnection() {
        return await this.db.testConnection();
    }
}

// Crear instancia única del adaptador
const dbAdapter = new DatabaseAdapter();

// Inicializar cuando se importe
dbAdapter.initialize().catch(err => {
    console.error('❌ Error inicializando base de datos MySQL:', err.message);
    console.error('💡 Asegúrate de que MySQL esté corriendo y configurado correctamente');
});

module.exports = dbAdapter; 