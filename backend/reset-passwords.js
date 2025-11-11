const db = require('./src/db-adapter');
const bcrypt = require('bcryptjs');

console.log('\n=== ACTUALIZANDO CONTRASEÑAS A admin123 ===\n');

const newPassword = 'admin123';

// Hashear la nueva contraseña
bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
    if (err) {
        console.error('❌ Error hasheando contraseña:', err.message);
        process.exit(1);
    }

    console.log('🔐 Nueva contraseña hasheada correctamente\n');

    // Obtener todos los usuarios
    const selectSql = 'SELECT id, username, role FROM Users WHERE username != ?';
    
    db.all(selectSql, ['admin'], (err, users) => {
        if (err) {
            console.error('❌ Error obteniendo usuarios:', err.message);
            process.exit(1);
        }

        if (users.length === 0) {
            console.log('⚠️ No hay usuarios para actualizar');
            process.exit(0);
        }

        console.log(`📋 Actualizando ${users.length} usuarios...\n`);

        let updated = 0;
        let errors = 0;

        users.forEach(user => {
            const updateSql = 'UPDATE Users SET password = ? WHERE id = ?';
            
            db.run(updateSql, [hashedPassword, user.id], function(updateErr) {
                if (updateErr) {
                    console.log(`❌ ${user.username}: Error - ${updateErr.message}`);
                    errors++;
                } else {
                    console.log(`✅ ${user.username} (${user.role}): Contraseña actualizada`);
                    updated++;
                }

                // Verificar si terminamos
                if (updated + errors === users.length) {
                    console.log(`\n=== RESUMEN ===`);
                    console.log(`✅ Actualizados: ${updated}`);
                    console.log(`❌ Errores: ${errors}`);
                    console.log(`\n🔑 Contraseña universal: admin123`);
                    process.exit(0);
                }
            });
        });
    });
});
