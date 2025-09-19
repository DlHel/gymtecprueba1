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

    // Función para MySQL db.all() - compatible con callbacks SQLite
    all(sql, params, callback) {
        // Si no se proporciona callback, mantener compatibilidad async
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        this.db.query(sql, params)
            .then(results => {
                if (callback) callback(null, results);
                return results;
            })
            .catch(error => {
                console.error('Error en db.all():', error);
                if (callback) callback(error, null);
                else throw error;
            });
    }

    // Función para MySQL db.get() - compatible con callbacks SQLite
    get(sql, params, callback) {
        // Si no se proporciona callback, mantener compatibilidad async
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        this.db.query(sql, params)
            .then(results => {
                const result = results.length > 0 ? results[0] : null;
                if (callback) callback(null, result);
                return result;
            })
            .catch(error => {
                console.error('Error en db.get():', error);
                if (callback) callback(error, null);
                else throw error;
            });
    }

    // Función para MySQL db.run() - compatible con callbacks SQLite
    run(sql, params, callback) {
        // Si no se proporciona callback, mantener compatibilidad async
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        this.db.query(sql, params)
            .then(result => {
                // Simular el objeto de resultado de SQLite callback
                const sqliteResult = {
                    lastID: result.insertId || null,
                    changes: result.affectedRows || 0
                };
                
                if (callback) {
                    // Para callbacks, usar el contexto 'this' como en SQLite
                    const context = { lastID: sqliteResult.lastID, changes: sqliteResult.changes };
                    callback.call(context, null);
                } else {
                    return sqliteResult;
                }
            })
            .catch(error => {
                console.error('Error en db.run():', error);
                if (callback) callback(error);
                else throw error;
            });
    }    // Función para MySQL db.exec() - ejecutar múltiples statements
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

// Exportar una instancia única (singleton)
module.exports = new DatabaseAdapter(); 