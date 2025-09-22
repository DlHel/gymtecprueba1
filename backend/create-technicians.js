const mysql = require('mysql2/promise');

async function createTechnicians() {
    let connection;
    
    try {
        console.log('🔧 Creando técnicos para el sistema de asignación inteligente...');
        
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });

        console.log('✅ Conectado a la base de datos MySQL');

        // Verificar si ya existen técnicos
        const [existingTechs] = await connection.execute(`
            SELECT id, username, role 
            FROM users 
            WHERE role = 'technician'
        `);
        
        console.log(`Técnicos existentes: ${existingTechs.length}`);

        if (existingTechs.length === 0) {
            console.log('\n🔧 Creando técnicos de ejemplo...');
            
            const technicians = [
                {
                    username: 'tech_cardio',
                    email: 'cardio@gymtec.com',
                    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password hash for "password"
                    role: 'technician',
                    specialization: 'cardio,general',
                    max_daily_tasks: 6,
                    location_preference: '1'
                },
                {
                    username: 'tech_fuerza',
                    email: 'fuerza@gymtec.com',
                    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
                    role: 'technician',
                    specialization: 'fuerza,general',
                    max_daily_tasks: 8,
                    location_preference: '2'
                },
                {
                    username: 'tech_general',
                    email: 'general@gymtec.com',
                    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
                    role: 'technician',
                    specialization: 'general,cardio,fuerza,funcional',
                    max_daily_tasks: 10,
                    location_preference: null
                }
            ];
            
            for (const tech of technicians) {
                try {
                    await connection.execute(`
                        INSERT INTO users (username, email, password, role, specialization, max_daily_tasks, location_preference)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [tech.username, tech.email, tech.password, tech.role, tech.specialization, tech.max_daily_tasks, tech.location_preference]);
                    
                    console.log(`✅ Técnico creado: ${tech.username} (especialización: ${tech.specialization}, max_tareas: ${tech.max_daily_tasks})`);
                } catch (error) {
                    console.error(`❌ Error creando técnico ${tech.username}:`, error.message);
                }
            }
        } else {
            console.log('\n🔧 Actualizando técnicos existentes...');
            
            // Actualizar técnicos existentes con especializaciones si no las tienen
            for (const tech of existingTechs) {
                const [techData] = await connection.execute(`
                    SELECT specialization, max_daily_tasks 
                    FROM users 
                    WHERE id = ?
                `, [tech.id]);
                
                if (!techData[0] || !techData[0].specialization) {
                    await connection.execute(`
                        UPDATE users 
                        SET specialization = 'general', max_daily_tasks = 8 
                        WHERE id = ?
                    `, [tech.id]);
                    console.log(`✅ Técnico ${tech.username} actualizado con especialización 'general'`);
                }
            }
        }

        // Verificar resultado final
        console.log('\n📋 Técnicos finales en el sistema:');
        const [finalTechs] = await connection.execute(`
            SELECT id, username, role, specialization, max_daily_tasks, location_preference 
            FROM users 
            WHERE role = 'technician'
        `);
        
        console.table(finalTechs);

        console.log('\n✅ Proceso de creación de técnicos completado');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTechnicians();