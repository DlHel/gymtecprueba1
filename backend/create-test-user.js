// Script simple para crear usuario de prueba
const bcrypt = require('bcryptjs');

async function createTestUser() {
    console.log('🔧 Creando usuario de prueba...');
    
    try {
        // Crear conexión simple a la base de datos
        const db = require('./src/db-adapter');
        
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // SQL para insertar usuario (sintaxis MySQL)
        const sql = `
            INSERT INTO Users (id, username, email, password, role, status, created_at)
            VALUES (1, 'admin', 'admin@gymtec.com', ?, 'Admin', 'Activo', NOW())
            ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            email = VALUES(email),
            password = VALUES(password),
            role = VALUES(role),
            status = VALUES(status)
        `;
        
        // Ejecutar la inserción
        db.run(sql, [hashedPassword], function(err) {
            if (err) {
                console.error('❌ Error creando usuario:', err);
                process.exit(1);
            } else {
                console.log('✅ Usuario creado exitosamente!');
                console.log('📋 Credenciales:');
                console.log('   Usuario: admin');
                console.log('   Contraseña: admin123');
                console.log('   Email: admin@gymtec.com');
                console.log('   Rol: Admin');
                console.log('');
                console.log('🔗 Ahora puedes hacer login en: http://localhost:8080/login.html');
                process.exit(0);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Ejecutar
createTestUser();
