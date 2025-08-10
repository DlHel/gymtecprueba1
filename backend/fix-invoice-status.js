const db = require('./src/mysql-database.js');

async function fixInvoiceStatus() {
    try {
        console.log('🔧 Verificando estados de facturas...');
        
        // Verificar facturas con estado vacío o inválido
        const emptyStatus = await db.query(`
            SELECT id, title, status 
            FROM Invoices 
            WHERE status IS NULL OR status = ''
        `);
        
        console.log(`📋 Facturas con estado vacío: ${emptyStatus.length}`);
        
        if (emptyStatus.length > 0) {
            // Actualizar facturas con estado vacío
            const result = await db.query(`
                UPDATE Invoices 
                SET status = 'Pendiente' 
                WHERE status IS NULL OR status = ''
            `);
            
            console.log(`✅ Estados actualizados: ${result.affectedRows} facturas`);
        }
        
        // Mostrar el estado actual de todas las facturas
        const allInvoices = await db.query(`
            SELECT id, title, status 
            FROM Invoices 
            ORDER BY id
        `);
        
        console.log('📋 Estado actual de facturas:');
        allInvoices.forEach(invoice => {
            console.log(`  - #${invoice.id}: ${invoice.title} - ${invoice.status || 'SIN ESTADO'}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

fixInvoiceStatus();
