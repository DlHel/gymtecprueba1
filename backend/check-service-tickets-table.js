/**
 * Script para verificar si existe la tabla ServiceTickets
 */

const db = require('./src/db-adapter');

async function checkServiceTicketsTable() {
    try {
        console.log('🔍 Verificando tabla ServiceTickets...');
        
        // Verificar si existe la tabla
        const tableExists = await new Promise((resolve, reject) => {
            db.all("SHOW TABLES LIKE 'ServiceTickets'", [], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
        
        if (tableExists && tableExists.length > 0) {
            console.log('✅ Tabla ServiceTickets existe');
            
            // Mostrar estructura de la tabla
            const tableStructure = await new Promise((resolve, reject) => {
                db.all("DESCRIBE ServiceTickets", [], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            
            console.log('📋 Estructura de la tabla ServiceTickets:');
            tableStructure.forEach(column => {
                console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key || ''}`);
            });
            
            // Contar registros
            const count = await new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM ServiceTickets", [], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            
            console.log(`📊 Registros en ServiceTickets: ${count.count}`);
            
        } else {
            console.log('❌ Tabla ServiceTickets NO existe');
            console.log('');
            console.log('💡 Necesitas crear la tabla ServiceTickets. Opciones:');
            console.log('   1. Ejecutar: npm run setup-mysql');
            console.log('   2. Ejecutar script de migración específico');
            console.log('   3. Crear la tabla manualmente');
        }
        
    } catch (error) {
        console.error('❌ Error verificando tabla ServiceTickets:', error.message);
    } finally {
        // Cerrar la conexión
        db.close();
        console.log('🔌 Conexión cerrada');
        process.exit(0);
    }
}

checkServiceTicketsTable();
