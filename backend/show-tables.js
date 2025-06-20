const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
});

console.log('📊 VERIFICANDO ESQUEMA MYSQL...\n');

connection.query('SHOW TABLES', (err, results) => {
    if (err) {
        console.error('❌ Error:', err.message);
        return;
    }
    
    console.log('📋 TABLAS EXISTENTES:');
    results.forEach(row => {
        const tableName = Object.values(row)[0];
        console.log(`   • ${tableName}`);
    });
    
    console.log(`\n✅ Total: ${results.length} tablas encontradas\n`);
    
    // Verificar estructura de algunas tablas clave
    const checkTable = (tableName) => {
        return new Promise((resolve, reject) => {
            connection.query(`DESCRIBE ${tableName}`, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });
    };
    
    // Verificar tablas principales
    Promise.all([
        checkTable('clients').catch(() => null),
        checkTable('sites').catch(() => null),
        checkTable('locations').catch(() => null),
        checkTable('EquipmentModels').catch(() => null)
    ]).then(([clients, sites, locations, models]) => {
        
        console.log('🔍 ESTRUCTURA DE TABLAS PRINCIPALES:\n');
        
        if (clients) {
            console.log('✅ Tabla CLIENTS existe');
        } else {
            console.log('❌ Tabla CLIENTS no existe');
        }
        
        if (sites) {
            console.log('✅ Tabla SITES existe');
        } else if (locations) {
            console.log('⚠️  Tabla SITES no existe, pero LOCATIONS sí (posible inconsistencia)');
        } else {
            console.log('❌ Ni SITES ni LOCATIONS existen');
        }
        
        if (models) {
            console.log('✅ Tabla EQUIPMENTMODELS existe');
        } else {
            console.log('❌ Tabla EQUIPMENTMODELS no existe');
        }
        
        connection.end();
    });
}); 