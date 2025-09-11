// Test script para verificar el endpoint /api/equipment
const http = require('http');

// Token de prueba (admin)
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImNsaWVudF9pZCI6bnVsbCwiaWF0IjoxNzI1NzYzMDQzLCJleHAiOjE3MjU4NDk0NDN9.0123456789';

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/equipment',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
    }
};

console.log('🔍 Testing /api/equipment endpoint...');

const req = http.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            if (res.statusCode === 200) {
                const parsed = JSON.parse(data);
                console.log('✅ Success! Equipment data:');
                console.log(`📊 Total equipment: ${parsed.length}`);
                if (parsed.length > 0) {
                    console.log('📄 First item:', parsed[0]);
                }
            } else {
                console.log('❌ Error response:', data);
            }
        } catch (error) {
            console.log('❌ Parse error:', error.message);
            console.log('📄 Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
});

req.end();
