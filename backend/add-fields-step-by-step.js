const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🔧 AGREGANDO CAMPOS CUSTOM_ID PASO A PASO');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

function executeQuery(query, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n${description}`);
        console.log(`   Ejecutando: ${query}`);
        
        connection.query(query, (err, result) => {
            if (err) {
                console.log(`   ❌ Error: ${err.message}`);
                reject(err);
            } else {
                console.log(`   ✅ Exitoso`);
                resolve(result);
            }
        });
    });
}

async function addFieldsStepByStep() {
    try {
        console.log('\n📡 Conectando...');
        
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) {
                    console.error('❌ Error de conexión:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conectado exitosamente');
                    resolve();
                }
            });
        });

        // Paso 1: Agregar campo a clients
        try {
            await executeQuery(
                'ALTER TABLE clients ADD COLUMN custom_id VARCHAR(20) UNIQUE',
                '👥 PASO 1: Agregando custom_id a tabla CLIENTS'
            );
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('   ⚠️  Campo ya existe, continuando...');
            } else {
                throw error;
            }
        }

        // Paso 2: Agregar campo a users
        try {
            await executeQuery(
                'ALTER TABLE users ADD COLUMN custom_id VARCHAR(20) UNIQUE',
                '👤 PASO 2: Agregando custom_id a tabla USERS'
            );
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('   ⚠️  Campo ya existe, continuando...');
            } else {
                throw error;
            }
        }

        // Paso 3: Agregar campo a locations
        try {
            await executeQuery(
                'ALTER TABLE locations ADD COLUMN custom_id VARCHAR(20) UNIQUE',
                '🏢 PASO 3: Agregando custom_id a tabla LOCATIONS'
            );
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('   ⚠️  Campo ya existe, continuando...');
            } else {
                throw error;
            }
        }

        // Verificar resultados
        console.log('\n📊 VERIFICANDO RESULTADOS:');
        
        const clientsFields = await new Promise((resolve) => {
            connection.query('DESCRIBE clients', (err, fields) => {
                if (err) {
                    console.log('   ❌ Error verificando clients');
                    resolve([]);
                } else {
                    resolve(fields);
                }
            });
        });
        
        const hasClientCustomId = clientsFields.some(field => field.Field === 'custom_id');
        console.log(`   clients.custom_id: ${hasClientCustomId ? '✅ Existe' : '❌ No existe'}`);

        const usersFields = await new Promise((resolve) => {
            connection.query('DESCRIBE users', (err, fields) => {
                if (err) {
                    console.log('   ❌ Error verificando users');
                    resolve([]);
                } else {
                    resolve(fields);
                }
            });
        });
        
        const hasUserCustomId = usersFields.some(field => field.Field === 'custom_id');
        console.log(`   users.custom_id: ${hasUserCustomId ? '✅ Existe' : '❌ No existe'}`);

        const locationsFields = await new Promise((resolve) => {
            connection.query('DESCRIBE locations', (err, fields) => {
                if (err) {
                    console.log('   ❌ Error verificando locations');
                    resolve([]);
                } else {
                    resolve(fields);
                }
            });
        });
        
        const hasLocationCustomId = locationsFields.some(field => field.Field === 'custom_id');
        console.log(`   locations.custom_id: ${hasLocationCustomId ? '✅ Existe' : '❌ No existe'}`);

        console.log('\n🎉 PROCESO COMPLETADO');
        
    } catch (error) {
        console.error('\n❌ Error en el proceso:', error.message);
    } finally {
        connection.end();
        console.log('🔐 Conexión cerrada');
    }
}

addFieldsStepByStep(); 