const mysql = require('mysql2');
require('dotenv').config({ path: './config.env' });

console.log('🧪 VERIFICACIÓN COMPLETA DE MYSQL - GYMTEC ERP\n');

// Configuración de conexión
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymtec_erp'
};

console.log(`📡 Conectando a MySQL: ${config.user}@${config.host}:${config.port}/${config.database}\n`);

const connection = mysql.createConnection(config);

// Tests a ejecutar
const tests = [
    {
        name: '🔗 Conexión a Base de Datos',
        test: () => new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve('Conexión exitosa');
            });
        })
    },
    {
        name: '📊 Verificar Tablas Creadas',
        test: () => new Promise((resolve, reject) => {
            connection.query('SHOW TABLES', (err, results) => {
                if (err) reject(err);
                else {
                    const tables = results.map(row => Object.values(row)[0]);
                    resolve(`${tables.length} tablas encontradas: ${tables.join(', ')}`);
                }
            });
        })
    },
    {
        name: '👥 Contar Clientes',
        test: () => new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM clients', (err, results) => {
                if (err) reject(err);
                else resolve(`${results[0].count} clientes en base de datos`);
            });
        })
    },
    {
        name: '🏢 Contar Ubicaciones/Sedes',
        test: () => new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM locations', (err, results) => {
                if (err) reject(err);
                else resolve(`${results[0].count} ubicaciones en base de datos`);
            });
        })
    },
    {
        name: '🏭 Contar Modelos de Equipos',
        test: () => new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM equipmentmodels', (err, results) => {
                if (err) reject(err);
                else resolve(`${results[0].count} modelos de equipos en base de datos`);
            });
        })
    },
    {
        name: '📦 Contar Equipos',
        test: () => new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM equipment', (err, results) => {
                if (err) reject(err);
                else resolve(`${results[0].count} equipos en base de datos`);
            });
        })
    },
    {
        name: '🎫 Contar Tickets',
        test: () => new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as count FROM tickets', (err, results) => {
                if (err) reject(err);
                else resolve(`${results[0].count} tickets en base de datos`);
            });
        })
    },
    {
        name: '📸 Verificar Fotos de Modelos',
        test: () => new Promise((resolve, reject) => {
            connection.query('SELECT COUNT(*) as total, SUM(CASE WHEN photo_data IS NOT NULL THEN 1 ELSE 0 END) as with_photos FROM modelphotos', (err, results) => {
                if (err) reject(err);
                else {
                    const total = results[0].total;
                    const withPhotos = results[0].with_photos;
                    resolve(`${withPhotos}/${total} modelos tienen fotos almacenadas`);
                }
            });
        })
    },
    {
        name: '🏷️ Verificar Marcas de Equipos',
        test: () => new Promise((resolve, reject) => {
            connection.query('SELECT DISTINCT brand FROM equipmentmodels ORDER BY brand', (err, results) => {
                if (err) reject(err);
                else {
                    const brands = results.map(row => row.brand);
                    resolve(`${brands.length} marcas encontradas: ${brands.join(', ')}`);
                }
            });
        })
    },
    {
        name: '📋 Verificar Categorías de Equipos',
        test: () => new Promise((resolve, reject) => {
            connection.query('SELECT DISTINCT category FROM equipmentmodels ORDER BY category', (err, results) => {
                if (err) reject(err);
                else {
                    const categories = results.map(row => row.category);
                    resolve(`${categories.length} categorías encontradas: ${categories.join(', ')}`);
                }
            });
        })
    },
    {
        name: '🔍 Insertar Registro de Prueba (Cliente)',
        test: () => new Promise((resolve, reject) => {
            const testClient = {
                name: 'Cliente Prueba MySQL - ' + new Date().toISOString(),
                rut: 'TEST-' + Date.now(),
                email: `test${Date.now()}@mysql.test`,
                phone: '+56987654321',
                address: 'Dirección de Prueba MySQL, Santiago'
            };

            connection.query('INSERT INTO clients SET ?', testClient, (err, result) => {
                if (err) reject(err);
                else resolve(`Cliente de prueba creado con ID: ${result.insertId}`);
            });
        })
    },
    {
        name: '🔄 Verificar Relaciones (JOIN)',
        test: () => new Promise((resolve, reject) => {
            const query = `
                SELECT e.id, e.serial_number, c.name as client_name, l.name as location_name, m.name as model_name
                FROM equipment e
                LEFT JOIN clients c ON e.client_id = c.id
                LEFT JOIN locations l ON e.location_id = l.id
                LEFT JOIN equipmentmodels m ON e.model_id = m.id
                LIMIT 5
            `;
            
            connection.query(query, (err, results) => {
                if (err) reject(err);
                else resolve(`${results.length} equipos con relaciones verificadas correctamente`);
            });
        })
    }
];

// Ejecutar todos los tests
async function runAllTests() {
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`🔍 ${test.name}...`);
            const result = await test.test();
            console.log(`   ✅ ${result}\n`);
            passed++;
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`);
            failed++;
        }
    }

    console.log('='.repeat(60));
    console.log(`📊 RESUMEN DE PRUEBAS:`);
    console.log(`   ✅ Exitosas: ${passed}`);
    console.log(`   ❌ Fallidas: ${failed}`);
    console.log(`   📈 Total: ${tests.length}`);
    
    if (failed === 0) {
        console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! MySQL está funcionando perfectamente.');
    } else {
        console.log(`\n⚠️  ${failed} pruebas fallaron. Revisa la configuración.`);
    }

    connection.end();
}

// Manejar errores de conexión
connection.on('error', (err) => {
    console.error('❌ Error de conexión MySQL:', err.message);
    process.exit(1);
});

// Ejecutar pruebas
runAllTests().catch(console.error); 