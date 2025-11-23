const db = require('./src/db-adapter');
require('dotenv').config({ path: '../config.env' });

async function checkSchema() {
    try {
        await db.initialize();
        
        const tables = ['Attendance', 'Expenses'];
        
        for (const table of tables) {
            console.log(`\n📋 Esquema de tabla: ${table}`);
            try {
                // En MySQL, DESCRIBE table muestra las columnas
                const columns = await db.allAsync(`DESCRIBE ${table}`);
                columns.forEach(col => {
                    console.log(`   - ${col.Field} (${col.Type})`);
                });
            } catch (err) {
                console.log(`   ❌ Error describiendo tabla ${table}: ${err.message}`);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
