const db = require('./src/mysql-database.js');

async function fixRequestStatus() {
    try {
        console.log('🔧 Actualizando estado de solicitudes aprobadas...');
        
        // Actualizar solicitudes que fueron aprobadas pero tienen status incorrecto
        const result = await db.query(`
            UPDATE SparePartRequests 
            SET status = 'aprobada' 
            WHERE approved_by IS NOT NULL 
            AND approved_at IS NOT NULL
        `);
        
        console.log(`✅ Actualizados: ${result.affectedRows} registros`);
        
        // Verificar estado actual del ticket 71
        const updated = await db.query(`
            SELECT id, spare_part_name, status, approved_by, approved_at 
            FROM SparePartRequests 
            WHERE ticket_id = 71 
            ORDER BY created_at DESC
        `);
        
        console.log('📋 Estado actual del ticket 71:');
        updated.forEach(req => {
            console.log(`  - ${req.spare_part_name}: ${req.status} (Aprobado por: ${req.approved_by})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

fixRequestStatus();
