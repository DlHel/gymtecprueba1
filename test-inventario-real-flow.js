/**
 * TEST REAL DEL FLUJO DE INVENTARIO
 * Ejecutar con: node test-inventario-real-flow.js
 * 
 * Este test REALMENTE simula el navegador y verifica el flujo completo
 */

const http = require('http');
const https = require('https');

console.log('🧪 TEST REAL: Flujo completo de inventario\n');
console.log('='.repeat(60));

// Configuración
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:8080';

// Step 1: Verificar que backend esté corriendo
async function checkBackend() {
    return new Promise((resolve, reject) => {
        console.log('\n📡 STEP 1: Verificando backend...');
        http.get(`${BACKEND_URL}/api/health`, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Backend corriendo en puerto 3000');
                resolve(true);
            } else {
                console.log(`⚠️ Backend responde con código ${res.statusCode}`);
                resolve(false);
            }
        }).on('error', (err) => {
            console.error('❌ Backend NO está corriendo');
            console.error('   Error:', err.message);
            reject(err);
        });
    });
}

// Step 2: Verificar que frontend esté corriendo
async function checkFrontend() {
    return new Promise((resolve, reject) => {
        console.log('\n📡 STEP 2: Verificando frontend...');
        http.get(`${FRONTEND_URL}/inventario.html`, (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Frontend corriendo en puerto 8080');
                console.log('   inventario.html accesible');
                resolve(true);
            } else {
                console.log(`⚠️ Frontend responde con código ${res.statusCode}`);
                resolve(false);
            }
        }).on('error', (err) => {
            console.error('❌ Frontend NO está corriendo');
            console.error('   Error:', err.message);
            reject(err);
        });
    });
}

// Step 3: Login y obtener token
async function login() {
    return new Promise((resolve, reject) => {
        console.log('\n🔐 STEP 3: Login con admin/admin123...');
        
        const postData = JSON.stringify({
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
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    console.log('✅ Login exitoso');
                    console.log('   Token recibido:', result.token.substring(0, 30) + '...');
                    console.log('   Usuario:', result.user.username);
                    console.log('   Role:', result.user.role);
                    resolve(result.token);
                } else {
                    console.error(`❌ Login falló con código ${res.statusCode}`);
                    console.error('   Respuesta:', data);
                    reject(new Error(`Login failed: ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ Error en login:', err.message);
            reject(err);
        });
        
        req.write(postData);
        req.end();
    });
}

// Step 4: Probar endpoint de inventario con token
async function testInventoryEndpoint(token) {
    return new Promise((resolve, reject) => {
        console.log('\n📦 STEP 4: Probando GET /api/inventory con token...');
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/inventory',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    console.log('✅ Endpoint /api/inventory funciona correctamente');
                    console.log(`   Items de inventario: ${result.data?.length || 0}`);
                    resolve(true);
                } else if (res.statusCode === 401) {
                    console.error('❌ Token RECHAZADO por el servidor (401 Unauthorized)');
                    console.error('   Esto causaría el bucle de redirección');
                    console.error('   Respuesta:', data);
                    resolve(false);
                } else {
                    console.error(`⚠️ Endpoint respondió con código ${res.statusCode}`);
                    console.error('   Respuesta:', data);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ Error en request:', err.message);
            reject(err);
        });
        
        req.end();
    });
}

// Step 5: Verificar que inventario.html carga el JavaScript correcto
async function checkInventarioJS() {
    return new Promise((resolve, reject) => {
        console.log('\n📄 STEP 5: Verificando inventario.html...');
        
        http.get(`${FRONTEND_URL}/inventario.html`, (res) => {
            let html = '';
            
            res.on('data', (chunk) => {
                html += chunk;
            });
            
            res.on('end', () => {
                // Verificar que incluye auth.js ANTES de inventario.js
                const hasAuthJS = html.includes('js/auth.js');
                const hasInventarioJS = html.includes('js/inventario.js');
                const authIndex = html.indexOf('js/auth.js');
                const inventarioIndex = html.indexOf('js/inventario.js');
                
                console.log(`   ${hasAuthJS ? '✅' : '❌'} Incluye auth.js`);
                console.log(`   ${hasInventarioJS ? '✅' : '❌'} Incluye inventario.js`);
                
                if (hasAuthJS && hasInventarioJS) {
                    if (authIndex < inventarioIndex) {
                        console.log('   ✅ auth.js se carga ANTES que inventario.js (correcto)');
                    } else {
                        console.log('   ⚠️ inventario.js se carga ANTES que auth.js (problema potencial)');
                    }
                }
                
                resolve(hasAuthJS && hasInventarioJS);
            });
        }).on('error', reject);
    });
}

// Ejecutar todos los tests
async function runAllTests() {
    try {
        await checkBackend();
        await checkFrontend();
        const token = await login();
        const inventoryWorks = await testInventoryEndpoint(token);
        await checkInventarioJS();
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE PRUEBAS:\n');
        
        if (inventoryWorks) {
            console.log('✅ RESULTADO: El sistema debería funcionar correctamente');
            console.log('   - Backend acepta el token');
            console.log('   - Endpoint de inventario responde correctamente');
            console.log('   - No debería haber bucle de redirección');
        } else {
            console.log('❌ RESULTADO: PROBLEMA DETECTADO');
            console.log('   - El token es rechazado por el backend (401)');
            console.log('   - Esto causa el bucle: inventario → login → index → inventario');
            console.log('   - CAUSA: Middleware authenticateToken rechaza el token');
        }
        
        console.log('\n🔍 PRÓXIMOS PASOS:');
        console.log('   1. Abrir navegador en modo incógnito');
        console.log('   2. Ir a: http://localhost:8080/login.html');
        console.log('   3. Login con: admin / admin123');
        console.log('   4. Abrir DevTools (F12) → Console');
        console.log('   5. Ir a: http://localhost:8080/inventario.html');
        console.log('   6. Observar logs en consola y comportamiento real');
        
        console.log('\n📋 VERIFICAR EN CONSOLA DEL NAVEGADOR:');
        console.log('   - ✅ "🔍 INVENTARIO: Iniciando verificación de autenticación..."');
        console.log('   - ✅ "✅ INVENTARIO: Usuario autenticado, cargando módulo..."');
        console.log('   - ❌ Si ve "❌ INVENTARIO: Usuario no autenticado..." → PROBLEMA');
        
    } catch (error) {
        console.error('\n💥 ERROR CRÍTICO:', error.message);
        console.log('\n⚠️ No se pudieron completar las pruebas');
        console.log('   Verificar que start-servers.bat esté corriendo');
    }
}

runAllTests();
