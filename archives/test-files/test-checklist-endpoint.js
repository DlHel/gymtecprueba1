const https = require('http');

function testChecklistEndpoint() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/gimnacion/checklist-templates',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('✅ RESPUESTA DEL ENDPOINT:');
            console.log(data);
            console.log('\n🔍 ESTADO:', res.statusCode);
        });
    });

    req.on('error', (error) => {
        console.error('❌ ERROR al conectar:', error.message);
    });

    req.end();
}

console.log('🚀 Probando endpoint de checklist templates...');
testChecklistEndpoint();