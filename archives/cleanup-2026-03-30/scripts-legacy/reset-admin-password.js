const db = require('./src/db-adapter');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
    try {
        console.log('🔄 Actualizando contraseña del admin...');
        
        // Generar hash para "admin123"
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        console.log('📝 Nueva contraseña:', newPassword);
        console.log('🔐 Hash generado:', hashedPassword);
        
        // Actualizar en la base de datos
        const sql = `UPDATE Users SET password = ? WHERE username = 'admin'`;
        
        db.run(sql, [hashedPassword], function(err) {
            if (err) {
                console.error('❌ Error actualizando contraseña:', err.message);
                process.exit(1);
            }
            
            console.log('✅ Contraseña actualizada correctamente');
            console.log('📋 Credenciales de acceso:');
            console.log('   Usuario: admin');
            console.log('   Contraseña: admin123');
            console.log('');
            console.log('🔗 URL de login: http://localhost:8080/login.html');
            
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetAdminPassword();
