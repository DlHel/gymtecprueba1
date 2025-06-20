const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🧹 LIMPIEZA Y POBLACIÓN COMPLETA DE BASE DE DATOS\n');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

async function cleanAndPopulate() {
    try {
        console.log('📡 Conectando a MySQL...');
        await query('SELECT 1');
        console.log('✅ Conectado exitosamente\n');

        // 1. LIMPIAR DATOS DUPLICADOS Y DE PRUEBA
        console.log('🧹 PASO 1: LIMPIANDO DATOS DUPLICADOS Y DE PRUEBA');
        
        // Eliminar clientes de prueba (mantener solo los reales)
        console.log('   🗑️  Eliminando clientes de prueba...');
        await query(`DELETE FROM clients WHERE name LIKE '%Cliente Prueba MySQL%'`);
        
        // Eliminar ubicaciones huérfanas (sin cliente válido)
        console.log('   🗑️  Eliminando ubicaciones huérfanas...');
        await query(`
            DELETE FROM locations 
            WHERE client_id NOT IN (SELECT id FROM clients)
        `);
        
        // Eliminar equipos huérfanos (sin ubicación válida)
        console.log('   🗑️  Eliminando equipos huérfanos...');
        await query(`
            DELETE FROM equipment 
            WHERE location_id NOT IN (SELECT id FROM locations)
        `);
        
        console.log('   ✅ Limpieza completada\n');

        // 2. VERIFICAR Y COMPLETAR CLIENTES
        console.log('🏢 PASO 2: VERIFICANDO Y COMPLETANDO CLIENTES');
        
        const currentClients = await query('SELECT COUNT(*) as count FROM clients');
        console.log(`   📊 Clientes actuales: ${currentClients[0].count}`);
        
        if (currentClients[0].count < 8) {
            console.log('   ➕ Agregando clientes faltantes...');
            
            const clientsToAdd = [
                {
                    name: 'Fitness Zone Premium S.A.',
                    rut: '76.123.456-7',
                    email: 'contacto@fitnesszone.cl',
                    phone: '+56 2 2234 5678',
                    address: 'Av. Vitacura 9876, Vitacura',
                    business_sector: 'Fitness y Bienestar'
                },
                {
                    name: 'PowerGym Santiago Ltda.',
                    rut: '78.987.654-3',
                    email: 'info@powergym.cl',
                    phone: '+56 2 2876 5432',
                    address: 'Av. Pajaritos 2468, Maipú',
                    business_sector: 'Entrenamiento Funcional'
                },
                {
                    name: 'AquaFit Center SpA',
                    rut: '77.555.888-9',
                    email: 'admin@aquafit.cl',
                    phone: '+56 2 2555 8888',
                    address: 'Av. Ñuñoa 1357, Ñuñoa',
                    business_sector: 'Fitness Acuático'
                },
                {
                    name: 'CrossFit Maipú E.I.R.L.',
                    rut: '79.111.222-1',
                    email: 'hola@crossfitmaip.cl',
                    phone: '+56 2 2111 2221',
                    address: 'Calle Los Pajaritos 1111, Maipú',
                    business_sector: 'CrossFit y Funcional'
                },
                {
                    name: 'Wellness Club S.A.',
                    rut: '76.333.444-5',
                    email: 'contacto@wellness.cl',
                    phone: '+56 2 2333 4445',
                    address: 'Av. Las Condes 3344, Las Condes',
                    business_sector: 'Wellness y Spa'
                }
            ];
            
            for (const client of clientsToAdd) {
                try {
                    // Verificar si ya existe
                    const exists = await query('SELECT id FROM clients WHERE rut = ?', [client.rut]);
                    if (exists.length === 0) {
                        await query(`
                            INSERT INTO clients (name, rut, email, phone, address, business_sector, created_at) 
                            VALUES (?, ?, ?, ?, ?, ?, NOW())
                        `, [client.name, client.rut, client.email, client.phone, client.address, client.business_sector]);
                        console.log(`      ✅ Cliente agregado: ${client.name}`);
                    }
                } catch (error) {
                    console.log(`      ⚠️  Error agregando ${client.name}: ${error.message}`);
                }
            }
        }

        // 3. VERIFICAR Y COMPLETAR UBICACIONES
        console.log('\n🏢 PASO 3: VERIFICANDO Y COMPLETANDO UBICACIONES');
        
        const clients = await query('SELECT id, name FROM clients ORDER BY id');
        console.log(`   📊 Clientes disponibles: ${clients.length}`);
        
        // Crear ubicaciones para cada cliente
        const locationsToAdd = [
            { client_id: null, name: 'Sede Principal', address: 'Av. Providencia 2594, Providencia' },
            { client_id: null, name: 'Sucursal Las Condes', address: 'Av. El Bosque Norte 500, Las Condes' },
            { client_id: null, name: 'Centro Vitacura', address: 'Av. Vitacura 9876, Vitacura' },
            { client_id: null, name: 'Anexo Lo Barnechea', address: 'Av. Lo Barnechea 246, Lo Barnechea' }
        ];
        
        for (const client of clients) {
            console.log(`   🏢 Procesando ubicaciones para: ${client.name}`);
            
            // Verificar ubicaciones existentes para este cliente
            const existingLocations = await query('SELECT COUNT(*) as count FROM locations WHERE client_id = ?', [client.id]);
            
            if (existingLocations[0].count < 2) {
                // Agregar ubicaciones faltantes
                const locationsNeeded = 2 - existingLocations[0].count;
                
                for (let i = 0; i < locationsNeeded && i < locationsToAdd.length; i++) {
                    const location = locationsToAdd[i];
                    try {
                        await query(`
                            INSERT INTO locations (client_id, name, address, created_at) 
                            VALUES (?, ?, ?, NOW())
                        `, [client.id, `${client.name} - ${location.name}`, location.address]);
                        console.log(`      ✅ Ubicación agregada: ${location.name}`);
                    } catch (error) {
                        console.log(`      ⚠️  Error agregando ubicación: ${error.message}`);
                    }
                }
            }
        }

        // 4. VERIFICAR Y COMPLETAR EQUIPOS
        console.log('\n🏋️ PASO 4: VERIFICANDO Y COMPLETANDO EQUIPOS');
        
        const locations = await query('SELECT id, name FROM locations ORDER BY id');
        const models = await query('SELECT id, name, brand FROM equipmentmodels ORDER BY id');
        
        console.log(`   📊 Ubicaciones disponibles: ${locations.length}`);
        console.log(`   📊 Modelos disponibles: ${models.length}`);
        
        // Verificar equipos actuales
        const currentEquipment = await query('SELECT COUNT(*) as count FROM equipment');
        console.log(`   📊 Equipos actuales: ${currentEquipment[0].count}`);
        
        if (currentEquipment[0].count < 60) {
            console.log('   ➕ Agregando equipos faltantes...');
            
            let equipmentCounter = currentEquipment[0].count + 1;
            
            for (const location of locations) {
                // Agregar 3-5 equipos por ubicación
                const equipmentCount = Math.floor(Math.random() * 3) + 3; // 3-5 equipos
                
                for (let i = 0; i < equipmentCount && equipmentCounter <= 100; i++) {
                    const randomModel = models[Math.floor(Math.random() * models.length)];
                    const customId = `EQ-${String(equipmentCounter).padStart(3, '0')}`;
                    const serialNumber = `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    
                    // Fechas realistas
                    const acquisitionDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
                    const maintenanceDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
                    
                    try {
                        await query(`
                            INSERT INTO equipment (
                                name, location_id, model_id, custom_id, serial_number, 
                                acquisition_date, last_maintenance_date, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                        `, [
                            `${randomModel.brand} ${randomModel.name}`,
                            location.id,
                            randomModel.id,
                            customId,
                            serialNumber,
                            acquisitionDate.toISOString().split('T')[0],
                            maintenanceDate.toISOString().split('T')[0]
                        ]);
                        
                        equipmentCounter++;
                        
                        if (equipmentCounter % 10 === 0) {
                            console.log(`      📊 Equipos creados: ${equipmentCounter - currentEquipment[0].count}`);
                        }
                        
                    } catch (error) {
                        console.log(`      ⚠️  Error creando equipo: ${error.message}`);
                    }
                }
            }
            
            console.log(`   ✅ Total de equipos agregados: ${equipmentCounter - currentEquipment[0].count - 1}`);
        }

        // 5. AGREGAR FOTOS A MODELOS
        console.log('\n📸 PASO 5: AGREGANDO FOTOS A MODELOS');
        
        const modelsWithoutPhotos = await query(`
            SELECT m.id, m.name, m.brand 
            FROM equipmentmodels m 
            LEFT JOIN modelphotos mp ON m.id = mp.model_id 
            WHERE mp.id IS NULL 
            LIMIT 10
        `);
        
        console.log(`   📊 Modelos sin fotos: ${modelsWithoutPhotos.length}`);
        
        for (const model of modelsWithoutPhotos) {
            try {
                // Crear una foto de placeholder para cada modelo
                const photoData = `data:image/svg+xml;base64,${Buffer.from(`
                    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#f3f4f6"/>
                        <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#6b7280" text-anchor="middle" dy=".3em">
                            ${model.brand} ${model.name}
                        </text>
                    </svg>
                `).toString('base64')}`;
                
                await query(`
                    INSERT INTO modelphotos (model_id, photo_data, filename, is_main, created_at) 
                    VALUES (?, ?, ?, 1, NOW())
                `, [model.id, photoData, `${model.brand}-${model.name}.svg`]);
                
                console.log(`      📸 Foto agregada para: ${model.brand} ${model.name}`);
            } catch (error) {
                console.log(`      ⚠️  Error agregando foto: ${error.message}`);
            }
        }

        // 6. VERIFICAR USUARIOS Y ROLES
        console.log('\n👤 PASO 6: VERIFICANDO USUARIOS Y ROLES');
        
        const roles = await query('SELECT COUNT(*) as count FROM roles');
        if (roles[0].count === 0) {
            console.log('   ➕ Creando roles básicos...');
            await query(`INSERT INTO roles (name, description) VALUES 
                ('admin', 'Administrador del sistema'),
                ('technician', 'Técnico de mantenimiento'),
                ('client', 'Cliente del sistema')`);
        }
        
        const users = await query('SELECT COUNT(*) as count FROM users');
        if (users[0].count < 3) {
            console.log('   ➕ Creando usuarios básicos...');
            const adminRole = await query('SELECT id FROM roles WHERE name = "admin"');
            const techRole = await query('SELECT id FROM roles WHERE name = "technician"');
            
            if (adminRole.length > 0) {
                await query(`
                    INSERT INTO users (name, email, password, role_id, created_at) 
                    VALUES ('Administrador', 'admin@gymtec.cl', 'admin123', ?, NOW())
                `, [adminRole[0].id]);
            }
            
            if (techRole.length > 0) {
                await query(`
                    INSERT INTO users (name, email, password, role_id, created_at) 
                    VALUES ('Técnico Principal', 'tecnico@gymtec.cl', 'tech123', ?, NOW())
                `, [techRole[0].id]);
            }
        }

        // 7. RESUMEN FINAL
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN FINAL DESPUÉS DE LIMPIEZA Y POBLACIÓN:');
        
        const finalCounts = await query(`
            SELECT 
                (SELECT COUNT(*) FROM clients) as clients,
                (SELECT COUNT(*) FROM locations) as locations,
                (SELECT COUNT(*) FROM equipment) as equipment,
                (SELECT COUNT(*) FROM equipmentmodels) as models,
                (SELECT COUNT(*) FROM tickets) as tickets,
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM roles) as roles,
                (SELECT COUNT(*) FROM modelphotos) as model_photos,
                (SELECT COUNT(*) FROM spareparts) as spareparts,
                (SELECT COUNT(*) FROM equipmentnotes) as notes
        `);
        
        const counts = finalCounts[0];
        console.log(`   👥 Clientes: ${counts.clients}`);
        console.log(`   🏢 Ubicaciones: ${counts.locations}`);
        console.log(`   🏋️ Equipos: ${counts.equipment}`);
        console.log(`   🏭 Modelos: ${counts.models}`);
        console.log(`   🎫 Tickets: ${counts.tickets}`);
        console.log(`   👤 Usuarios: ${counts.users}`);
        console.log(`   🔑 Roles: ${counts.roles}`);
        console.log(`   📸 Fotos de modelos: ${counts.model_photos}`);
        console.log(`   🔧 Repuestos: ${counts.spareparts}`);
        console.log(`   📝 Notas: ${counts.notes}`);
        
        console.log('\n🎉 ¡LIMPIEZA Y POBLACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('✅ Base de datos organizada y con datos coherentes');

    } catch (error) {
        console.error('❌ Error durante limpieza y población:', error.message);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

cleanAndPopulate(); 