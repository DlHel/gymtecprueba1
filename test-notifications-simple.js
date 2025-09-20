const http = require('http');

// Función para hacer requests HTTP
function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
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

async function testNotificationEndpoints() {
    console.log('🧪 Probando endpoints de notificaciones...\n');

    const endpoints = [
        '/api/notifications/stats?period=24h',
        '/api/notifications/queue',
        '/api/notifications/templates'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Probando: ${endpoint}`);
            const response = await makeRequest(endpoint);
            
            if (response.statusCode === 200) {
                const data = JSON.parse(response.data);
                console.log(`✅ Status: ${response.statusCode}`);
                console.log(`📊 Data count: ${data.data ? data.data.length : 'N/A'}`);
                console.log(`📋 Message: ${data.message || 'N/A'}`);
            } else {
                console.log(`❌ Status: ${response.statusCode}`);
                console.log(`❌ Response: ${response.data}`);
            }
            
        } catch (error) {
            console.log(`💥 Error: ${error.message}`);
        }
        
        console.log('---\n');
    }
}

testNotificationEndpoints();