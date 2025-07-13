/**
 * Script para probar directamente la API de usuarios
 * y obtener información detallada del error
 */

const http = require('http');

async function testUsersAPI() {
    const timestamp = () => new Date().toLocaleTimeString();
    
    console.log(`[${timestamp()}] 🔍 Probando API de usuarios...`);
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/users',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            console.log(`[${timestamp()}] 📡 Status Code: ${res.statusCode}`);
            console.log(`[${timestamp()}] 📋 Headers:`, res.headers);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`[${timestamp()}] 📄 Response Body:`, data);
                
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`[${timestamp()}] ✅ Response JSON:`, JSON.stringify(jsonData, null, 2));
                    
                    if (res.statusCode === 200) {
                        console.log(`[${timestamp()}] 🎉 API funcionando correctamente!`);
                        console.log(`[${timestamp()}] 👥 Usuarios encontrados: ${jsonData.data ? jsonData.data.length : 0}`);
                    } else {
                        console.log(`[${timestamp()}] ❌ Error ${res.statusCode}: ${jsonData.error || 'Error desconocido'}`);
                    }
                } catch (error) {
                    console.log(`[${timestamp()}] ❌ Error parsing JSON: ${error.message}`);
                    console.log(`[${timestamp()}] 📄 Raw response: ${data}`);
                }
                
                resolve({ statusCode: res.statusCode, data });
            });
        });
        
        req.on('error', (err) => {
            console.log(`[${timestamp()}] ❌ Request Error: ${err.message}`);
            reject(err);
        });
        
        req.setTimeout(10000, () => {
            console.log(`[${timestamp()}] ⏱️ Request timeout`);
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

// Ejecutar la prueba
testUsersAPI().catch(console.error); 