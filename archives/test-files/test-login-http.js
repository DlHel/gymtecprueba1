// Test HTTP directo al endpoint de login
const http = require('http');

const data = JSON.stringify({
    username: 'admin',
    password: 'admin123'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('🧪 TEST HTTP AL ENDPOINT DE LOGIN\n');
console.log('📡 Enviando solicitud a: http://localhost:3000/api/auth/login');
console.log('📦 Datos:', JSON.parse(data));
console.log('');

const req = http.request(options, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    console.log('');

    let body = '';
    
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('📥 Respuesta del servidor:');
        try {
            const response = JSON.parse(body);
            console.log(JSON.stringify(response, null, 2));
            
            if (res.statusCode === 200) {
                console.log('\n✅ LOGIN EXITOSO - El servidor responde correctamente');
                console.log('💡 El problema puede estar en el frontend o en CORS');
            } else {
                console.log(`\n❌ LOGIN FALLÓ - Status: ${res.statusCode}`);
                console.log('💡 Revisar las credenciales o configuración del servidor');
            }
        } catch (e) {
            console.log(body);
            console.log('\n⚠️ Respuesta no es JSON válido');
        }
        
        process.exit(res.statusCode === 200 ? 0 : 1);
    });
});

req.on('error', (error) => {
    console.error('❌ Error en la solicitud:', error.message);
    console.log('\n💡 Posibles causas:');
    console.log('   1. El servidor no está corriendo en puerto 3000');
    console.log('   2. El servidor no está respondiendo');
    console.log('   3. Firewall bloqueando la conexión');
    console.log('\n🔧 Solución: Ejecutar start-servers.bat');
    process.exit(1);
});

req.write(data);
req.end();
