const http = require('http');

async function testDashboardEndpoints() {
    console.log('🧪 Probando que el dashboard de notificaciones esté funcionando...\n');

    // Test frontend serving
    try {
        console.log('🌐 Verificando que el frontend esté disponible...');
        const frontendResponse = await makeRequest(':8080', '/notifications-dashboard.html');
        console.log(`Frontend Status: ${frontendResponse.statusCode}`);
        
        if (frontendResponse.statusCode === 200) {
            console.log('✅ Frontend dashboard disponible');
        } else {
            console.log('❌ Frontend dashboard no disponible');
        }
    } catch (error) {
        console.log('❌ Error accediendo al frontend:', error.message);
    }

    console.log('\n---\n');

    // Test backend APIs
    console.log('🔗 Verificando endpoints del backend...');
    
    const endpoints = [
        { name: 'Stats', path: '/api/notifications/stats?period=24h' },
        { name: 'Queue', path: '/api/notifications/queue' },
        { name: 'Templates', path: '/api/notifications/templates' }
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await makeRequest(':3000', endpoint.path);
            console.log(`${endpoint.name}: ${response.statusCode === 200 ? '✅' : '❌'} (${response.statusCode})`);
            
            if (response.statusCode === 200) {
                const data = JSON.parse(response.data);
                console.log(`  → ${data.message}, datos: ${data.data?.length !== undefined ? data.data.length + ' items' : 'objeto'}`);
            }
        } catch (error) {
            console.log(`${endpoint.name}: ❌ Error - ${error.message}`);
        }
    }

    console.log('\n🎯 Dashboard de notificaciones listo para usar!');
    console.log('📱 Accede en: http://localhost:8080/notifications-dashboard.html');
}

function makeRequest(port, path) {
    return new Promise((resolve, reject) => {
        const [, portNum] = port.split(':');
        const options = {
            hostname: 'localhost',
            port: parseInt(portNum, 10),
            path: path,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

testDashboardEndpoints();