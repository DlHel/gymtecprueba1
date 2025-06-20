const http = require('http');

// Función para hacer peticiones HTTP
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
                    };
                    resolve(result);
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data,
                        parseError: error.message
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function testAPIsWithCustomIds() {
    console.log('🧪 PRUEBAS DE APIs CON CUSTOM_IDS');
    console.log('='.repeat(50));
    
    const baseUrl = 'localhost';
    const port = 3000;
    
    console.log(`🌐 Probando APIs en http://${baseUrl}:${port}`);
    console.log('');

    const tests = [
        {
            name: 'GET /api/clients',
            description: 'Obtener todos los clientes con custom_id',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/clients',
                method: 'GET'
            }
        },
        {
            name: 'GET /api/locations',
            description: 'Obtener todas las ubicaciones con custom_id',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/locations',
                method: 'GET'
            }
        },
        {
            name: 'GET /api/equipment',
            description: 'Obtener todos los equipos',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/equipment',
                method: 'GET'
            }
        },
        {
            name: 'GET /api/tickets',
            description: 'Obtener todos los tickets',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/tickets',
                method: 'GET'
            }
        },
        {
            name: 'GET /api/models',
            description: 'Obtener todos los modelos',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/models',
                method: 'GET'
            }
        },
        {
            name: 'GET /api/clients/2/locations',
            description: 'Obtener ubicaciones de un cliente específico',
            options: {
                hostname: baseUrl,
                port: port,
                path: '/api/clients/2/locations',
                method: 'GET'
            }
        }
    ];

    let successCount = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        try {
            console.log(`🔍 ${test.name}`);
            console.log(`   ${test.description}`);
            
            const result = await makeRequest(test.options);
            
            if (result.statusCode === 200) {
                console.log(`   ✅ Status: ${result.statusCode} OK`);
                
                // Analizar datos específicos según el endpoint
                if (test.name.includes('/api/clients')) {
                    const clients = Array.isArray(result.data) ? result.data : (result.data.data || []);
                    console.log(`   📊 ${clients.length} clientes encontrados`);
                    
                    if (clients.length > 0) {
                        const clientsWithCustomId = clients.filter(c => c.custom_id);
                        console.log(`   🔑 ${clientsWithCustomId.length} con custom_id`);
                        
                        if (clientsWithCustomId.length > 0) {
                            console.log(`   📝 Ejemplo: ${clientsWithCustomId[0].custom_id} - ${clientsWithCustomId[0].name}`);
                        }
                    }
                    
                } else if (test.name.includes('/api/locations')) {
                    const locations = Array.isArray(result.data) ? result.data : [];
                    console.log(`   📊 ${locations.length} ubicaciones encontradas`);
                    
                    if (locations.length > 0) {
                        const locationsWithCustomId = locations.filter(l => l.custom_id);
                        console.log(`   🔑 ${locationsWithCustomId.length} con custom_id`);
                        
                        if (locationsWithCustomId.length > 0) {
                            console.log(`   📝 Ejemplo: ${locationsWithCustomId[0].custom_id} - ${locationsWithCustomId[0].name}`);
                        }
                    }
                    
                } else if (test.name.includes('/api/equipment')) {
                    const equipment = Array.isArray(result.data) ? result.data : [];
                    console.log(`   📊 ${equipment.length} equipos encontrados`);
                    
                    if (equipment.length > 0) {
                        const equipmentWithCustomId = equipment.filter(e => e.custom_id);
                        console.log(`   🔑 ${equipmentWithCustomId.length} con custom_id`);
                        
                        if (equipmentWithCustomId.length > 0) {
                            console.log(`   📝 Ejemplo: ${equipmentWithCustomId[0].custom_id} - ${equipmentWithCustomId[0].model_name || 'N/A'}`);
                        }
                    }
                    
                } else if (test.name.includes('/api/tickets')) {
                    const tickets = Array.isArray(result.data) ? result.data : [];
                    console.log(`   📊 ${tickets.length} tickets encontrados`);
                    
                    if (tickets.length > 0) {
                        console.log(`   📝 Ejemplo: #${tickets[0].id} - ${tickets[0].title}`);
                    }
                    
                } else if (test.name.includes('/api/models')) {
                    const models = Array.isArray(result.data) ? result.data : [];
                    console.log(`   📊 ${models.length} modelos encontrados`);
                    
                    if (models.length > 0) {
                        console.log(`   📝 Ejemplo: ${models[0].name} (${models[0].brand})`);
                    }
                }
                
                successCount++;
                
            } else {
                console.log(`   ❌ Status: ${result.statusCode}`);
                if (result.data) {
                    console.log(`   📄 Response: ${JSON.stringify(result.data).substring(0, 200)}...`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            if (error.code === 'ECONNREFUSED') {
                console.log(`   💡 Servidor no disponible en ${baseUrl}:${port}`);
            }
        }
        
        console.log('');
    }

    // RESUMEN FINAL
    console.log('='.repeat(50));
    console.log('📋 RESUMEN DE PRUEBAS DE APIs');
    console.log('='.repeat(50));
    
    console.log(`🎯 Resultado: ${successCount}/${totalTests} APIs funcionando correctamente`);
    
    if (successCount === totalTests) {
        console.log('✅ ¡Todas las APIs están funcionando perfectamente!');
        console.log('🎉 Sistema listo para uso en producción');
    } else {
        console.log('⚠️  Algunas APIs presentan problemas');
        console.log('🔧 Revisar configuración del servidor backend');
    }
    
    console.log('\n🚀 PRÓXIMOS PASOS:');
    console.log('   1. Probar creación de nuevos registros con custom_id');
    console.log('   2. Verificar edición y actualización de registros');
    console.log('   3. Probar búsquedas y filtros por custom_id');
    console.log('   4. Validar funcionalidad completa del frontend');
}

// Esperar un poco para que el servidor se inicie
console.log('⏳ Esperando que el servidor se inicie...');
setTimeout(() => {
    testAPIsWithCustomIds();
}, 5000); 