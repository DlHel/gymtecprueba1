const http = require('http');

function testEndpoint(endpoint) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: endpoint,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
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
        '/api/test-db',
        '/api/notifications/stats?period=24h',
        '/api/notifications/queue',
        '/api/notifications/templates'
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Probando: ${endpoint}`);
            const response = await testEndpoint(endpoint);
            
            console.log(`✅ Status: ${response.statusCode}`);
            if (response.statusCode === 200) {
                console.log(`📊 Success!`);
                if (response.data.message) {
                    console.log(`📋 Message: ${response.data.message}`);
                }
            } else {
                console.log(`❌ Error: ${JSON.stringify(response.data)}`);
            }
            
        } catch (error) {
            console.log(`💥 Error: ${error.message}`);
        }
        
        console.log('---\n');
        // Pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

testNotificationEndpoints();