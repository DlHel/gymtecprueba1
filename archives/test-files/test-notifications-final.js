const http = require('http');

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

async function testNotifications() {
    console.log('🧪 Probando endpoints de notificaciones corregidos...\n');

    try {
        // Test endpoint stats
        console.log('📊 Probando /api/notifications/stats...');
        const statsResponse = await makeRequest('/api/notifications/stats?period=24h');
        console.log(`Status: ${statsResponse.statusCode}`);
        
        if (statsResponse.statusCode === 200) {
            const statsData = JSON.parse(statsResponse.data);
            console.log('✅ Stats funcionando:', statsData.message);
            console.log('📊 Datos de stats:', JSON.stringify(statsData.data, null, 2));
        } else {
            console.log('❌ Stats error:', statsResponse.data);
        }
        
        console.log('\n---\n');

        // Test endpoint queue
        console.log('📮 Probando /api/notifications/queue...');
        const queueResponse = await makeRequest('/api/notifications/queue');
        console.log(`Status: ${queueResponse.statusCode}`);
        
        if (queueResponse.statusCode === 200) {
            const queueData = JSON.parse(queueResponse.data);
            console.log('✅ Queue funcionando:', queueData.message);
            console.log('📮 Items en queue:', queueData.data?.length || 0);
        } else {
            console.log('❌ Queue error:', queueResponse.data);
        }
        
        console.log('\n---\n');

        // Test endpoint templates
        console.log('📧 Probando /api/notifications/templates...');
        const templatesResponse = await makeRequest('/api/notifications/templates');
        console.log(`Status: ${templatesResponse.statusCode}`);
        
        if (templatesResponse.statusCode === 200) {
            const templatesData = JSON.parse(templatesResponse.data);
            console.log('✅ Templates funcionando:', templatesData.message);
            console.log('📧 Número de templates:', templatesData.data?.length || 0);
        } else {
            console.log('❌ Templates error:', templatesResponse.data);
        }
        
    } catch (error) {
        console.error('💥 Error en test:', error.message);
    }
}

testNotifications();