// Script para ejecutar migración de gimnación
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Ajustar si tienes password
    database: 'gymtec_erp',
    multipleStatements: true
};

async function runMigration() {
    console.log('🔄 Iniciando migración de Tickets de Gimnación...');
    
    try {
        // Leer archivo de migración
        const migrationPath = path.join(__dirname, 'database', 'gimnacion-tickets-migration.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Archivo de migración no encontrado: ${migrationPath}`);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Archivo de migración leído correctamente');
        
        // Crear conexión
        const connection = mysql.createConnection(dbConfig);
        
        console.log('🔗 Conectando a la base de datos...');
        
        // Ejecutar migración
        const result = await new Promise((resolve, reject) => {
            connection.query(migrationSQL, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        
        console.log('✅ Migración ejecutada exitosamente');
        console.log('📊 Resultados:', Array.isArray(result) ? `${result.length} operaciones ejecutadas` : 'Operación completada');
        
        // Verificar tablas creadas
        const verifyQuery = `
            SELECT TABLE_NAME, TABLE_COMMENT 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'gymtec_erp' 
            AND TABLE_NAME LIKE '%Gimnacion%' OR TABLE_NAME LIKE '%TicketEquipment%' OR TABLE_NAME LIKE '%TicketTechnician%'
            ORDER BY TABLE_NAME
        `;
        
        const verification = await new Promise((resolve, reject) => {
            connection.query(verifyQuery, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        
        console.log('🔍 Tablas relacionadas con Gimnación creadas:');
        verification.forEach(table => {
            console.log(`  ✅ ${table.TABLE_NAME}`);
        });
        
        connection.end();
        
        console.log('🎉 Migración de Gimnación completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        console.error('💡 Detalles:', error);
        process.exit(1);
    }
}

// Ejecutar migración
runMigration();