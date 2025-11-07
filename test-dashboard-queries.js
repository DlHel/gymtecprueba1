// Test Dashboard Queries
const db = require('./backend/src/db-adapter');

console.log('🔍 Probando consultas del dashboard...\n');

async function testQueries() {
    try {
        // Test 1: Total Clients
        console.log('1️⃣ Probando: Total de clientes...');
        const clients = await new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Clients', [], (err, rows) => {
                if (err) {
                    console.log('   ❌ Error:', err.message);
                    reject(err);
                } else {
                    console.log('   ✅ Resultado:', rows[0].total);
                    resolve(rows[0].total);
                }
            });
        });

        // Test 2: Total Equipment
        console.log('\n2️⃣ Probando: Total de equipos...');
        const equipment = await new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as total FROM Equipment', [], (err, rows) => {
                if (err) {
                    console.log('   ❌ Error:', err.message);
                    reject(err);
                } else {
                    console.log('   ✅ Resultado:', rows[0].total);
                    resolve(rows[0].total);
                }
            });
        });

        // Test 3: Active Tickets
        console.log('\n3️⃣ Probando: Tickets activos...');
        const tickets = await new Promise((resolve, reject) => {
            db.all(`SELECT COUNT(*) as total FROM Tickets WHERE status NOT IN ('Cerrado', 'Completado')`, [], (err, rows) => {
                if (err) {
                    console.log('   ❌ Error:', err.message);
                    reject(err);
                } else {
                    console.log('   ✅ Resultado:', rows[0].total);
                    resolve(rows[0].total);
                }
            });
        });

        // Test 4: SpareParts (posible problema)
        console.log('\n4️⃣ Probando: Repuestos con stock bajo...');
        try {
            const spareParts = await new Promise((resolve, reject) => {
                db.all(`SELECT COUNT(*) as total FROM SpareParts WHERE current_stock <= minimum_stock`, [], (err, rows) => {
                    if (err) {
                        console.log('   ❌ Error:', err.message);
                        reject(err);
                    } else {
                        console.log('   ✅ Resultado:', rows[0].total);
                        resolve(rows[0].total);
                    }
                });
            });
        } catch (e) {
            console.log('   ⚠️ Tabla SpareParts no existe o tiene otro nombre');
        }

        // Test 5: Contracts
        console.log('\n5️⃣ Probando: Contratos activos...');
        try {
            const contracts = await new Promise((resolve, reject) => {
                db.all(`SELECT COUNT(*) as total FROM Contracts WHERE status = 'Active' AND end_date >= CURDATE()`, [], (err, rows) => {
                    if (err) {
                        console.log('   ❌ Error:', err.message);
                        reject(err);
                    } else {
                        console.log('   ✅ Resultado:', rows[0].total);
                        resolve(rows[0].total);
                    }
                });
            });
        } catch (e) {
            console.log('   ⚠️ Error en consulta de contratos');
        }

        console.log('\n✅ Pruebas completadas');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error general:', error);
        process.exit(1);
    }
}

testQueries();
