const http = require('http');

console.log('🎫 PROBANDO API DE TICKETS');
console.log('==========================\n');

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function testTicketsAPI() {
    try {
        console.log('📡 Probando API de tickets...');
        
        const result = await makeRequest('/api/tickets');
        
        console.log(`📊 Status: ${result.status}`);
        
        if (result.status === 200) {
            const tickets = result.data.data || result.data;
            
            if (Array.isArray(tickets)) {
                console.log(`✅ Encontrados ${tickets.length} tickets`);
                
                if (tickets.length > 0) {
                    console.log('\n📋 Primeros 3 tickets:');
                    tickets.slice(0, 3).forEach((ticket, index) => {
                        console.log(`\n${index + 1}. Ticket ID ${ticket.id}:`);
                        console.log(`   Título: ${ticket.title || 'Sin título'}`);
                        console.log(`   Estado: ${ticket.status || 'Sin estado'}`);
                        console.log(`   Prioridad: ${ticket.priority || 'Sin prioridad'}`);
                        console.log(`   Creado: ${ticket.created_at || 'Sin fecha'}`);
                    });
                    
                    // Mostrar distribución por estado
                    const statusCount = {};
                    tickets.forEach(ticket => {
                        const status = ticket.status || 'Sin estado';
                        statusCount[status] = (statusCount[status] || 0) + 1;
                    });
                    
                    console.log('\n📊 Distribución por estado:');
                    Object.entries(statusCount).forEach(([status, count]) => {
                        console.log(`   ${status}: ${count} tickets`);
                    });
                    
                } else {
                    console.log('⚠️  No hay tickets en la respuesta');
                }
            } else {
                console.log('❌ La respuesta no es un array:', typeof tickets);
                console.log('Datos:', JSON.stringify(tickets, null, 2).substring(0, 500));
            }
        } else {
            console.log('❌ Error en API:', result.status);
            console.log('Respuesta:', result.data);
        }
        
    } catch (error) {
        console.log('❌ Error conectando a API:', error.message);
    }
    
    console.log('\n' + '='.repeat(40));
    console.log('✅ Prueba de API completada');
}

// Esperar un poco para que el servidor esté listo
setTimeout(() => {
    testTicketsAPI();
}, 2000); 