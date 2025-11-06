const http = require('http');

async function testTechniciansEndpoint() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/maintenance-tasks/technicians',
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
                        console.log(`📋 Technicians found: ${jsonData.data?.length || 0}`);
                    } catch (e) {
                        console.log('📋 Response:', data);
                    }
                } else if (res.statusCode === 401) {
                    console.log('🔐 Expected: Authentication required (this is normal)');
                } else if (res.statusCode === 404) {
                    console.log('❌ ERROR: Endpoint not found (404)');
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

// Test the technicians endpoint
testTechniciansEndpoint()
    .then(statusCode => {
        console.log(`\n✅ Test completed with status: ${statusCode}`);
        if (statusCode === 401) {
            console.log('🎉 Route is working! (401 = authentication required, which is expected)');
        } else if (statusCode === 404) {
            console.log('❌ Route still not found after fix');
        }
    })
    .catch(err => {
        console.error('❌ Test failed:', err.message);
    });