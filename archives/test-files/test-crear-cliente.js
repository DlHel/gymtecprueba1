/**
 * 🧪 TEST ESPECÍFICO - CREAR CLIENTE
 * Verifica que el flujo de creación de cliente funciona correctamente
 */

const http = require('http');
const { URL } = require('url');

function makeRequest(url, options = {}) {
    return new Promise((resolve) => {
        try {
            const urlObj = new URL(url);
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 80,
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: 5000
            };
            
            if (options.body) {
                requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
            }
            
            const req = http.request(requestOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    let parsedData = null;
                    try {
                        parsedData = JSON.parse(data);
                    } catch (e) {
                        parsedData = data;
                    }
                    
                    resolve({
                        status: res.statusCode,
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        data: parsedData,
                        headers: res.headers,
                        body: data
                    });
                });
            });
            
            req.on('error', (error) => {
                resolve({ status: 0, ok: false, error: error.message, data: null });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({ status: 0, ok: false, error: 'Request timeout', data: null });
            });
            
            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
            
        } catch (error) {
            resolve({ status: 0, ok: false, error: error.message, data: null });
        }
    });
}

async function testCreateClient() {
    console.log('🧪 TEST: Crear Cliente vía API');
    console.log('===============================\n');
    
    // 1. Obtener token de autenticación
    console.log('📝 Paso 1: Obteniendo token de autenticación...');
    const loginResponse = await makeRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin@gymtec.com',
            password: 'admin123'
        })
    });
    
    if (!loginResponse.ok || !loginResponse.data?.token) {
        console.error('❌ No se pudo obtener token de autenticación');
        console.error('   Status:', loginResponse.status);
        console.error('   Error:', loginResponse.data?.error || 'Unknown');
        return false;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Token obtenido correctamente\n');
    
    // 2. Intentar crear cliente CON TODOS LOS CAMPOS REQUERIDOS
    console.log('📝 Paso 2: Creando cliente con campos CORRECTOS...');
    
    const timestamp = Date.now();
    const clientData = {
        name: `Test Cliente ${timestamp}`,
        legal_name: `Test Cliente SPA ${timestamp}`,
        rut: `12345678-${(timestamp % 10)}`, // RUT válido
        address: 'Av. Test 123, Santiago',
        phone: '+56912345678',
        email: `test${timestamp}@example.com`,
        business_activity: 'Servicios de gimnasio',
        contact_name: 'Juan Test'
    };
    
    console.log('   Datos a enviar:', JSON.stringify(clientData, null, 2));
    
    const createResponse = await makeRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
    });
    
    console.log('\n📊 Respuesta del servidor:');
    console.log('   Status:', createResponse.status);
    console.log('   Response:', JSON.stringify(createResponse.data, null, 2));
    
    if (createResponse.ok) {
        console.log('\n✅ ÉXITO: Cliente creado correctamente');
        console.log('   ID del nuevo cliente:', createResponse.data.id);
        return true;
    } else {
        console.log('\n❌ ERROR: No se pudo crear el cliente');
        console.log('   Mensaje de error:', createResponse.data?.error);
        console.log('   Detalles:', createResponse.data?.details);
        
        // Mostrar qué campos faltan o están mal
        if (createResponse.data?.details) {
            console.log('\n🔍 Campos con problemas:');
            createResponse.data.details.forEach(detail => {
                console.log(`   - ${detail}`);
            });
        }
        
        return false;
    }
}

async function testCreateClientInvalid() {
    console.log('\n\n🧪 TEST: Intentar crear cliente con datos INVÁLIDOS (esperado: error)');
    console.log('=======================================================================\n');
    
    // 1. Obtener token
    const loginResponse = await makeRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin@gymtec.com',
            password: 'admin123'
        })
    });
    
    if (!loginResponse.ok) return;
    const token = loginResponse.data.token;
    
    // 2. Intentar crear con datos incompletos
    console.log('📝 Intentando crear cliente SIN campos obligatorios...');
    
    const invalidData = {
        name: 'Solo nombre',
        email: 'test@example.com'
        // Faltan: legal_name (obligatorio) y rut (obligatorio)
    };
    
    console.log('   Datos incompletos:', JSON.stringify(invalidData, null, 2));
    
    const createResponse = await makeRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
    });
    
    console.log('\n📊 Respuesta del servidor:');
    console.log('   Status:', createResponse.status);
    console.log('   Response:', JSON.stringify(createResponse.data, null, 2));
    
    if (!createResponse.ok) {
        console.log('\n✅ CORRECTO: El servidor rechazó los datos inválidos');
        console.log('   La validación está funcionando correctamente');
        return true;
    } else {
        console.log('\n❌ PROBLEMA: El servidor aceptó datos inválidos');
        console.log('   La validación NO está funcionando');
        return false;
    }
}

async function runTests() {
    console.log('🚀 INICIANDO TESTS DE CREACIÓN DE CLIENTES');
    console.log('==========================================\n');
    
    const test1 = await testCreateClient();
    const test2 = await testCreateClientInvalid();
    
    console.log('\n\n📊 RESUMEN DE TESTS:');
    console.log('===================');
    console.log(`   Test 1 (Crear cliente válido): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Test 2 (Rechazar inválido): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    
    if (test1 && test2) {
        console.log('\n🎉 TODOS LOS TESTS PASARON - API de clientes funciona correctamente');
        process.exit(0);
    } else {
        console.log('\n⚠️ ALGUNOS TESTS FALLARON - Revisar implementación');
        process.exit(1);
    }
}

runTests();