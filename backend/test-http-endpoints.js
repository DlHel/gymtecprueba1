/**
 * Test directo de endpoints HTTP para debuggear el problema
 */

const http = require('http');

function makeRequest(path, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api${path}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Add auth header if token provided
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        data: parsed,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        headers: res.headers,
                        error: 'JSON parse error'
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

async function testEndpoints() {
    console.log('🌐 TESTING ENDPOINTS HTTP DIRECTAMENTE\n');

    // Note: In a real scenario, you'd need a valid JWT token
    // For now, we'll test without auth to see what happens
    
    try {
        console.log('1️⃣ Testing /api/maintenance-tasks...');
        const tasksResponse = await makeRequest('/maintenance-tasks');
        console.log(`   Status: ${tasksResponse.status}`);
        console.log(`   Response:`, JSON.stringify(tasksResponse.data, null, 2));
        console.log();

        console.log('2️⃣ Testing /api/equipment...');
        const equipmentResponse = await makeRequest('/equipment');
        console.log(`   Status: ${equipmentResponse.status}`);
        console.log(`   Response:`, JSON.stringify(equipmentResponse.data, null, 2));
        console.log();

        console.log('3️⃣ Testing /api/maintenance-tasks/technicians...');
        const techniciansResponse = await makeRequest('/maintenance-tasks/technicians');
        console.log(`   Status: ${techniciansResponse.status}`);
        console.log(`   Response:`, JSON.stringify(techniciansResponse.data, null, 2));
        
    } catch (error) {
        console.error('❌ Error testing endpoints:', error.message);
    }
}

// Check if server is running
function checkServer() {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/health',
            method: 'GET',
            timeout: 2000
        }, (res) => {
            resolve(true);
        });

        req.on('error', () => {
            resolve(false);
        });

        req.on('timeout', () => {
            resolve(false);
        });

        req.end();
    });
}

async function main() {
    console.log('🔍 Verificando servidor...');
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log('❌ Servidor no está corriendo en localhost:3000');
        console.log('💡 Ejecuta: npm start en el directorio backend');
        process.exit(1);
    }
    
    console.log('✅ Servidor detectado en localhost:3000\n');
    await testEndpoints();
    
    console.log('\n📋 NOTA: Los endpoints requieren autenticación JWT.');
    console.log('   El error 401 es esperado sin token válido.');
    console.log('   Pero nos permite ver si los endpoints están disponibles.');
}

main();