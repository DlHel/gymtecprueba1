/**
 * Script para verificar usuarios técnicos
 */

const db = require('./src/db-adapter');

async function checkTechnicians() {
    try {
        console.log('🔍 Verificando usuarios técnicos...');
        
        // Verificar usuarios con rol technician
        const technicians = await new Promise((resolve, reject) => {
            db.all("SELECT id, username, full_name, email, role, status FROM Users WHERE role = 'technician'", [], (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
        
        if (technicians && technicians.length > 0) {
            console.log(`✅ Encontrados ${technicians.length} técnicos:`);
            technicians.forEach(tech => {
                console.log(`   - ID: ${tech.id}, Usuario: ${tech.username}, Nombre: ${tech.full_name || 'N/A'}, Estado: ${tech.status}`);
            });
        } else {
            console.log('❌ No se encontraron técnicos en la base de datos');
            console.log('');
            console.log('💡 Creando un técnico de prueba...');
            
            // Crear un técnico de prueba
            const result = await new Promise((resolve, reject) => {
                const sql = `
                    INSERT INTO Users (username, email, password_hash, full_name, role, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                `;
                const params = [
                    'tecnico1',
                    'tecnico1@gymtec.com',
                    '$2b$10$example.hash.for.testing', // Hash de prueba
                    'Técnico de Prueba',
                    'technician',
                    'active'
                ];
                
                db.run(sql, params, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ insertId: this.lastID });
                    }
                });
            });
            
            console.log(`✅ Técnico de prueba creado con ID: ${result.insertId}`);
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
        
        console.log('');
        console.log('📊 Resumen de usuarios por rol:');
        allRoles.forEach(roleData => {
            console.log(`   - ${roleData.role}: ${roleData.count} usuarios`);
        });
        
    } catch (error) {
        console.error('❌ Error verificando técnicos:', error.message);
    } finally {
        // Cerrar la conexión
        db.close();
        console.log('🔌 Conexión cerrada');
        process.exit(0);
    }
}

checkTechnicians();
