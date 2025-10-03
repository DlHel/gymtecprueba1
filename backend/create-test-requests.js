/**
 * Script para crear solicitud de prueba
 * Para probar el sistema de aprobación
 */

const db = require('./src/db-adapter');

async function createTestRequest() {
    try {
        console.log('🧪 Creando solicitud de prueba...\n');
        
        // Crear una solicitud para un item con stock
        await query(`
            INSERT INTO spare_part_requests (
                ticket_id,
                spare_part_name,
                quantity_needed,
                priority,
                description,
                requested_by,
                status,
                created_at,
                updated_at
            ) VALUES 
            (20, 'Correa de transmisión', 2, 'alta', 
             'Se requiere para mantenimiento preventivo', 
             'admin', 'pendiente', NOW(), NOW()),
            (20, 'Cable de acero', 1, 'media', 
             'Repuesto agotado - se generará orden de compra', 
             'admin', 'pendiente', NOW(), NOW())
        `);
        
        console.log('✅ Solicitudes de prueba creadas:\n');
        console.log('1. Correa de transmisión (CON STOCK)');
        console.log('   → Al aprobar: descuenta stock automáticamente\n');
        console.log('2. Cable de acero (SIN STOCK)');
        console.log('   → Al aprobar: crea orden de compra\n');
        
        const requests = await query(
            'SELECT * FROM spare_part_requests WHERE status = "pendiente" ORDER BY id DESC LIMIT 2'
        );
        
        console.log('📋 Solicitudes pendientes:');
        console.table(requests);
        
        console.log('\n🎯 Ahora puedes:');
        console.log('1. Ir a Inventario → Movimientos');
        console.log('2. Ver las solicitudes pendientes (fondo amarillo)');
        console.log('3. Hacer clic en "Aprobar Solicitud"');
        console.log('4. Ver la acción automática (stock o orden)');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        } else {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        }
    });
}

createTestRequest();
