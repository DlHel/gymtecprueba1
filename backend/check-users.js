// Test rápido de login - verificar usuario admin
const db = require('./src/db-adapter');

console.log('🔍 Verificando usuarios en la base de datos...\n');

db.all('SELECT id, username, email, role, status FROM Users LIMIT 10', [], (err, users) => {
    if (err) {
        console.error('❌ Error al consultar usuarios:', err.message);
        process.exit(1);
    }

    if (!users || users.length === 0) {
        console.log('⚠️ No hay usuarios en la base de datos');
        console.log('💡 Ejecuta: node create-admin-user.js para crear usuario admin');
        process.exit(1);
    }

    console.log(`✅ Usuarios encontrados: ${users.length}\n`);
    
    users.forEach(user => {
        console.log(`👤 Usuario: ${user.username}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👔 Role: ${user.role}`);
        console.log(`   📊 Status: ${user.status}`);
        console.log('');
    });

    // Verificar contraseñas
    console.log('🔐 Verificando formato de contraseñas...\n');
    
    db.all('SELECT id, username, password FROM Users LIMIT 5', [], (err, passwordCheck) => {
        if (err) {
            console.error('❌ Error:', err.message);
            process.exit(1);
        }

        passwordCheck.forEach(user => {
            const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
            console.log(`👤 ${user.username}: ${isHashed ? '✅ Hasheada' : '⚠️ Texto plano'}`);
        });

        console.log('\n✅ Verificación completada');
        process.exit(0);
    });
});
