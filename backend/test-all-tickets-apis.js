const http = require('http');

console.log('🎫 PRUEBA COMPLETA DE TODAS LAS APIs DE TICKETS');
console.log('==============================================\n');

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
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

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testAllTicketAPIs() {
    const tests = [
        {
            name: '📋 GET /api/tickets - Obtener todos los tickets',
            path: '/api/tickets',
            method: 'GET'
        },
        {
            name: '👥 GET /api/clients - Obtener clientes (para tickets)',
            path: '/api/clients',
            method: 'GET'
        },
        {
            name: '🏢 GET /api/locations - Obtener ubicaciones (para tickets)',
            path: '/api/locations',
            method: 'GET'
        },
        {
            name: '🏋️ GET /api/equipment - Obtener equipos (para tickets)',
            path: '/api/equipment',
            method: 'GET'
        },
        {
            name: '🔧 GET /api/models - Obtener modelos (para equipos)',
            path: '/api/models',
            method: 'GET'
        }
    ];

    console.log('🚀 Iniciando pruebas de APIs...\n');

    for (const test of tests) {
        try {
            console.log(`⏳ Probando: ${test.name}`);
            
            const result = await makeRequest(test.path, test.method, test.data);
            
            if (result.status === 200) {
                const data = result.data.data || result.data;
                
                if (Array.isArray(data)) {
                    console.log(`✅ ${test.name}`);
                    console.log(`   Status: ${result.status} OK`);
                    console.log(`   Registros: ${data.length}`);
                    
                    if (data.length > 0) {
                        const firstItem = data[0];
                        console.log(`   Primer elemento ID: ${firstItem.id || 'N/A'}`);
                        if (test.path === '/api/tickets') {
                            console.log(`   Primer ticket: ${firstItem.title || 'Sin título'}`);
                            console.log(`   Estado: ${firstItem.status || 'Sin estado'}`);
                            console.log(`   Cliente: ${firstItem.client_name || 'Sin cliente'}`);
                        } else if (test.path === '/api/clients') {
                            console.log(`   Primer cliente: ${firstItem.name || 'Sin nombre'}`);
                        } else if (test.path === '/api/locations') {
                            console.log(`   Primera ubicación: ${firstItem.name || 'Sin nombre'}`);
                        } else if (test.path === '/api/equipment') {
                            console.log(`   Primer equipo: ${firstItem.name || 'Sin nombre'} (${firstItem.custom_id || 'Sin ID'})`);
                        } else if (test.path === '/api/models') {
                            console.log(`   Primer modelo: ${firstItem.name || 'Sin nombre'}`);
                        }
                    }
                } else {
                    console.log(`⚠️  ${test.name}`);
                    console.log(`   Status: ${result.status} OK`);
                    console.log(`   Formato inesperado: ${typeof data}`);
                }
            } else {
                console.log(`❌ ${test.name}`);
                console.log(`   Status: ${result.status}`);
                console.log(`   Error: ${JSON.stringify(result.data).substring(0, 200)}`);
            }
            
            console.log(''); // Línea en blanco
            
        } catch (error) {
            console.log(`❌ ${test.name}`);
            console.log(`   Error: ${error.message}`);
            console.log(''); // Línea en blanco
        }
    }

    // Prueba específica: Obtener un ticket individual
    console.log('🔍 Prueba adicional: Obtener ticket individual...');
    try {
        const ticketsResult = await makeRequest('/api/tickets');
        if (ticketsResult.status === 200) {
            const tickets = ticketsResult.data.data || ticketsResult.data;
            if (Array.isArray(tickets) && tickets.length > 0) {
                const firstTicketId = tickets[0].id;
                const singleTicketResult = await makeRequest(`/api/tickets/${firstTicketId}`);
                
                if (singleTicketResult.status === 200) {
                    console.log(`✅ GET /api/tickets/${firstTicketId} - Obtener ticket individual`);
                    console.log(`   Status: ${singleTicketResult.status} OK`);
                    const ticketData = singleTicketResult.data.data || singleTicketResult.data;
                    console.log(`   Ticket: ${ticketData.title || 'Sin título'}`);
                } else {
                    console.log(`❌ GET /api/tickets/${firstTicketId} - Error ${singleTicketResult.status}`);
                }
            }
        }
    } catch (error) {
        console.log(`❌ Error en prueba de ticket individual: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Pruebas de APIs completadas');
    
    // Resumen final
    console.log('\n📊 RESUMEN PARA FRONTEND:');
    console.log('========================');
    console.log('URLs disponibles:');
    console.log('- Backend: http://localhost:3000');
    console.log('- Frontend: http://localhost:8080');
    console.log('- Test Tickets: http://localhost:8080/test-tickets.html');
    console.log('- Tickets Principal: http://localhost:8080/tickets.html');
    console.log('- Clientes: http://localhost:8080/clientes.html');
}

// Ejecutar pruebas
setTimeout(() => {
    testAllTicketAPIs();
}, 2000); 