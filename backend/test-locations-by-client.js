const http = require('http');

console.log('🔍 PROBANDO API DE UBICACIONES POR CLIENTE');
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

async function testLocationsByClient() {
    console.log('📋 1. Obteniendo lista de clientes...\n');
    
    try {
        // Obtener clientes
        const clientsResult = await makeRequest('/api/clients');
        
        if (clientsResult.status !== 200) {
            console.log('❌ Error obteniendo clientes:', clientsResult.status);
            return;
        }
        
        const clients = clientsResult.data.data || clientsResult.data;
        console.log(`✅ Encontrados ${clients.length} clientes\n`);
        
        // Probar ubicaciones para cada cliente
        for (const client of clients) {
            console.log(`🏢 Probando ubicaciones para: ${client.name} (ID: ${client.id})`);
            
            try {
                const locationsResult = await makeRequest(`/api/clients/${client.id}/locations`);
                
                if (locationsResult.status === 200) {
                    const locations = locationsResult.data.data || locationsResult.data;
                    console.log(`   ✅ ${locations.length} ubicaciones encontradas`);
                    
                    if (locations.length > 0) {
                        locations.forEach(loc => {
                            console.log(`      • ${loc.name} - ${loc.address} (${loc.equipment_count || 0} equipos)`);
                        });
                    }
                } else {
                    console.log(`   ❌ Error ${locationsResult.status}: ${locationsResult.data}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
            
            console.log(''); // Línea en blanco
        }
        
        console.log('='.repeat(50));
        console.log('✅ Prueba de ubicaciones por cliente completada');
        
    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

// Esperar un poco para que el servidor esté listo
setTimeout(() => {
    testLocationsByClient();
}, 2000); 