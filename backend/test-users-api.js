const http = require('http');

function testUsersAPI() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/users',
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
            console.log(`Status: ${res.statusCode}`);
            console.log(`Headers:`, res.headers);
            console.log(`Raw response:`, data);
            
            try {
                const parsed = JSON.parse(data);
                console.log(`Parsed response:`, parsed);
            } catch (error) {
                console.log(`Failed to parse JSON:`, error.message);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error:', error);
    });

    req.end();
}

console.log('🔍 Probando API de usuarios...');
testUsersAPI(); 