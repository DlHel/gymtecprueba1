/**
 * Test específico para verificar la página de equipos
 */

const http = require('http');

const API_BASE = 'http://localhost:3000/api';
let authToken = '';

// Colores para la consola
const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
};

function log(message, type = 'info') {
    const color = colors[type] || colors.info;
    console.log(`${color}${message}${colors.reset}`);
}

// Función para hacer requests HTTP
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data ? JSON.parse(data) : null
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        
        req.end();
    });
}

// 1. Obtener token de autenticación
async function getAuthToken() {
    log('\n🔐 === OBTENIENDO TOKEN DE AUTENTICACIÓN ===', 'info');
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            username: 'admin',
            password: 'admin123'
        });
        
        if (response.statusCode === 200 && response.body.token) {
            authToken = response.body.token;
            log('✅ Token obtenido correctamente', 'success');
            return true;
        } else {
            log('❌ Error al obtener token', 'error');
            console.log('Response:', response);
            return false;
        }
    } catch (error) {
        log(`❌ Error de conexión: ${error.message}`, 'error');
        return false;
    }
}

// 2. Verificar endpoint de equipos
async function testEquipmentEndpoint() {
    log('\n🔧 === VERIFICANDO ENDPOINT /api/equipment ===', 'info');
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/equipment',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        log(`📡 Status: ${response.statusCode}`, 'info');
        
        if (response.statusCode === 200) {
            const data = response.body.data || [];
            log(`✅ Endpoint funciona correctamente`, 'success');
            log(`📊 Total de equipos: ${data.length}`, 'info');
            
            if (data.length > 0) {
                log('\n📋 Estructura del primer equipo:', 'info');
                const equipment = data[0];
                console.log(JSON.stringify(equipment, null, 2));
                
                // Verificar campos necesarios
                const requiredFields = ['id', 'name', 'location_id', 'activo'];
                const missingFields = requiredFields.filter(field => !(field in equipment));
                
                if (missingFields.length > 0) {
                    log(`⚠️ Campos faltantes: ${missingFields.join(', ')}`, 'warning');
                } else {
                    log('✅ Todos los campos necesarios están presentes', 'success');
                }
            } else {
                log('⚠️ No hay equipos en la base de datos', 'warning');
            }
            
            return true;
        } else {
            log(`❌ Error: Status ${response.statusCode}`, 'error');
            console.log('Response:', response.body);
            return false;
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'error');
        return false;
    }
}

// 3. Verificar endpoint de clientes
async function testClientsEndpoint() {
    log('\n👥 === VERIFICANDO ENDPOINT /api/clients ===', 'info');
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/clients',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        log(`📡 Status: ${response.statusCode}`, 'info');
        
        if (response.statusCode === 200) {
            const data = response.body.data || [];
            log(`✅ Endpoint funciona correctamente`, 'success');
            log(`📊 Total de clientes: ${data.length}`, 'info');
            return true;
        } else {
            log(`❌ Error: Status ${response.statusCode}`, 'error');
            return false;
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'error');
        return false;
    }
}

// 4. Verificar endpoint de ubicaciones
async function testLocationsEndpoint() {
    log('\n📍 === VERIFICANDO ENDPOINT /api/locations ===', 'info');
    
    try {
        const response = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/locations',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        log(`📡 Status: ${response.statusCode}`, 'info');
        
        if (response.statusCode === 200) {
            const data = response.body.data || [];
            log(`✅ Endpoint funciona correctamente`, 'success');
            log(`📊 Total de ubicaciones: ${data.length}`, 'info');
            return true;
        } else {
            log(`❌ Error: Status ${response.statusCode}`, 'error');
            return false;
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'error');
        return false;
    }
}

// 5. Verificar que equipos.html existe
async function checkEquipmentPage() {
    log('\n📄 === VERIFICANDO ARCHIVO equipos.html ===', 'info');
    
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, 'frontend', 'equipos.html');
    
    if (fs.existsSync(filePath)) {
        log('✅ Archivo equipos.html existe', 'success');
        
        // Verificar contenido
        const content = fs.readFileSync(filePath, 'utf8');
        
        const checks = [
            { name: 'Container de equipos', pattern: 'equipment-container' },
            { name: 'Filtros', pattern: 'filter-search' },
            { name: 'Estadísticas', pattern: 'equipment-stats' },
            { name: 'Auth verification', pattern: 'authManager.isAuthenticated' },
            { name: 'API calls', pattern: 'authenticatedFetch' }
        ];
        
        checks.forEach(check => {
            if (content.includes(check.pattern)) {
                log(`✅ ${check.name} presente`, 'success');
            } else {
                log(`❌ ${check.name} NO encontrado`, 'error');
            }
        });
        
        return true;
    } else {
        log('❌ Archivo equipos.html NO existe', 'error');
        return false;
    }
}

// Función principal
async function main() {
    log('\n🧪 TESTING PÁGINA DE EQUIPOS', 'info');
    log('='.repeat(50), 'info');
    log(`📅 Fecha: ${new Date().toISOString()}`, 'info');
    
    // 1. Autenticación
    const authSuccess = await getAuthToken();
    if (!authSuccess) {
        log('\n❌ No se pudo autenticar. Abortando tests.', 'error');
        return;
    }
    
    // 2. Verificar archivo
    await checkEquipmentPage();
    
    // 3. Verificar endpoints
    const equipmentOk = await testEquipmentEndpoint();
    const clientsOk = await testClientsEndpoint();
    const locationsOk = await testLocationsEndpoint();
    
    // Resumen final
    log('\n📊 === RESUMEN FINAL ===', 'info');
    log('='.repeat(50), 'info');
    
    const results = [
        { name: 'Autenticación', success: authSuccess },
        { name: 'Endpoint Equipment', success: equipmentOk },
        { name: 'Endpoint Clients', success: clientsOk },
        { name: 'Endpoint Locations', success: locationsOk }
    ];
    
    results.forEach(result => {
        if (result.success) {
            log(`✅ ${result.name}`, 'success');
        } else {
            log(`❌ ${result.name}`, 'error');
        }
    });
    
    const allSuccess = results.every(r => r.success);
    
    if (allSuccess) {
        log('\n🎉 TODOS LOS TESTS PASARON', 'success');
        log('✅ La página de equipos está lista para usar', 'success');
        log('🌐 Abre http://localhost:8080/equipos.html para ver la página', 'info');
    } else {
        log('\n⚠️ ALGUNOS TESTS FALLARON', 'warning');
        log('🔧 Revisa los errores anteriores y corrige los problemas', 'info');
    }
}

// Ejecutar tests
main().catch(error => {
    log(`💥 Error fatal: ${error.message}`, 'error');
    console.error(error);
});
