const mysqlDb = require('./mysql-database');

// Adaptador para MySQL
class DatabaseAdapter {
    constructor() {
        this.db = mysqlDb;
    }

    // Inicializar la base de datos MySQL
    async initialize() {
        try {
            const isConnected = await this.db.testConnection();
            if (!isConnected) {
                throw new Error('No se pudo establecer conexión a MySQL');
            }
            console.log('✅ Base de datos MySQL conectada correctamente');
        } catch (error) {
            console.error('❌ Error conectando a MySQL:', error.message);
            throw error;
        }
    }

    // Función para MySQL db.all() - convertir callback a promesa
    // Soporta tanto callback como async/await
    all(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        // ✅ Si no hay callback, retornar promesa (para usar con await)
        if (!callback) {
            return this.db.query(sql, params);
        }
        
        // Modo callback
        this.db.query(sql, params)
            .then(results => {
                callback(null, results);
            })
            .catch(error => {
                callback(error);
            });
    }

    // Versión async/await de all()
    async allAsync(sql, params = []) {
        return await this.db.query(sql, params);
    }

    // Función para MySQL db.get() - obtener solo el primer resultado
    // Soporta tanto callback como async/await
    get(sql, params, callback) {
        // Si no hay callback, retornar promesa (para usar con await)
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        
        if (!callback) {
            // Modo async/await
            return this.db.query(sql, params)
                .then(results => results.length > 0 ? results[0] : null);
        }
        
        // Modo callback
        this.db.query(sql, params)
            .then(results => {
                const row = results.length > 0 ? results[0] : null;
                callback(null, row);
            })
            .catch(error => callback(error));
    }

    // Versión async/await de get()
    async getAsync(sql, params = []) {
        const results = await this.db.query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    // Función para MySQL db.run() - para INSERT, UPDATE, DELETE
    run(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }

        if (!callback) {
            return this.db.query(sql, params)
                .then((result) => ({
                    lastID: result.insertId || null,
                    changes: result.affectedRows || 0
                }));
        }
        
        this.db.query(sql, params)
            .then(result => {
                // Simular el objeto de resultado de MySQL callback
                const callbackResult = {
                    lastID: result.insertId || null,
                    changes: result.affectedRows || 0
                };
                callback.call(callbackResult, null);
            })
            .catch(error => callback(error));
    }

    // Versión async/await de run()
    async runAsync(sql, params = []) {
        const result = await this.db.query(sql, params);
        return {
            lastID: result.insertId || null,
            changes: result.affectedRows || 0
        };
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
