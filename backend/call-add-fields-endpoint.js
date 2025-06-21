const http = require('http');

function callAddFieldsEndpoint() {
    console.log('🔧 Llamando al endpoint para agregar campos custom_id...');
    
    const postData = JSON.stringify({});
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/add-custom-id-fields',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                
                console.log('✅ Respuesta del servidor:');
                console.log(JSON.stringify(result, null, 2));
                
                // Verificar si los campos se agregaron correctamente
                console.log('\n📊 RESUMEN:');
                if (result.verification) {
                    Object.entries(result.verification).forEach(([table, info]) => {
                        const status = info.hasCustomId ? '✅' : '❌';
                        console.log(`   ${status} ${table}: custom_id ${info.hasCustomId ? 'AGREGADO' : 'NO ENCONTRADO'}`);
                    });
                }
                
            } catch (error) {
                console.error('❌ Error parsing JSON:', error.message);
                console.log('Raw response:', data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 El servidor no está corriendo. Inicia el servidor con:');
            console.log('   .\\start-servers.bat');
        }
    });
    
    req.write(postData);
    req.end();
}

callAddFieldsEndpoint(); 