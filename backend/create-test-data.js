const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🧪 CREANDO DATOS DE PRUEBA - GYMTEC ERP\n');

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
});

// Datos de prueba
const testClients = [
    {
        name: 'SportLife Premium',
        rut: '12345678-9',
        email: 'contacto@sportlife.cl',
        phone: '+56912345678',
        address: 'Av. Providencia 2594, Providencia'
    },
    {
        name: 'Gimnasio Iron Fitness',
        rut: '87654321-0',
        email: 'info@ironfitness.cl',
        phone: '+56987654321',
        address: 'Calle San Martín 456, Las Condes'
    },
    {
        name: 'Centro Deportivo Mega',
        rut: '11223344-5',
        email: 'gerencia@mega.cl',
        phone: '+56911223344',
        address: 'Mall Sport 789, Vitacura'
    }
];

const testLocations = [
    {
        name: 'SportLife Providencia',
        address: 'Av. Providencia 2594, Providencia',
        client_id: 1
    },
    {
        name: 'SportLife Las Condes',
        address: 'Av. Apoquindo 4501, Las Condes',
        client_id: 1
    },
    {
        name: 'Iron Fitness Principal',
        address: 'Calle San Martín 456, Las Condes',
        client_id: 2
    },
    {
        name: 'Mega Centro Deportivo',
        address: 'Mall Sport 789, Vitacura',
        client_id: 3
    }
];

async function createTestData() {
    try {
        console.log('📡 Conectando a MySQL...');
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('✅ Conectado a MySQL exitosamente\n');

        // Crear clientes
        console.log('👥 Creando clientes de prueba...');
        const clientIds = [];
        
        for (const client of testClients) {
            const result = await new Promise((resolve, reject) => {
                connection.query('INSERT INTO clients SET ?', client, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            clientIds.push(result.insertId);
            console.log(`   ✅ Cliente: ${client.name} (ID: ${result.insertId})`);
        }

        // Crear ubicaciones/sedes
        console.log('\n🏢 Creando ubicaciones de prueba...');
        const locationIds = [];
        
        for (const location of testLocations) {
            const result = await new Promise((resolve, reject) => {
                connection.query('INSERT INTO locations SET ?', location, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            locationIds.push(result.insertId);
            console.log(`   ✅ Ubicación: ${location.name} (ID: ${result.insertId})`);
        }

        // Obtener algunos modelos para crear equipos
        const models = await new Promise((resolve, reject) => {
            connection.query('SELECT id, name FROM equipmentmodels LIMIT 5', (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        // Crear equipos de prueba
        console.log('\n📦 Creando equipos de prueba...');
        const testEquipment = [
            {
                serial_number: 'LF-TM-001-2024',
                model_id: models[0]?.id || 1,
                client_id: clientIds[0],
                location_id: locationIds[0],
                installation_date: '2024-01-15',
                status: 'active'
            },
            {
                serial_number: 'TG-RUN-002-2024',
                model_id: models[1]?.id || 2,
                client_id: clientIds[0],
                location_id: locationIds[1],
                installation_date: '2024-02-10',
                status: 'active'
            },
            {
                serial_number: 'MX-ELL-003-2024',
                model_id: models[2]?.id || 3,
                client_id: clientIds[1],
                location_id: locationIds[2],
                installation_date: '2024-03-05',
                status: 'maintenance'
            },
            {
                serial_number: 'PC-BK-004-2024',
                model_id: models[3]?.id || 4,
                client_id: clientIds[2],
                location_id: locationIds[3],
                installation_date: '2024-01-20',
                status: 'active'
            }
        ];

        const equipmentIds = [];
        for (const equipment of testEquipment) {
            const result = await new Promise((resolve, reject) => {
                connection.query('INSERT INTO equipment SET ?', equipment, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            equipmentIds.push(result.insertId);
            console.log(`   ✅ Equipo: ${equipment.serial_number} (ID: ${result.insertId})`);
        }

        // Crear tickets de prueba
        console.log('\n🎫 Creando tickets de prueba...');
        const testTickets = [
            {
                title: 'Cinta de correr hace ruido extraño',
                description: 'La cinta hace un ruido metálico al usar velocidades altas. Se solicita revisión técnica.',
                status: 'open',
                priority: 'high',
                client_id: clientIds[0],
                equipment_id: equipmentIds[0],
                created_at: new Date()
            },
            {
                title: 'Pantalla de bicicleta no enciende',
                description: 'La consola digital de la bicicleta estática no enciende. Sin energía.',
                status: 'in_progress',
                priority: 'medium',
                client_id: clientIds[1],
                equipment_id: equipmentIds[2],
                created_at: new Date()
            },
            {
                title: 'Mantenimiento preventivo elíptica',
                description: 'Mantenimiento preventivo programado para la elíptica Matrix.',
                status: 'closed',
                priority: 'low',
                client_id: clientIds[0],
                equipment_id: equipmentIds[1],
                created_at: new Date()
            }
        ];

        for (const ticket of testTickets) {
            const result = await new Promise((resolve, reject) => {
                connection.query('INSERT INTO tickets SET ?', ticket, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            console.log(`   ✅ Ticket: ${ticket.title} (ID: ${result.insertId})`);
        }

        console.log('\n📊 RESUMEN DE DATOS CREADOS:');
        console.log(`   👥 Clientes: ${clientIds.length}`);
        console.log(`   🏢 Ubicaciones: ${locationIds.length}`);
        console.log(`   📦 Equipos: ${equipmentIds.length}`);
        console.log(`   🎫 Tickets: ${testTickets.length}`);
        console.log(`   🏭 Modelos: ${models.length} (verificados)`);

        console.log('\n🎉 Datos de prueba creados exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.end();
        console.log('\n🔐 Conexión con MySQL cerrada.');
    }
}

// Ejecutar
createTestData(); 