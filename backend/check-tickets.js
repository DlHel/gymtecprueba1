/**
 * Script para verificar tickets existentes en la base de datos
 */

const db = require('./src/db-adapter');

async function checkTickets() {
    try {
        console.log('🔍 Verificando tickets en la base de datos...');
        
        // Obtener todos los tickets
        db.all('SELECT id, title, status, created_at FROM Tickets ORDER BY id', [], (err, rows) => {
            if (err) {
                console.error('❌ Error obteniendo tickets:', err.message);
                return;
            }
            
            if (!rows || rows.length === 0) {
                console.log('⚠️ No hay tickets en la base de datos');
                console.log('💡 Creando ticket de prueba...');
                
                // Crear un ticket de prueba
                const sql = `
                    INSERT INTO Tickets (title, description, priority, status, created_at)
                    VALUES (?, ?, ?, ?, NOW())
                `;
                
                db.run(sql, [
                    'Ticket de Prueba',
                    'Este es un ticket de prueba para debugging',
                    'medium',
                    'open'
                ], function(err) {
                    if (err) {
                        console.error('❌ Error creando ticket:', err.message);
                    } else {
                        console.log('✅ Ticket de prueba creado con ID:', this.lastID || 1);
                    }
                });
            } else {
                console.log(`✅ Encontrados ${rows.length} tickets:`);
                rows.forEach(ticket => {
                    console.log(`  ID: ${ticket.id} | ${ticket.title} | ${ticket.status} | ${ticket.created_at}`);
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkTickets();
