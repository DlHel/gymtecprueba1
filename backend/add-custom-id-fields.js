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

async function addCustomIdFields() {
    try {
        console.log('🔧 AGREGANDO CAMPOS CUSTOM_ID');
        console.log('='.repeat(40));
        
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // Agregar campo custom_id a tabla clients
        console.log('👥 Agregando custom_id a tabla CLIENTS...');
        try {
            await query('ALTER TABLE clients ADD COLUMN custom_id VARCHAR(20) UNIQUE');
            console.log('   ✅ Campo custom_id agregado a clients');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('   ⚠️  Campo custom_id ya existe en clients');
            } else {
                console.log('   ❌ Error:', error.message);
            }
        }

        // Agregar campo custom_id a tabla users
        console.log('\n👤 Agregando custom_id a tabla USERS...');
        try {
            await query('ALTER TABLE users ADD COLUMN custom_id VARCHAR(20) UNIQUE');
            console.log('   ✅ Campo custom_id agregado a users');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('   ⚠️  Campo custom_id ya existe en users');
            } else {
                console.log('   ❌ Error:', error.message);
            }
        }

        // Agregar campo custom_id a tabla locations
        console.log('\n🏢 Agregando custom_id a tabla LOCATIONS...');
        try {
            await query('ALTER TABLE locations ADD COLUMN custom_id VARCHAR(20) UNIQUE');
            console.log('   ✅ Campo custom_id agregado a locations');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('   ⚠️  Campo custom_id ya existe en locations');
            } else {
                console.log('   ❌ Error:', error.message);
            }
        }

        console.log('\n' + '='.repeat(40));
        console.log('✅ Campos custom_id agregados exitosamente');
        
    } catch (error) {
        console.error('❌ Error general:', error.message);
    } finally {
        connection.end();
        console.log('🔐 Conexión cerrada.');
    }
}

// Ejecutar el script
addCustomIdFields(); 