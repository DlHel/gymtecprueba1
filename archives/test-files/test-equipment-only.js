const http = require('http');

async function testEquipmentEndpoint() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/equipment',
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
                console.log(`\n🔍 Testing: GET ${options.path}`);
                console.log(`📊 Status Code: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    console.log('✅ SUCCESS: Endpoint working correctly');
                    try {
                        const jsonData = JSON.parse(data);
                        console.log(`📋 Equipment found: ${jsonData.data?.length || 0}`);
                    } catch (e) {
                        console.log('📋 Response:', data);
                    }
                } else if (res.statusCode === 401) {
                    console.log('🔐 Expected: Authentication required (this is normal)');
                } else if (res.statusCode === 500) {
                    console.log('❌ ERROR: Internal server error (500)');
                    try {
                        const errorData = JSON.parse(data);
                        console.log('📋 Error details:', errorData);
                    } catch (e) {
                        console.log('📋 Raw error:', data);
                    }
                } else {
                    console.log(`⚠️  Status: ${res.statusCode}`);
                    console.log('📋 Response:', data);
                }
                
                resolve(res.statusCode);
            });
        });

        req.on('error', (err) => {
            console.error('❌ Request failed:', err.message);
            reject(err);
        });

        req.end();
    });
}

// Test the equipment endpoint
testEquipmentEndpoint()
    .then(statusCode => {
        console.log(`\n✅ Test completed with status: ${statusCode}`);
        if (statusCode === 401) {
            console.log('🎉 Route is working! (401 = authentication required, which is expected)');
        } else if (statusCode === 500) {
            console.log('❌ Route has server error - needs SQL fix');
        }
    })
    .catch(err => {
        console.error('❌ Test failed:', err.message);
    });