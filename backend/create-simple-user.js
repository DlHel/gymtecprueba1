// Script simplificado para crear usuario admin
const db = require('./src/db-adapter');

console.log('🔧 Creando usuario admin...');
const adminPassword = process.env.GYMTEC_ADMIN_PASSWORD || 'change-me';

// Usar sintaxis MySQL/MariaDB
const sql = `
    INSERT INTO Users (id, username, email, password, role, status, created_at)
    VALUES (1, 'admin', 'admin@gymtec.com', ?, 'Admin', 'Activo', NOW())
    ON DUPLICATE KEY UPDATE
    password = VALUES(password), role = 'Admin', status = 'Activo'
`;

db.run(sql, [adminPassword], function(err) {
    if (err) {
        console.error('❌ Error:', err);
    } else {
        console.log('✅ Usuario admin creado!');
        console.log('📋 Credenciales:');
        console.log('   Usuario: admin');
        console.log(`   Contraseña: ${adminPassword}`);
    }
    process.exit(0);
});
