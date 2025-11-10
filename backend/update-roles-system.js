/**
 * Script para actualizar el sistema de roles
 * - Modifica el ENUM de la tabla Users
 * - Migra usuarios existentes a nuevos roles
 * - Crea usuarios de prueba para cada rol
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp'
};

// Mapeo de roles antiguos a nuevos
const roleMapping = {
    'Admin': 'Admin',
    'Tecnico': 'Technician',
    'Cliente': 'Client',
    'Supervisor': 'Manager',
    '': 'Technician' // Usuarios sin rol → Technician por defecto
};

async function updateRolesSystem() {
    let connection;
    
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Conectado a MySQL\n');

        // PASO 1: Respaldar usuarios actuales
        console.log('📋 PASO 1: Respaldando usuarios actuales...');
        const [currentUsers] = await connection.execute('SELECT id, username, email, role FROM Users');
        console.log(`   → ${currentUsers.length} usuarios encontrados`);
        console.log('');

        // PASO 2: Modificar columna role temporalmente a VARCHAR
        console.log('🔧 PASO 2: Modificando estructura de tabla...');
        await connection.execute('ALTER TABLE Users MODIFY COLUMN role VARCHAR(50)');
        console.log('   ✅ Columna role convertida a VARCHAR');
        console.log('');

        // PASO 3: Migrar roles existentes
        console.log('🔄 PASO 3: Migrando roles de usuarios existentes...');
        for (const user of currentUsers) {
            const oldRole = user.role || '';
            const newRole = roleMapping[oldRole] || 'Technician';
            
            await connection.execute(
                'UPDATE Users SET role = ? WHERE id = ?',
                [newRole, user.id]
            );
            
            console.log(`   → User #${user.id} (${user.username}): "${oldRole}" → "${newRole}"`);
        }
        console.log('');

        // PASO 4: Cambiar a ENUM con nuevos valores
        console.log('🔧 PASO 4: Aplicando nuevo ENUM de roles...');
        await connection.execute(`
            ALTER TABLE Users 
            MODIFY COLUMN role ENUM('Admin', 'Manager', 'Technician', 'Client') 
            DEFAULT 'Technician'
        `);
        console.log('   ✅ ENUM actualizado: Admin, Manager, Technician, Client');
        console.log('');

        // PASO 5: Verificar usuarios migrados
        console.log('✅ PASO 5: Verificando usuarios migrados...');
        const [updatedUsers] = await connection.execute('SELECT id, username, email, role FROM Users ORDER BY id');
        console.log('');
        console.table(updatedUsers);

        // PASO 6: Crear usuarios de prueba si no existen
        console.log('👥 PASO 6: Creando/actualizando usuarios de prueba...');
        console.log('');

        const testUsers = [
            { 
                username: 'admin', 
                email: 'admin@gymtec.com', 
                password: 'admin123', 
                role: 'Admin',
                description: 'Usuario administrador (acceso total)'
            },
            { 
                username: 'manager', 
                email: 'manager@gymtec.com', 
                password: 'manager123', 
                role: 'Manager',
                description: 'Usuario gerente (sin configuración del sistema)'
            },
            { 
                username: 'tecnico', 
                email: 'tecnico@gymtec.com', 
                password: 'tecnico123', 
                role: 'Technician',
                description: 'Usuario técnico (solo operaciones)'
            },
            { 
                username: 'cliente', 
                email: 'cliente@gymtec.com', 
                password: 'cliente123', 
                role: 'Client',
                description: 'Usuario cliente (vista limitada)'
            }
        ];

        for (const user of testUsers) {
            // Verificar si el usuario ya existe
            const [existing] = await connection.execute(
                'SELECT id, role FROM Users WHERE username = ?',
                [user.username]
            );

            const hashedPassword = await bcrypt.hash(user.password, 10);

            if (existing.length > 0) {
                // Actualizar usuario existente
                await connection.execute(
                    'UPDATE Users SET email = ?, password = ?, role = ? WHERE username = ?',
                    [user.email, hashedPassword, user.role, user.username]
                );
                console.log(`   ✅ Actualizado: ${user.username} (${user.role})`);
            } else {
                // Crear nuevo usuario
                await connection.execute(
                    'INSERT INTO Users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    [user.username, user.email, hashedPassword, user.role]
                );
                console.log(`   ➕ Creado: ${user.username} (${user.role})`);
            }
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ✅ ACTUALIZACIÓN COMPLETADA CON ÉXITO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('👥 USUARIOS DE PRUEBA DISPONIBLES:');
        console.log('');
        console.log('1. ADMIN (Acceso total)');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   → Puede ver y hacer TODO');
        console.log('');
        console.log('2. MANAGER (Sin configuración)');
        console.log('   Username: manager');
        console.log('   Password: manager123');
        console.log('   → Puede gestionar operaciones y finanzas');
        console.log('');
        console.log('3. TECHNICIAN (Solo operaciones)');
        console.log('   Username: tecnico');
        console.log('   Password: tecnico123');
        console.log('   → Solo tickets, equipos y reportes');
        console.log('');
        console.log('4. CLIENT (Vista mínima)');
        console.log('   Username: cliente');
        console.log('   Password: cliente123');
        console.log('   → Solo sus propios tickets');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('🚀 SIGUIENTE PASO:');
        console.log('   1. Ejecutar: start-servers.bat');
        console.log('   2. Abrir: http://localhost:8080/login.html');
        console.log('   3. Probar login con cada usuario');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('   Código:', error.code);
        if (error.sql) {
            console.error('   SQL:', error.sql);
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Ejecutar
updateRolesSystem();
