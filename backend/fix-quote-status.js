const db = require('./src/mysql-database.js');

async function fixQuoteStatus() {
    try {
        console.log('🔧 Actualizando estado de cotizaciones...');
        
        // Actualizar cotizaciones con estado vacío
        const result = await db.query(`
            UPDATE Quotes 
            SET status = 'Borrador' 
            WHERE (status IS NULL OR status = '') 
            AND id = 9
        `);
        
        console.log(`✅ Estados actualizados: ${result.affectedRows} cotizaciones`);
        
        // Verificar el estado actual
        const quotes = await db.query(`
            SELECT id, title, status 
            FROM Quotes 
            WHERE id = 9
        `);
        
        console.log('📋 Estado actual de la cotización 9:');
        quotes.forEach(quote => {
            console.log(`  - ${quote.title}: ${quote.status}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

fixQuoteStatus();
