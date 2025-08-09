const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔐 MIGRACIÓN: Agregando sistema de autenticación JWT - Gymtec ERP\n');

// Configuración de conexión
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

const connection = mysql.createConnection(config);

async function migrateAuthSystem() {
    try {
        console.log('📡 Conectando a MySQL...');
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('✅ Conectado a MySQL exitosamente\n');

        // 1. Agregar columna last_login a la tabla Users
        console.log('🔄 Agregando campo last_login a tabla Users...');
        await new Promise((resolve, reject) => {
            connection.query(`
                ALTER TABLE Users 
                ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL 
                AFTER status
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('✅ Campo last_login agregado\n');

        // 2. Verificar estructura actual de la tabla Users
        console.log('🔍 Verificando estructura de tabla Users...');
        const tableStructure = await new Promise((resolve, reject) => {
            connection.query('DESCRIBE Users', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        console.log('📋 Estructura actual de Users:');
        tableStructure.forEach(field => {
            console.log(`   ${field.Field}: ${field.Type} ${field.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${field.Key ? `(${field.Key})` : ''}`);
        });

        // 3. Verificar si hay usuarios existentes
        console.log('\n👥 Verificando usuarios existentes...');
        const existingUsers = await new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM Users', (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count);
            });
        });

        console.log(`📊 Usuarios existentes: ${existingUsers}`);

        if (existingUsers > 0) {
            console.log('\n⚠️  ADVERTENCIA: Hay usuarios existentes con contraseñas en texto plano.');
            console.log('💡 Se recomienda que los usuarios cambien sus contraseñas después del login.');
            console.log('🔄 El sistema detectará automáticamente contraseñas sin hash y las convertirá.');
        }

        // 4. Crear usuario administrador por defecto si no existe
        console.log('\n👨‍💼 Verificando usuario administrador...');
        const adminExists = await new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM Users WHERE role = "Admin"', (err, results) => {
                if (err) reject(err);
                else resolve(results[0].count);
            });
        });

        if (adminExists === 0) {
            console.log('🔄 Creando usuario administrador por defecto...');
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await new Promise((resolve, reject) => {
                connection.query(`
                    INSERT INTO Users (username, email, password, role, status) 
                    VALUES ('admin', 'admin@gymtec.com', ?, 'Admin', 'Activo')
                `, [hashedPassword], (err) => {
                    if (err) {
                        // Si el usuario ya existe por username, intentar actualizar
                        if (err.code === 'ER_DUP_ENTRY') {
                            console.log('⚠️  Usuario admin ya existe, verificando si tiene rol Admin...');
                            connection.query(`
                                UPDATE Users SET role = 'Admin', email = 'admin@gymtec.com' 
                                WHERE username = 'admin'
                            `, (updateErr) => {
                                if (updateErr) reject(updateErr);
                                else {
                                    console.log('✅ Usuario admin actualizado con rol Admin');
                                    resolve();
                                }
                            });
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve();
                    }
                });
            });
            
            console.log('✅ Usuario administrador configurado:');
            console.log('   � Username: admin');
            console.log('   � Email: admin@gymtec.com');
            console.log('   🔑 Contraseña: (usar la actual del sistema)');
        } else {
            console.log('✅ Usuario administrador ya existe');
        }

        // 5. Agregar configuraciones del sistema para JWT
        console.log('\n⚙️  Agregando configuraciones de autenticación...');
        await new Promise((resolve, reject) => {
            connection.query(`
                INSERT IGNORE INTO SystemConfig (category, \`key\`, value, description) VALUES
                ('auth', 'jwt_secret', 'gymtec_jwt_secret_2024_${Date.now()}', 'Clave secreta para JWT'),
                ('auth', 'jwt_expires_in', '24h', 'Tiempo de expiración del token JWT'),
                ('auth', 'session_timeout', '3600', 'Timeout de sesión en segundos'),
                ('auth', 'max_login_attempts', '5', 'Máximo número de intentos de login'),
                ('auth', 'password_min_length', '6', 'Longitud mínima de contraseña')
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('✅ Configuraciones de autenticación agregadas\n');

        console.log('🎉 Migración de sistema de autenticación completada exitosamente!');
        console.log('\n📋 Próximos pasos:');
        console.log('1. Reiniciar el servidor backend');
        console.log('2. Implementar frontend de login');
        console.log('3. Proteger rutas que requieran autenticación');
        console.log('4. Cambiar contraseña del administrador por defecto');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        process.exit(1);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

// Ejecutar migración
migrateAuthSystem();
