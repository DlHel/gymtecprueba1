const db = require('./src/db-adapter');
require('dotenv').config({ path: '../config.env' });

async function checkExpenses() {
    try {
        await db.initialize();
        
        console.log('🔍 Verificando datos de gastos (Expenses)...');
        
        // Total de gastos
        const total = await db.getAsync('SELECT COUNT(*) as count FROM Expenses');
        console.log(`Total registros: ${total.count}`);
        
        // Rango de fechas
        const dates = await db.getAsync('SELECT MIN(date) as min, MAX(date) as max FROM Expenses');
        console.log(`Rango de fechas: ${dates.min} a ${dates.max}`);
        
        // Gastos este mes (Noviembre 2025)
        const thisMonth = await db.getAsync(`
            SELECT COUNT(*) as count, SUM(amount) as total 
            FROM Expenses 
            WHERE date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        `);
        console.log(`Gastos este mes (desde 1ro): ${thisMonth.count} registros, Total: ${thisMonth.total}`);
        
        // Gastos pendientes
        const pending = await db.getAsync(`
            SELECT COUNT(*) as count 
            FROM Expenses 
            WHERE status = 'Pendiente'
        `);
        console.log(`Gastos pendientes (status='Pendiente'): ${pending.count}`);
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkExpenses();
