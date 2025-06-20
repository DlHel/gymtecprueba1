const http = require('http');

console.log('🔍 PROBANDO APIs ESPECÍFICAS DEL FRONTEND');
console.log('==========================================\n');

// Función para hacer peticiones HTTP
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

async function testAPIs() {
    console.log('📡 Verificando conexión al servidor...\n');
    
    const tests = [
        { name: 'Clientes', path: '/api/clients' },
        { name: 'Ubicaciones', path: '/api/locations' },
        { name: 'Equipos', path: '/api/equipment' },
        { name: 'Modelos', path: '/api/models' },
        { name: 'Tickets', path: '/api/tickets' }
    ];

    for (const test of tests) {
        try {
            console.log(`🔍 Probando ${test.name}...`);
            const result = await makeRequest(test.path);
            
            if (result.status === 200) {
                const count = Array.isArray(result.data) ? result.data.length : 'No es array';
                console.log(`   ✅ ${test.name}: ${result.status} - ${count} registros`);
                
                // Mostrar algunos datos de ejemplo
                if (Array.isArray(result.data) && result.data.length > 0) {
                    console.log(`   📋 Primer registro:`, JSON.stringify(result.data[0], null, 2).substring(0, 200) + '...');
                }
            } else {
                console.log(`   ❌ ${test.name}: ${result.status} - ${result.data}`);
            }
            
        } catch (error) {
            console.log(`   ❌ ${test.name}: Error - ${error.message}`);
        }
        console.log('');
    }

    // Probar API específica de ubicaciones por cliente
    console.log('🏢 Probando ubicaciones por cliente específico...');
    try {
        const clientResult = await makeRequest('/api/clients');
        if (clientResult.status === 200 && Array.isArray(clientResult.data) && clientResult.data.length > 0) {
            const firstClient = clientResult.data[0];
            console.log(`   📋 Probando con cliente: ${firstClient.name} (ID: ${firstClient.id})`);
            
            const locationsResult = await makeRequest(`/api/clients/${firstClient.id}/locations`);
            if (locationsResult.status === 200) {
                const locationCount = Array.isArray(locationsResult.data) ? locationsResult.data.length : 0;
                console.log(`   ✅ Ubicaciones del cliente: ${locationCount} ubicaciones`);
                
                if (Array.isArray(locationsResult.data) && locationsResult.data.length > 0) {
                    locationsResult.data.forEach(loc => {
                        console.log(`      • ${loc.name} - ${loc.address}`);
                    });
                }
            } else {
                console.log(`   ❌ Error obteniendo ubicaciones: ${locationsResult.status}`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Error probando ubicaciones por cliente: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Prueba de APIs completada');
}

// Esperar un poco para que el servidor inicie
setTimeout(() => {
    testAPIs().catch(err => {
        console.error('❌ Error general:', err.message);
    });
}, 3000); 