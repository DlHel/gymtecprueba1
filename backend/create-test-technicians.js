const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

// Configuración de conexión
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

console.log('🔧 Verificando y creando usuarios técnicos...');

// Verificar usuarios existentes
db.query('SELECT id, username, role, status FROM Users', (err, rows) => {
    if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
    
    console.log('📋 Usuarios existentes:');
    rows.forEach(user => {
        console.log(`   • ${user.username} - ${user.role} (${user.status})`);
    });
    
    // Crear usuarios técnicos si no existen
    const techniciansToCreate = [
        { username: 'juan_tecnico', role: 'Técnico', email: 'juan@gymtec.com' },
        { username: 'maria_tecnica', role: 'Técnico', email: 'maria@gymtec.com' },
        { username: 'carlos_admin', role: 'Admin', email: 'carlos@gymtec.com' }
    ];
    
    let created = 0;
    
    techniciansToCreate.forEach((tech, index) => {
        // Verificar si ya existe
        const exists = rows.find(user => user.username === tech.username);
        if (exists) {
            console.log(`⏭️  Usuario ${tech.username} ya existe`);
            if (index === techniciansToCreate.length - 1 && created === 0) {
                testEndpoint();
            }
            return;
        }
        
        // Crear usuario
        const sql = `INSERT INTO Users (username, password, email, role, status) VALUES (?, ?, ?, ?, ?)`;
        const hashedPassword = '$2b$12$defaultHashedPassword'; // Password por defecto
        
        db.query(sql, [tech.username, hashedPassword, tech.email, tech.role, 'active'], (err, result) => {
            if (err) {
                console.error(`❌ Error creando ${tech.username}:`, err.message);
            } else {
                console.log(`✅ Usuario ${tech.username} creado con ID: ${result.insertId}`);
                created++;
            }
            
            if (index === techniciansToCreate.length - 1) {
                setTimeout(() => testEndpoint(), 500);
            }
        });
    });
    
    if (rows.length > 0 && techniciansToCreate.every(tech => rows.find(user => user.username === tech.username))) {
        testEndpoint();
    }
});

function testEndpoint() {
    console.log('\n🧪 Probando endpoint /api/users/technicians...');
    
    db.query(`SELECT id, username, email, role, status, created_at 
              FROM Users 
              WHERE role IN ('Admin', 'Técnico', 'Administrador', 'Technician') 
                AND status = 'active'
              ORDER BY username`, (err, rows) => {
        if (err) {
            console.error('❌ Error en endpoint:', err.message);
        } else {
            console.log('✅ Técnicos y administradores encontrados:');
            rows.forEach(user => {
                console.log(`   • ID: ${user.id}, Usuario: ${user.username}, Rol: ${user.role}`);
            });
            console.log(`📊 Total: ${rows.length} técnicos/administradores`);
        }
        
        db.end();
        console.log('\n🎉 Verificación completada. Ahora puedes probar el módulo de tickets.');
    });
}
