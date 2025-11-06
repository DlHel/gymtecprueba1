const mysql = require('mysql2');

// Configuración de base de datos
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gymtec_erp',
    port: 3306
};

async function testTicketsListing() {
    console.log('🔍 VERIFICANDO LISTADO DE TICKETS...\n');
    
    const connection = mysql.createConnection(dbConfig);
    
    try {
        // Verificar todos los tickets en la base de datos
        console.log('1. Consultando TODOS los tickets en la base de datos:');
        const query = `
            SELECT 
                id,
                title,
                description,
                status,
                priority,
                ticket_type,
                created_at,
                equipment_id,
                location_id,
                client_id
            FROM Tickets 
            ORDER BY created_at DESC 
            LIMIT 10
        `;
        
        connection.query(query, (err, results) => {
            if (err) {
                console.error('❌ Error en consulta:', err);
                return;
            }
            
            console.log(`📊 Tickets encontrados: ${results.length}`);
            
            if (results.length === 0) {
                console.log('⚠️  No hay tickets en la base de datos');
            } else {
                console.log('\n📋 LISTADO DE TICKETS:');
                console.log('=' .repeat(80));
                
                results.forEach((ticket, index) => {
                    console.log(`\n${index + 1}. ID: ${ticket.id}`);
                    console.log(`   Título: ${ticket.title}`);
                    console.log(`   Estado: ${ticket.status}`);
                    console.log(`   Prioridad: ${ticket.priority}`);
                    console.log(`   Tipo: ${ticket.ticket_type || 'NULL'}`);
                    console.log(`   Creado: ${ticket.created_at}`);
                    console.log(`   Equipment ID: ${ticket.equipment_id || 'NULL'}`);
                    console.log(`   Location ID: ${ticket.location_id || 'NULL'}`);
                    console.log(`   Client ID: ${ticket.client_id || 'NULL'}`);
                });
            }
            
            // Verificar tickets por tipo
            console.log('\n\n2. Consultando tickets por tipo:');
            
            const typeQuery = `
                SELECT 
                    ticket_type,
                    COUNT(*) as count
                FROM Tickets 
                GROUP BY ticket_type
                ORDER BY count DESC
            `;
            
            connection.query(typeQuery, (err, typeResults) => {
                if (err) {
                    console.error('❌ Error en consulta por tipo:', err);
                    return;
                }
                
                console.log('\n📊 TICKETS POR TIPO:');
                console.log('=' .repeat(40));
                
                if (typeResults.length === 0) {
                    console.log('⚠️  No hay datos de tipos de ticket');
                } else {
                    typeResults.forEach(row => {
                        console.log(`   ${row.ticket_type || 'NULL'}: ${row.count} tickets`);
                    });
                }
                
                // Verificar el último ticket creado
                console.log('\n\n3. Último ticket creado:');
                
                const lastQuery = `
                    SELECT 
                        id,
                        title,
                        status,
                        ticket_type,
                        created_at
                    FROM Tickets 
                    ORDER BY created_at DESC 
                    LIMIT 1
                `;
                
                connection.query(lastQuery, (err, lastResult) => {
                    if (err) {
                        console.error('❌ Error consultando último ticket:', err);
                    } else if (lastResult.length > 0) {
                        const last = lastResult[0];
                        console.log(`\n🎫 ÚLTIMO TICKET:`);
                        console.log(`   ID: ${last.id}`);
                        console.log(`   Título: ${last.title}`);
                        console.log(`   Estado: ${last.status}`);
                        console.log(`   Tipo: ${last.ticket_type || 'NULL'}`);
                        console.log(`   Creado: ${last.created_at}`);
                        
                        // Calcular hace cuánto se creó
                        const now = new Date();
                        const created = new Date(last.created_at);
                        const diffMs = now - created;
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        console.log(`   Hace: ${diffMins} minutos`);
                    } else {
                        console.log('⚠️  No hay tickets en la base de datos');
                    }
                    
                    connection.end();
                    console.log('\n✅ Verificación completa');
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Error general:', error);
        connection.end();
    }
}

testTicketsListing();