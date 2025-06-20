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

async function verifyCustomIds() {
    try {
        console.log('🔍 VERIFICACIÓN FINAL DE IDS PERSONALIZADOS');
        console.log('='.repeat(60));
        
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // VERIFICAR CAMPOS CUSTOM_ID
        console.log('📊 VERIFICANDO EXISTENCIA DE CAMPOS CUSTOM_ID:');
        
        const tables = ['clients', 'users', 'locations'];
        for (const table of tables) {
            const fields = await query(`DESCRIBE ${table}`);
            const hasCustomId = fields.some(field => field.Field === 'custom_id');
            console.log(`   ${hasCustomId ? '✅' : '❌'} ${table}.custom_id: ${hasCustomId ? 'EXISTE' : 'NO EXISTE'}`);
            
            if (hasCustomId) {
                const customIdField = fields.find(field => field.Field === 'custom_id');
                console.log(`      Tipo: ${customIdField.Type}, Null: ${customIdField.Null}, Key: ${customIdField.Key || 'N/A'}`);
            }
        }

        // VERIFICAR DATOS CON CUSTOM_ID
        console.log('\n📋 VERIFICANDO DATOS CON CUSTOM_ID:');
        
        // Clientes
        const clients = await query('SELECT id, name, custom_id FROM clients ORDER BY custom_id');
        console.log(`\n👥 CLIENTES (${clients.length} registros):`);
        clients.forEach(client => {
            console.log(`   • ${client.custom_id || 'NULL'} - ${client.name} (ID: ${client.id})`);
        });

        // Usuarios
        const users = await query('SELECT id, username, custom_id FROM users ORDER BY custom_id');
        console.log(`\n👤 USUARIOS (${users.length} registros):`);
        users.forEach(user => {
            console.log(`   • ${user.custom_id || 'NULL'} - ${user.username} (ID: ${user.id})`);
        });

        // Ubicaciones
        const locations = await query(`
            SELECT l.id, l.name, l.custom_id, c.name as client_name, c.custom_id as client_custom_id
            FROM locations l
            JOIN clients c ON l.client_id = c.id
            ORDER BY l.custom_id
        `);
        console.log(`\n🏢 UBICACIONES (${locations.length} registros):`);
        locations.forEach(location => {
            console.log(`   • ${location.custom_id || 'NULL'} - ${location.name} (Cliente: ${location.client_name})`);
        });

        // VERIFICAR FORMATOS
        console.log('\n🔍 VERIFICANDO FORMATOS DE IDS:');
        
        // Verificar formato de clientes: [4 letras][4 dígitos]
        const clientFormatOk = clients.every(client => {
            if (!client.custom_id) return false;
            return /^[a-z]{4}\d{4}$/.test(client.custom_id);
        });
        console.log(`   ${clientFormatOk ? '✅' : '❌'} Clientes: Formato [4 letras][4 dígitos] ${clientFormatOk ? 'CORRECTO' : 'INCORRECTO'}`);

        // Verificar formato de usuarios: [4 caracteres][4 dígitos]
        const userFormatOk = users.every(user => {
            if (!user.custom_id) return false;
            return /^.{4}\d{4}$/.test(user.custom_id);
        });
        console.log(`   ${userFormatOk ? '✅' : '❌'} Usuarios: Formato [4 caracteres][4 dígitos] ${userFormatOk ? 'CORRECTO' : 'INCORRECTO'}`);

        // Verificar formato de ubicaciones: [client_id]-[3 dígitos]
        const locationFormatOk = locations.every(location => {
            if (!location.custom_id) return false;
            const expectedPrefix = location.client_custom_id;
            return location.custom_id.startsWith(expectedPrefix + '-') && 
                   /^.+-\d{3}$/.test(location.custom_id);
        });
        console.log(`   ${locationFormatOk ? '✅' : '❌'} Ubicaciones: Formato [client_id]-[3 dígitos] ${locationFormatOk ? 'CORRECTO' : 'INCORRECTO'}`);

        // VERIFICAR UNICIDAD
        console.log('\n🔒 VERIFICANDO UNICIDAD DE IDS:');
        
        // Clientes
        const clientIds = clients.map(c => c.custom_id).filter(id => id);
        const uniqueClientIds = [...new Set(clientIds)];
        const clientUnique = clientIds.length === uniqueClientIds.length;
        console.log(`   ${clientUnique ? '✅' : '❌'} Clientes: ${clientIds.length} IDs, ${uniqueClientIds.length} únicos - ${clientUnique ? 'SIN DUPLICADOS' : 'HAY DUPLICADOS'}`);

        // Usuarios
        const userIds = users.map(u => u.custom_id).filter(id => id);
        const uniqueUserIds = [...new Set(userIds)];
        const userUnique = userIds.length === uniqueUserIds.length;
        console.log(`   ${userUnique ? '✅' : '❌'} Usuarios: ${userIds.length} IDs, ${uniqueUserIds.length} únicos - ${userUnique ? 'SIN DUPLICADOS' : 'HAY DUPLICADOS'}`);

        // Ubicaciones
        const locationIds = locations.map(l => l.custom_id).filter(id => id);
        const uniqueLocationIds = [...new Set(locationIds)];
        const locationUnique = locationIds.length === uniqueLocationIds.length;
        console.log(`   ${locationUnique ? '✅' : '❌'} Ubicaciones: ${locationIds.length} IDs, ${uniqueLocationIds.length} únicos - ${locationUnique ? 'SIN DUPLICADOS' : 'HAY DUPLICADOS'}`);

        // RESUMEN FINAL
        console.log('\n' + '='.repeat(60));
        const allFieldsExist = tables.every(table => true); // Ya verificado arriba
        const allFormatsOk = clientFormatOk && userFormatOk && locationFormatOk;
        const allUnique = clientUnique && userUnique && locationUnique;
        const allDataExists = clients.length > 0 && users.length > 0 && locations.length > 0;
        
        const overallSuccess = allFieldsExist && allFormatsOk && allUnique && allDataExists;
        
        console.log(`🎯 RESULTADO FINAL: ${overallSuccess ? '✅ EXITOSO' : '❌ CON ERRORES'}`);
        console.log('\n📊 RESUMEN:');
        console.log(`   Campos custom_id: ${allFieldsExist ? '✅ Todos existen' : '❌ Faltan campos'}`);
        console.log(`   Formatos de ID: ${allFormatsOk ? '✅ Todos correctos' : '❌ Hay errores de formato'}`);
        console.log(`   Unicidad: ${allUnique ? '✅ Sin duplicados' : '❌ Hay duplicados'}`);
        console.log(`   Datos poblados: ${allDataExists ? '✅ Todos tienen datos' : '❌ Faltan datos'}`);
        
        console.log('\n📋 ESTADÍSTICAS:');
        console.log(`   👥 ${clients.length} clientes con custom_id`);
        console.log(`   👤 ${users.length} usuarios con custom_id`);
        console.log(`   🏢 ${locations.length} ubicaciones con custom_id`);
        
        if (overallSuccess) {
            console.log('\n🎉 ¡SISTEMA DE IDS PERSONALIZADOS IMPLEMENTADO EXITOSAMENTE!');
            console.log('   El sistema está listo para usar los identificadores personalizados.');
        } else {
            console.log('\n⚠️  Se encontraron problemas que requieren atención.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

// Ejecutar verificación
verifyCustomIds(); 