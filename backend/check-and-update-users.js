const mysql = require('mysql2/promise');

async function checkAndUpdateUsers() {
    let connection;
    
    try {
        console.log('🔍 Verificando usuarios existentes...');
        
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('✅ Conectado a la base de datos MySQL');

        // Ver todos los usuarios
        console.log('\n📋 Todos los usuarios en el sistema:');
        const [allUsers] = await connection.execute(`
            SELECT id, username, email, role, specialization, max_daily_tasks 
            FROM users 
            ORDER BY id
        `);
        
        console.table(allUsers);

        // Buscar usuarios que podrían ser técnicos
        console.log('\n🔍 Buscando usuarios con nombres que contengan "tech":');
        const [techUsers] = await connection.execute(`
            SELECT id, username, email, role, specialization, max_daily_tasks 
            FROM users 
            WHERE username LIKE '%tech%'
        `);
        
        if (techUsers.length > 0) {
            console.table(techUsers);
            
            console.log('\n🔧 Actualizando roles a technician...');
            for (const user of techUsers) {
                await connection.execute(`
                    UPDATE users 
                    SET role = 'technician',
                        specialization = CASE 
                            WHEN username LIKE '%cardio%' THEN 'cardio,general'
                            WHEN username LIKE '%fuerza%' THEN 'fuerza,general'
                            WHEN username LIKE '%general%' THEN 'general,cardio,fuerza,funcional'
                            ELSE 'general'
                        END,
                        max_daily_tasks = CASE 
                            WHEN username LIKE '%cardio%' THEN 6
                            WHEN username LIKE '%fuerza%' THEN 8
                            WHEN username LIKE '%general%' THEN 10
                            ELSE 8
                        END
                    WHERE id = ?
                `, [user.id]);
                
                console.log(`✅ Usuario ${user.username} actualizado a technician`);
            }
        } else {
            console.log('❌ No se encontraron usuarios con nombres de técnico');
        }

        // Verificar resultado final
        console.log('\n📋 Técnicos después de la actualización:');
        const [finalTechs] = await connection.execute(`
            SELECT id, username, role, specialization, max_daily_tasks, location_preference 
            FROM users 
            WHERE role = 'technician'
        `);
        
        console.table(finalTechs);

        console.log('\n✅ Verificación y actualización completada');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAndUpdateUsers();