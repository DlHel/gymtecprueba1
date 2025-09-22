const mysql = require('mysql2/promise');

async function describeUsersTable() {
    let connection;
    
    try {
        console.log('🔍 Verificando estructura de la tabla users...');
        
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('✅ Conectado a la base de datos MySQL');

        // Describir la tabla users
        console.log('\n📋 Estructura de la tabla users:');
        const [structure] = await connection.execute('DESCRIBE users');
        console.table(structure);

        // Verificar valores únicos en el campo role
        console.log('\n📋 Valores únicos en el campo role:');
        const [roles] = await connection.execute('SELECT DISTINCT role FROM users WHERE role IS NOT NULL AND role != ""');
        console.table(roles);

        // Probar actualización manual a technician
        console.log('\n🔧 Probando actualización manual de roles...');
        
        // Actualizar usuarios con nombres tech* a role 'technician'
        await connection.execute(`
            UPDATE users 
            SET role = 'technician'
            WHERE username LIKE 'tech_%'
        `);
        
        console.log('✅ Roles actualizados');

        // Verificar usuarios técnicos
        console.log('\n📋 Usuarios con role = "technician":');
        const [techs] = await connection.execute(`
            SELECT id, username, role, specialization, max_daily_tasks 
            FROM users 
            WHERE role = 'technician'
        `);
        console.table(techs);

        console.log('\n✅ Verificación completada');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

describeUsersTable();