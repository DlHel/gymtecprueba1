const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔧 INICIANDO SCRIPT SIMPLE PARA AGREGAR CAMPOS');

// Configuración de conexión
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

console.log('📡 Intentando conectar a MySQL...');

connection.connect((err) => {
    if (err) {
        console.error('❌ Error de conexión:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Conectado a MySQL exitosamente');
    
    // Agregar campo a clients
    console.log('\n👥 Agregando campo custom_id a tabla clients...');
    connection.query('ALTER TABLE clients ADD COLUMN custom_id VARCHAR(20) UNIQUE', (err, result) => {
        if (err) {
            if (err.message.includes('Duplicate column name')) {
                console.log('   ⚠️  Campo custom_id ya existe en clients');
            } else {
                console.log('   ❌ Error en clients:', err.message);
            }
        } else {
            console.log('   ✅ Campo custom_id agregado a clients');
        }
        
        // Agregar campo a users
        console.log('\n👤 Agregando campo custom_id a tabla users...');
        connection.query('ALTER TABLE users ADD COLUMN custom_id VARCHAR(20) UNIQUE', (err, result) => {
            if (err) {
                if (err.message.includes('Duplicate column name')) {
                    console.log('   ⚠️  Campo custom_id ya existe en users');
                } else {
                    console.log('   ❌ Error en users:', err.message);
                }
            } else {
                console.log('   ✅ Campo custom_id agregado a users');
            }
            
            // Agregar campo a locations
            console.log('\n🏢 Agregando campo custom_id a tabla locations...');
            connection.query('ALTER TABLE locations ADD COLUMN custom_id VARCHAR(20) UNIQUE', (err, result) => {
                if (err) {
                    if (err.message.includes('Duplicate column name')) {
                        console.log('   ⚠️  Campo custom_id ya existe en locations');
                    } else {
                        console.log('   ❌ Error en locations:', err.message);
                    }
                } else {
                    console.log('   ✅ Campo custom_id agregado a locations');
                }
                
                console.log('\n✅ Script completado');
                connection.end();
                console.log('🔐 Conexión cerrada');
            });
        });
    });
}); 