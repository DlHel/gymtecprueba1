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

// Función para generar ID de cliente: [4 Primeras Letras Nombre][Correlativo 4 Dígitos]
function generateClientCustomId(clientName, correlativo) {
    // Tomar las primeras 4 letras del nombre, limpiar caracteres especiales
    const cleanName = clientName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toLowerCase().padEnd(4, 'x');
    const suffix = correlativo.toString().padStart(4, '0');
    return `${cleanName}${suffix}`;
}

// Función para generar ID de usuario: [4 Primeras Letras Username][Correlativo 4 Dígitos]
function generateUserCustomId(username, correlativo) {
    // Tomar las primeras 4 letras del username, convertir a minúsculas
    const prefix = username.substring(0, 4).toLowerCase().padEnd(4, 'x');
    // Formato: 4 dígitos con ceros a la izquierda
    const suffix = correlativo.toString().padStart(4, '0');
    return `${prefix}${suffix}`;
}

// Función para generar ID de sede: [ID Cliente]-[Correlativo 3 Dígitos]
function generateLocationCustomId(clientCustomId, correlativo) {
    // Formato: clientCustomId + '-' + correlativo de 3 dígitos
    const suffix = correlativo.toString().padStart(3, '0');
    return `${clientCustomId}-${suffix}`;
}

async function generateCustomIds() {
    try {
        console.log('🔧 GENERANDO IDS PERSONALIZADOS');
        console.log('='.repeat(50));
        
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // PASO 1: GENERAR CUSTOM_IDS PARA CLIENTES
        console.log('👥 PASO 1: GENERANDO CUSTOM_IDS PARA CLIENTES');
        
        const clients = await query('SELECT id, name FROM clients ORDER BY id');
        let clientCorrelativo = 1001;
        
        console.log(`   📊 Encontrados ${clients.length} clientes`);
        
        for (const client of clients) {
            const customId = generateClientCustomId(client.name, clientCorrelativo);
            
            try {
                await query('UPDATE clients SET custom_id = ? WHERE id = ?', [customId, client.id]);
                console.log(`   ✅ Cliente ID ${client.id}: "${client.name}" → ${customId}`);
                clientCorrelativo++;
            } catch (error) {
                console.log(`   ❌ Error actualizando cliente ${client.id}: ${error.message}`);
            }
        }

        // PASO 2: GENERAR CUSTOM_IDS PARA USUARIOS
        console.log('\n👤 PASO 2: GENERANDO CUSTOM_IDS PARA USUARIOS');
        
        const users = await query('SELECT id, username FROM users ORDER BY id');
        let userCorrelativo = 1001;
        
        console.log(`   📊 Encontrados ${users.length} usuarios`);
        
        for (const user of users) {
            const customId = generateUserCustomId(user.username, userCorrelativo);
            
            try {
                await query('UPDATE users SET custom_id = ? WHERE id = ?', [customId, user.id]);
                console.log(`   ✅ Usuario ID ${user.id}: "${user.username}" → ${customId}`);
                userCorrelativo++;
            } catch (error) {
                console.log(`   ❌ Error actualizando usuario ${user.id}: ${error.message}`);
            }
        }

        // PASO 3: GENERAR CUSTOM_IDS PARA UBICACIONES
        console.log('\n🏢 PASO 3: GENERANDO CUSTOM_IDS PARA UBICACIONES');
        
        // Obtener ubicaciones con información del cliente
        const locations = await query(`
            SELECT l.id, l.name, l.client_id, c.custom_id as client_custom_id, c.name as client_name
            FROM locations l
            JOIN clients c ON l.client_id = c.id
            ORDER BY c.custom_id, l.id
        `);
        
        console.log(`   📊 Encontradas ${locations.length} ubicaciones`);
        
        // Agrupar por cliente para generar correlativos
        const locationsByClient = {};
        
        for (const location of locations) {
            const clientCustomId = location.client_custom_id;
            
            if (!locationsByClient[clientCustomId]) {
                locationsByClient[clientCustomId] = [];
            }
            locationsByClient[clientCustomId].push(location);
        }
        
        // Generar custom_ids para ubicaciones
        for (const [clientCustomId, clientLocations] of Object.entries(locationsByClient)) {
            console.log(`   🏢 Cliente ${clientCustomId}:`);
            
            let correlativo = 1;
            for (const location of clientLocations) {
                const customId = generateLocationCustomId(clientCustomId, correlativo);
                
                try {
                    await query('UPDATE locations SET custom_id = ? WHERE id = ?', [customId, location.id]);
                    console.log(`      ✅ Ubicación ID ${location.id}: "${location.name}" → ${customId}`);
                    correlativo++;
                } catch (error) {
                    console.log(`      ❌ Error actualizando ubicación ${location.id}: ${error.message}`);
                }
            }
        }

        // PASO 4: VERIFICAR RESULTADOS FINALES
        console.log('\n📊 PASO 4: VERIFICANDO RESULTADOS FINALES');
        
        const clientsWithCustomId = await query('SELECT id, name, custom_id FROM clients ORDER BY custom_id');
        console.log('\n👥 CLIENTES CON CUSTOM_ID:');
        clientsWithCustomId.forEach(client => {
            console.log(`   • ${client.custom_id} - ${client.name} (ID: ${client.id})`);
        });

        const usersWithCustomId = await query('SELECT id, username, custom_id FROM users ORDER BY custom_id');
        console.log('\n👤 USUARIOS CON CUSTOM_ID:');
        usersWithCustomId.forEach(user => {
            console.log(`   • ${user.custom_id} - ${user.username} (ID: ${user.id})`);
        });

        const locationsWithCustomId = await query(`
            SELECT l.id, l.name, l.custom_id, c.name as client_name
            FROM locations l
            JOIN clients c ON l.client_id = c.id
            ORDER BY l.custom_id
        `);
        console.log('\n🏢 UBICACIONES CON CUSTOM_ID:');
        locationsWithCustomId.forEach(location => {
            console.log(`   • ${location.custom_id} - ${location.name} (${location.client_name})`);
        });

        // RESUMEN FINAL
        console.log('\n' + '='.repeat(50));
        console.log('🎉 GENERACIÓN DE IDS COMPLETADA EXITOSAMENTE');
        console.log(`   👥 ${clientsWithCustomId.length} clientes con custom_id`);
        console.log(`   👤 ${usersWithCustomId.length} usuarios con custom_id`);
        console.log(`   🏢 ${locationsWithCustomId.length} ubicaciones con custom_id`);
        
        console.log('\n📋 FORMATOS IMPLEMENTADOS:');
        console.log('   • Cliente: [4 letras nombre][correlativo 4 dígitos] (ej: spor1001)');
        console.log('   • Usuario: [4 letras username][correlativo 4 dígitos] (ej: admi1001)');
        console.log('   • Ubicación: [custom_id cliente]-[correlativo 3 dígitos] (ej: spor1001-001)');
        
        console.log('\n✅ Sistema listo con identificadores personalizados completamente implementados');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

// Ejecutar el script
generateCustomIds(); 