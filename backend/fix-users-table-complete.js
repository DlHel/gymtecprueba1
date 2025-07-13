/**
 * Script para corregir completamente la estructura de la tabla Users
 * Hacer que coincida con lo que espera el código del servidor
 */

const mysql = require('mysql2/promise');

async function fixUsersTableComplete() {
    const timestamp = () => new Date().toLocaleTimeString();
    
    console.log(`[${timestamp()}] 🔧 Corrigiendo estructura completa de tabla Users...`);
    
    // Configuración de conexión
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gymtec_erp'
    });

    try {
        // 1. Verificar estructura actual
        console.log(`[${timestamp()}] 📋 Estructura actual de la tabla Users:`);
        const [currentColumns] = await connection.execute('DESCRIBE Users');
        console.table(currentColumns);
        
        // 2. Agregar columna 'role' si no existe
        const roleColumn = currentColumns.find(col => col.Field === 'role');
        if (!roleColumn) {
            console.log(`[${timestamp()}] 🔧 Agregando columna 'role'...`);
            await connection.execute(`
                ALTER TABLE Users 
                ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'Técnico' AFTER password
            `);
            console.log(`[${timestamp()}] ✅ Columna 'role' agregada`);
        } else {
            console.log(`[${timestamp()}] ✅ Columna 'role' ya existe`);
        }
        
        // 3. Agregar columna 'status' si no existe
        const statusColumn = currentColumns.find(col => col.Field === 'status');
        if (!statusColumn) {
            console.log(`[${timestamp()}] 🔧 Agregando columna 'status'...`);
            await connection.execute(`
                ALTER TABLE Users 
                ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Activo' AFTER role
            `);
            console.log(`[${timestamp()}] ✅ Columna 'status' agregada`);
        } else {
            console.log(`[${timestamp()}] ✅ Columna 'status' ya existe`);
        }
        
        // 4. Actualizar datos existentes si role_id existe
        const roleIdColumn = currentColumns.find(col => col.Field === 'role_id');
        if (roleIdColumn) {
            console.log(`[${timestamp()}] 🔄 Migrando datos de role_id a role...`);
            
            // Mapear role_id a nombres de roles
            await connection.execute(`
                UPDATE Users SET role = CASE 
                    WHEN role_id = 1 THEN 'Administrador'
                    WHEN role_id = 2 THEN 'Técnico'
                    WHEN role_id = 3 THEN 'Supervisor'
                    WHEN role_id = 4 THEN 'Cliente'
                    ELSE 'Técnico'
                END
                WHERE role_id IS NOT NULL
            `);
            
            console.log(`[${timestamp()}] ✅ Datos migrados de role_id a role`);
        }
        
        // 5. Actualizar emails para usuarios existentes si están vacíos
        console.log(`[${timestamp()}] 🔄 Actualizando emails faltantes...`);
        await connection.execute(`
            UPDATE Users SET email = CONCAT(username, '@gymtec.com') 
            WHERE email IS NULL OR email = ''
        `);
        
        // 6. Actualizar status para usuarios existentes
        console.log(`[${timestamp()}] 🔄 Actualizando status faltantes...`);
        await connection.execute(`
            UPDATE Users SET status = 'Activo' 
            WHERE status IS NULL OR status = ''
        `);
        
        // 7. Mostrar estructura final
        console.log(`[${timestamp()}] 📋 Estructura final de la tabla Users:`);
        const [finalColumns] = await connection.execute('DESCRIBE Users');
        console.table(finalColumns);
        
        // 8. Mostrar datos de ejemplo
        console.log(`[${timestamp()}] 📊 Datos actuales en la tabla Users:`);
        const [users] = await connection.execute(`
            SELECT id, username, email, role, status, created_at 
            FROM Users 
            ORDER BY id
        `);
        console.table(users);
        
        // 9. Verificar que la consulta del servidor funcione
        console.log(`[${timestamp()}] 🧪 Probando consulta del servidor...`);
        const [testQuery] = await connection.execute(`
            SELECT id, username, email, role, status, created_at 
            FROM Users 
            ORDER BY username
        `);
        console.log(`[${timestamp()}] ✅ Consulta exitosa: ${testQuery.length} usuarios encontrados`);
        
    } catch (error) {
        console.error(`[${timestamp()}] ❌ Error: ${error.message}`);
        console.error(`[${timestamp()}] 🔍 Stack: ${error.stack}`);
    } finally {
        await connection.end();
        console.log(`[${timestamp()}] 🔌 Conexión cerrada`);
        console.log(`[${timestamp()}] 🎉 Corrección de tabla Users completada`);
    }
}

// Ejecutar la corrección
fixUsersTableComplete().catch(console.error); 