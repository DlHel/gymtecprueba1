const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

console.log('🔍 VERIFICANDO TABLAS DE CONTRATOS\n');

// Buscar tablas relacionadas con contratos
connection.query("SHOW TABLES LIKE '%contract%'", (err, results) => {
    if (err) {
        console.error('❌ Error:', err.message);
        connection.end();
        return;
    }
    
    console.log('✅ Tablas encontradas con "contract":');
    if (results.length === 0) {
        console.log('   - No se encontraron tablas con "contract"');
    } else {
        results.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });
    }
    
    // También buscar con diferentes variaciones
    connection.query("SHOW TABLES", (err, allTables) => {
        if (err) {
            console.error('❌ Error:', err.message);
            connection.end();
            return;
        }
        
        console.log('\n✅ Todas las tablas disponibles:');
        const contractRelated = [];
        allTables.forEach(table => {
            const tableName = Object.values(table)[0].toLowerCase();
            console.log(`   - ${Object.values(table)[0]}`);
            
            if (tableName.includes('contract') || tableName.includes('equipment')) {
                contractRelated.push(Object.values(table)[0]);
            }
        });
        
        console.log('\n✅ Tablas relacionadas con contratos/equipos:');
        contractRelated.forEach(table => {
            console.log(`   - ${table}`);
        });
        
        connection.end();
    });
});