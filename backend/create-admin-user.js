const db = require('./src/db-adapter');

// Crear usuario administrador de prueba
async function createAdminUser() {
    console.log('🔧 Creando usuario administrador de prueba...');
    const adminPassword = process.env.GYMTEC_ADMIN_PASSWORD || 'change-me';
    
    const sql = `
        INSERT IGNORE INTO Users (username, email, password, role, status, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const values = [
        'admin',
        'admin@gymtec.com', 
        adminPassword,
        'Admin',
        'Activo'
    ];
    
    try {
        await new Promise((resolve, reject) => {
            db.run(sql, values, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
        
        console.log('✅ Usuario administrador creado exitosamente');
        console.log('📋 Credenciales de prueba:');
        console.log('   Usuario: admin');
        console.log('   Email: admin@gymtec.com');
        console.log(`   Contraseña: ${adminPassword}`);
        console.log('   Rol: Admin');
        
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            console.log('ℹ️  Usuario admin ya existe, verificando...');
            
            // Verificar usuario existente
            const checkSql = 'SELECT username, email, role, status FROM Users WHERE username = ?';
            db.get(checkSql, ['admin'], (err, user) => {
                if (err) {
                    console.error('❌ Error verificando usuario:', err);
                } else if (user) {
                    console.log('✅ Usuario admin encontrado:');
                    console.log(`   Usuario: ${user.username}`);
                    console.log(`   Email: ${user.email}`);
                    console.log(`   Rol: ${user.role}`);
                    console.log(`   Estado: ${user.status}`);
                } else {
                    console.log('❌ Usuario admin no encontrado');
                }
                process.exit(0);
            });
        } else {
            console.error('❌ Error creando usuario:', error);
            process.exit(1);
        }
    }
}

createAdminUser();
