/**
 * Script para verificar estructura de la tabla Users
 */

const db = require('./src/db-adapter');

async function checkUsersTable() {
    try {
        console.log('🔍 Verificando estructura de la tabla Users...');
        
        // Mostrar estructura de la tabla
        const tableStructure = await new Promise((resolve, reject) => {
            db.all("DESCRIBE Users", [], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
        
        console.log('📋 Estructura de la tabla Users:');
        tableStructure.forEach(column => {
            console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : ''} ${column.Key || ''}`);
        });
        
        // Verificar usuarios técnicos con columnas correctas
        const technicians = await new Promise((resolve, reject) => {
            db.all("SELECT id, username, email, role, status FROM Users WHERE role = 'technician'", [], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
        
        if (technicians && technicians.length > 0) {
            console.log(`\n✅ Encontrados ${technicians.length} técnicos:`);
            technicians.forEach(tech => {
                console.log(`   - ID: ${tech.id}, Usuario: ${tech.username}, Email: ${tech.email}, Estado: ${tech.status}`);
            });
        } else {
            console.log('\n❌ No se encontraron técnicos en la base de datos');
        }
        
        // Verificar todos los roles disponibles
        const allRoles = await new Promise((resolve, reject) => {
            db.all("SELECT DISTINCT role, COUNT(*) as count FROM Users GROUP BY role", [], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
        
        console.log('\n📊 Resumen de usuarios por rol:');
        allRoles.forEach(roleData => {
            console.log(`   - ${roleData.role}: ${roleData.count} usuarios`);
        });
        
    } catch (error) {
        console.error('❌ Error verificando tabla Users:', error.message);
    } finally {
        // Cerrar la conexión
        db.close();
        console.log('\n🔌 Conexión cerrada');
        process.exit(0);
    }
}

checkUsersTable();
