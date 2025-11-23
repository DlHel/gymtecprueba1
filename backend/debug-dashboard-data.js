const db = require('./src/db-adapter');
require('dotenv').config({ path: '../config.env' });

async function checkData() {
    try {
        console.log('🔍 Iniciando diagnóstico de datos para el Dashboard...');
        await db.initialize();

        const tables = [
            'Tickets', 'SpareParts', 'Contracts', 'Users', 'Attendance', 
            'Expenses', 'Invoices', 'Quotes', 'Overtime'
        ];

        for (const table of tables) {
            console.log(`\n📋 Revisando tabla: ${table}`);
            try {
                const count = await db.getAsync(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   Total registros: ${count.count}`);

                if (count.count > 0) {
                    // Mostrar muestra de fechas si aplica
                    let dateColumn = null;
                    if (table === 'Tickets') dateColumn = 'created_at';
                    if (table === 'Contracts') dateColumn = 'end_date';
                    if (table === 'Attendance') dateColumn = 'check_in';
                    if (table === 'Expenses') dateColumn = 'expense_date';
                    if (table === 'Overtime') dateColumn = 'date';

                    if (dateColumn) {
                        const dates = await db.allAsync(`SELECT MIN(${dateColumn}) as min_date, MAX(${dateColumn}) as max_date FROM ${table}`);
                        console.log(`   Rango de fechas (${dateColumn}): ${dates[0].min_date} a ${dates[0].max_date}`);
                        
                        // Verificar registros recientes (últimos 30 días)
                        const recent = await db.getAsync(`
                            SELECT COUNT(*) as count 
                            FROM ${table} 
                            WHERE ${dateColumn} >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                        `);
                        console.log(`   Registros últimos 30 días: ${recent.count}`);
                    }

                    // Chequeos específicos por tabla
                    if (table === 'Tickets') {
                        const critical = await db.getAsync(`SELECT COUNT(*) as count FROM Tickets WHERE priority = 'Crítica' AND status != 'Cerrado'`);
                        console.log(`   Tickets Críticos Activos: ${critical.count}`);
                    }
                    if (table === 'SpareParts') {
                        const lowStock = await db.getAsync(`SELECT COUNT(*) as count FROM SpareParts WHERE current_stock <= minimum_stock`);
                        console.log(`   Items con Stock Bajo: ${lowStock.count}`);
                    }
                }
            } catch (err) {
                console.log(`   ❌ Error leyendo tabla ${table}: ${err.message}`);
            }
        }

        console.log('\n✅ Diagnóstico completado.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

checkData();
