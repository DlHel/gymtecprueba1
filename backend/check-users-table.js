/**
 * Script para verificar y corregir la estructura de la tabla Users
 */

const mysql = require('mysql2/promise');

async function checkUsersTable() {
    const timestamp = () => new Date().toLocaleTimeString();
    
    console.log(`[${timestamp()}] 🔍 Verificando estructura de tabla Users...`);
    
    // Configuración de conexión
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });

    try {
        // Verificar estructura actual de la tabla Users
        console.log(`[${timestamp()}] 📋 Estructura actual de la tabla Users:`);
        const [columns] = await connection.execute('DESCRIBE Users');
        
        console.table(columns);
        
        // Verificar si existe la columna email
        const emailColumn = columns.find(col => col.Field === 'email');
        
        if (!emailColumn) {
            console.log(`[${timestamp()}] ❌ La columna 'email' no existe en la tabla Users`);
            console.log(`[${timestamp()}] 🔧 Agregando columna email...`);
            
            // Agregar columna email
            await connection.execute(`
                ALTER TABLE Users 
                ADD COLUMN email VARCHAR(255) UNIQUE AFTER username
            `);
            
            console.log(`[${timestamp()}] ✅ Columna email agregada exitosamente`);
        } else {
            console.log(`[${timestamp()}] ✅ La columna 'email' ya existe`);
        }
        
        // Verificar si existe la columna password
        const passwordColumn = columns.find(col => col.Field === 'password');
        
        if (!passwordColumn) {
            console.log(`[${timestamp()}] ❌ La columna 'password' no existe en la tabla Users`);
            console.log(`[${timestamp()}] 🔧 Agregando columna password...`);
            
            // Agregar columna password
            await connection.execute(`
                ALTER TABLE Users 
                ADD COLUMN password VARCHAR(255) NOT NULL AFTER email
            `);
            
            console.log(`[${timestamp()}] ✅ Columna password agregada exitosamente`);
        } else {
            console.log(`[${timestamp()}] ✅ La columna 'password' ya existe`);
        }
        
        // Mostrar estructura final
        console.log(`[${timestamp()}] 📋 Estructura final de la tabla Users:`);
        const [finalColumns] = await connection.execute('DESCRIBE Users');
        console.table(finalColumns);
        
        // Agregar algunos datos de ejemplo si no existen
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM Users');
        const userCount = users[0].count;
        
        if (userCount === 0) {
            console.log(`[${timestamp()}] 📝 Agregando usuarios de ejemplo...`);
            
            const sampleUsers = [
                ['admin', 'admin@gymtec.com', 'admin123', 'Administrador', 'Activo'],
                ['felipe_tech', 'felipe@gymtec.com', 'felipe123', 'Técnico', 'Activo'],
                ['maria_supervisor', 'maria@gymtec.com', 'maria123', 'Supervisor', 'Activo'],
                ['carlos_tech', 'carlos@gymtec.com', 'carlos123', 'Técnico', 'Activo'],
                ['ana_admin', 'ana@gymtec.com', 'ana123', 'Administrador', 'Activo']
            ];
            
            for (const [username, email, password, role, status] of sampleUsers) {
                await connection.execute(`
                    INSERT INTO Users (username, email, password, role, status) 
                    VALUES (?, ?, ?, ?, ?)
                `, [username, email, password, role, status]);
            }
            
            console.log(`[${timestamp()}] ✅ ${sampleUsers.length} usuarios de ejemplo agregados`);
        } else {
            console.log(`[${timestamp()}] ℹ️ La tabla Users ya tiene ${userCount} usuarios`);
        }
        
    } catch (error) {
        console.error(`[${timestamp()}] ❌ Error: ${error.message}`);
    } finally {
        await connection.end();
        console.log(`[${timestamp()}] 🔌 Conexión cerrada`);
    }
}

// Ejecutar la verificación
checkUsersTable().catch(console.error); 