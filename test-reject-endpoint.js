const mysql = require('mysql2/promise');

async function testRejectEndpoint() {
    try {
        console.log('🔍 Testing reject endpoint...\n');
        
        // 1. Verificar que existan solicitudes pendientes
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gymtec_erp'
        });
        
        const [requests] = await db.query(`
            SELECT id, spare_part_name, status 
            FROM spare_part_requests 
            WHERE status = 'pendiente'
            LIMIT 3
        `);
        
        console.log(`📋 Solicitudes pendientes encontradas: ${requests.length}\n`);
        requests.forEach(req => {
            console.log(`  - ID: ${req.id}, Item: ${req.spare_part_name}, Status: ${req.status}`);
        });
        
        if (requests.length === 0) {
            console.log('\n⚠️  No hay solicitudes pendientes para probar el rechazo');
            await db.end();
            return;
        }
        
        // 2. Probar el UPDATE directamente
        const testRequestId = requests[0].id;
        const testReason = 'Prueba de rechazo desde script de testing';
        const testUser = 'test-admin';
        
        console.log(`\n🧪 Probando UPDATE en solicitud #${testRequestId}...\n`);
        
        try {
            const [result] = await db.query(`
                UPDATE spare_part_requests 
                SET status = 'rechazada',
                    notes = ?,
                    approved_by = ?,
                    approved_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                `RECHAZADA: ${testReason}`,
                testUser,
                testRequestId
            ]);
            
            console.log('✅ UPDATE ejecutado exitosamente:');
            console.log(`   - Rows affected: ${result.affectedRows}`);
            console.log(`   - Changed rows: ${result.changedRows}`);
            
            // Verificar el cambio
            const [updated] = await db.query(`
                SELECT * FROM spare_part_requests WHERE id = ?
            `, [testRequestId]);
            
            console.log('\n📊 Estado después del UPDATE:');
            console.log(`   - Status: ${updated[0].status}`);
            console.log(`   - Notes: ${updated[0].notes}`);
            console.log(`   - Approved by: ${updated[0].approved_by}`);
            
            // Revertir el cambio para no afectar las pruebas
            console.log('\n🔄 Revirtiendo cambio para mantener datos de prueba...');
            await db.query(`
                UPDATE spare_part_requests 
                SET status = 'pendiente',
                    notes = NULL,
                    approved_by = NULL,
                    approved_at = NULL
                WHERE id = ?
            `, [testRequestId]);
            
            console.log('✅ Cambio revertido exitosamente');
            
        } catch (updateError) {
            console.error('❌ Error en UPDATE:', updateError.message);
            console.error('Stack:', updateError.stack);
        }
        
        await db.end();
        
    } catch (error) {
        console.error('❌ Error general:', error.message);
        console.error('Stack:', error.stack);
    }
}

testRejectEndpoint();
