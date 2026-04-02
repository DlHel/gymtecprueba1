const dbAdapter = require('./src/db-adapter');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

const resetAdminPassword = async () => {
    console.log('🔧 Reseteando contraseña de admin...');
    
    const password = process.env.GYMTEC_ADMIN_PASSWORD || 'change-me';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `UPDATE Users SET password = ? WHERE username = 'admin'`;
    
    dbAdapter.run(sql, [hashedPassword], function(err) {
        if (err) {
            console.error('❌ Error actualizando contraseña:', err);
        } else {
            if (this.changes > 0) {
                console.log('✅ Contraseña actualizada correctamente para usuario "admin"');
            } else {
                console.log('⚠️ Usuario "admin" no encontrado. Creándolo...');
                createAdmin(hashedPassword);
            }
        }
    });
};

const createAdmin = (hashedPassword) => {
    const sql = `
        INSERT INTO Users (username, email, password, role, status, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const values = ['admin', 'admin@gymtec.com', hashedPassword, 'Admin', 'Activo'];
    
    dbAdapter.run(sql, values, (err) => {
        if (err) console.error('❌ Error creando admin:', err);
        else console.log('✅ Usuario admin creado con nueva contraseña');
    });
};

resetAdminPassword();
