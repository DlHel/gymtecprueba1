const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

// Configuración de conexión
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

// Función para ejecutar queries con promesas
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

async function checkCustomIds() {
    try {
        console.log('🔍 VERIFICANDO ESTADO DE CAMPOS CUSTOM_ID');
        console.log('='.repeat(50));
        
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // Verificar estructura de tabla clients
        console.log('👥 TABLA CLIENTS:');
        try {
            const clientsStructure = await query('DESCRIBE clients');
            const hasCustomId = clientsStructure.some(field => field.Field === 'custom_id');
            console.log(`   Campo custom_id: ${hasCustomId ? '✅ Existe' : '❌ No existe'}`);
            
            if (hasCustomId) {
                const clients = await query('SELECT id, name, custom_id FROM clients ORDER BY id LIMIT 5');
                console.log('   Primeros 5 clientes:');
                clients.forEach(client => {
                    console.log(`     • ID: ${client.id} - ${client.name} - Custom ID: ${client.custom_id || 'NULL'}`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Verificar estructura de tabla users
        console.log('\n👤 TABLA USERS:');
        try {
            const usersStructure = await query('DESCRIBE users');
            const hasCustomId = usersStructure.some(field => field.Field === 'custom_id');
            console.log(`   Campo custom_id: ${hasCustomId ? '✅ Existe' : '❌ No existe'}`);
            
            if (hasCustomId) {
                const users = await query('SELECT id, username, custom_id FROM users ORDER BY id');
                console.log('   Todos los usuarios:');
                users.forEach(user => {
                    console.log(`     • ID: ${user.id} - ${user.username} - Custom ID: ${user.custom_id || 'NULL'}`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Verificar estructura de tabla locations
        console.log('\n🏢 TABLA LOCATIONS:');
        try {
            const locationsStructure = await query('DESCRIBE locations');
            const hasCustomId = locationsStructure.some(field => field.Field === 'custom_id');
            console.log(`   Campo custom_id: ${hasCustomId ? '✅ Existe' : '❌ No existe'}`);
            
            if (hasCustomId) {
                const locations = await query('SELECT id, name, custom_id FROM locations ORDER BY id LIMIT 5');
                console.log('   Primeras 5 ubicaciones:');
                locations.forEach(location => {
                    console.log(`     • ID: ${location.id} - ${location.name} - Custom ID: ${location.custom_id || 'NULL'}`);
                });
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.end();
        console.log('🔐 Conexión cerrada.');
    }
}

// Ejecutar el script
checkCustomIds(); 