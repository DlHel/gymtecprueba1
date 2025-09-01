// Script simplificado para crear usuario admin
const db = require('./src/db-adapter');

console.log('🔧 Creando usuario admin...');

// Usar sintaxis MySQL/MariaDB
const sql = `
    INSERT INTO Users (id, username, email, password, role, status, created_at)
    VALUES (1, 'admin', 'admin@gymtec.com', 'admin123', 'Admin', 'Activo', NOW())
    ON DUPLICATE KEY UPDATE
    password = 'admin123', role = 'Admin', status = 'Activo'
`;

db.run(sql, [], function(err) {
    if (err) {
        console.error('❌ Error:', err);
    } else {
        console.log('✅ Usuario admin creado!');
        console.log('📋 Credenciales:');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
    }
    process.exit(0);
});
