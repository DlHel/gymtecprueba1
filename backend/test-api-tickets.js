const http = require('http');

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    json: () => Promise.resolve(JSON.parse(data)),
                    text: () => Promise.resolve(data)
                });
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function testAPI() {
    console.log('🔍 PROBANDO ENDPOINTS DE TICKETS API...\n');
    
    try {
        // 1. Test del endpoint principal de tickets
        console.log('1. Probando GET /api/tickets:');
        
        const response = await makeRequest('http://localhost:3000/api/tickets');
        
        if (!response.ok) {
            console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Tickets devueltos: ${data.data ? data.data.length : 0}`);
        
        if (data.data && data.data.length > 0) {
            console.log('\n📋 PRIMEROS 3 TICKETS DEL API:');
            console.log('=' .repeat(60));
            
            data.data.slice(0, 3).forEach((ticket, index) => {
                console.log(`\n${index + 1}. ID: ${ticket.id}`);
                console.log(`   Título: ${ticket.title}`);
                console.log(`   Estado: ${ticket.status}`);
                console.log(`   Prioridad: ${ticket.priority}`);
                console.log(`   Tipo: ${ticket.ticket_type || 'UNDEFINED'}`);
                console.log(`   Cliente: ${ticket.client_name || 'N/A'}`);
                console.log(`   Sede: ${ticket.location_name || 'N/A'}`);
                console.log(`   Equipo: ${ticket.equipment_name || 'N/A'}`);
                console.log(`   Creado: ${ticket.created_at}`);
            });
        } else {
            console.log('⚠️  El API no devolvió tickets');
        }
        
        // 2. Test de creación de ticket
        console.log('\n\n2. Probando POST /api/tickets (crear ticket):');
        
        const testTicket = {
            title: 'Ticket de Prueba API Test',
            description: 'Este es un ticket de prueba para verificar la creación',
            priority: 'Media',
            equipment_id: 1,
            location_id: 1,
            client_id: 1,
            assigned_to: 1,
            ticket_type: 'individual'
        };
        
        const createResponse = await makeRequest('http://localhost:3000/api/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        createResponse.body = JSON.stringify(testTicket);
        
        if (createResponse.ok) {
            const createData = await createResponse.json();
            console.log(`✅ Ticket creado con ID: ${createData.data?.id || 'unknown'}`);
            console.log(`📝 Respuesta:`, createData);
        } else {
            const errorData = await createResponse.text();
            console.error(`❌ Error creando ticket: ${createResponse.status}`);
            console.error(`📝 Error:`, errorData);
        }
        
        // 3. Verificar el nuevo ticket en la lista
        console.log('\n\n3. Verificando lista actualizada:');
        
        const updatedResponse = await makeRequest('http://localhost:3000/api/tickets');
        if (updatedResponse.ok) {
            const updatedData = await updatedResponse.json();
            console.log(`📊 Tickets totales después de creación: ${updatedData.data ? updatedData.data.length : 0}`);
            
            if (updatedData.data && updatedData.data.length > 0) {
                const newest = updatedData.data[0]; // Debería ser el más reciente
                console.log(`\n🆕 TICKET MÁS RECIENTE:`);
                console.log(`   ID: ${newest.id}`);
                console.log(`   Título: ${newest.title}`);
                console.log(`   Tipo: ${newest.ticket_type || 'UNDEFINED'}`);
                console.log(`   Creado: ${newest.created_at}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error en prueba API:', error.message);
    }
}

testAPI();