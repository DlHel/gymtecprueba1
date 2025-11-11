const db = require('./src/db-adapter');
const bcrypt = require('bcryptjs');

console.log('\n=== VERIFICANDO USUARIOS Y CONTRASEÑAS ===\n');

const sql = 'SELECT id, username, email, password, role, status FROM Users ORDER BY username';

db.all(sql, [], (err, users) => {
    if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }

    console.log(`Total usuarios: ${users.length}\n`);

    users.forEach(user => {
        const isHashed = user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'));
        const passwordInfo = isHashed ? '✅ Hasheada' : `⚠️ Texto plano: "${user.password}"`;
        
        console.log(`👤 ${user.username.padEnd(20)} | Role: ${user.role.padEnd(10)} | Status: ${user.status.padEnd(10)} | Password: ${passwordInfo}`);
    });

    console.log('\n=== PROBANDO LOGIN CON admin123 ===\n');

    // Probar login con usuarios específicos
    const testUsers = ['admin', 'felipe.tech', 'manager', 'tecnico'];
    let completed = 0;

    testUsers.forEach(username => {
        const userSql = 'SELECT * FROM Users WHERE username = ? AND status = ?';
        db.get(userSql, [username, 'Activo'], async (err, user) => {
            if (err) {
                console.log(`❌ ${username}: Error BD - ${err.message}`);
            } else if (!user) {
                console.log(`❌ ${username}: No encontrado o inactivo`);
            } else {
                // Probar contraseña
                const testPassword = 'admin123';
                let isValid = false;
                
                if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
                    isValid = await bcrypt.compare(testPassword, user.password);
                } else {
                    isValid = (testPassword === user.password);
                }
                
                if (isValid) {
                    console.log(`✅ ${username}: Login OK con admin123`);
                } else {
                    console.log(`❌ ${username}: Password incorrecta (esperaba: admin123, hash: ${user.password.substring(0, 20)}...)`);
                }
            }
            
            completed++;
            if (completed === testUsers.length) {
                process.exit(0);
            }
        });
    });
});
