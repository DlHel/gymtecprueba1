const http = require('http');

console.log('🔍 TEST SIMPLE DEL SERVIDOR');
console.log('===========================\n');

// Test simple con timeout más largo
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/clients',
    method: 'GET',
    timeout: 10000  // 10 segundos
};

console.log('📡 Intentando conectar a http://localhost:3000/api/clients...');

const req = http.request(options, (res) => {
    console.log(`✅ Servidor responde! Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const jsonData = JSON.parse(data);
            console.log('📋 Respuesta JSON recibida:', typeof jsonData);
            console.log('📊 Datos:', JSON.stringify(jsonData).substring(0, 200) + '...');
        } catch (e) {
            console.log('📋 Respuesta no-JSON:', data.substring(0, 200) + '...');
        }
    });
});

req.on('error', (err) => {
    console.log(`❌ Error de conexión: ${err.message}`);
    console.log('💡 Posibles causas:');
    console.log('   - Servidor no está corriendo');
    console.log('   - MySQL no está disponible');
    console.log('   - Puerto 3000 bloqueado');
});

req.on('timeout', () => {
    console.log('⏰ Timeout - Servidor no responde en 10 segundos');
    req.destroy();
});

req.end();

// También verificar si el puerto está en uso
const net = require('net');
const tester = net.createServer()
.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('\n🔍 Puerto 3000 está en uso (esto es bueno - servidor corriendo)');
    } else {
        console.log(`\n❌ Error de puerto: ${err.message}`);
    }
})
.once('listening', () => {
    console.log('\n⚠️  Puerto 3000 está libre (servidor NO está corriendo)');
    tester.close();
})
.listen(3000); 