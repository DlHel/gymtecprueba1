const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLAS...\n');

const checkTable = (tableName) => {
    return new Promise((resolve, reject) => {
        connection.query(`DESCRIBE ${tableName}`, (err, results) => {
            if (err) {
                console.log(`❌ Error en tabla ${tableName}:`, err.message);
                reject(err);
            } else {
                console.log(`📋 ESTRUCTURA ${tableName.toUpperCase()}:`);
                results.forEach(field => {
                    console.log(`   • ${field.Field} - ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : ''}`);
                });
                console.log('');
                resolve(results);
            }
        });
    });
};

async function checkAllTables() {
    try {
        connection.connect();
        
        await checkTable('clients');
        await checkTable('locations');
        await checkTable('equipmentmodels');
        await checkTable('equipment');
        await checkTable('tickets');
        
        console.log('✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.end();
    }
}

checkAllTables(); 