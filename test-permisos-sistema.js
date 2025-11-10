/**
 * Script de Pruebas del Sistema de Permisos
 * Valida que los permisos funcionan correctamente en backend
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para login y obtener token
async function login(username, password) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            username,
            password
        });
        
        if (response.data.token) {
            return {
                token: response.data.token,
                user: response.data.user
            };
        }
        return null;
    } catch (error) {
        log(`❌ Error en login: ${error.message}`, 'red');
        return null;
    }
}

// Función para probar endpoint con token
async function testEndpoint(endpoint, method, token, expectedStatus, description) {
    try {
        const config = {
            method: method.toLowerCase(),
            url: `${API_URL}${endpoint}`,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            validateStatus: () => true // No lanzar error en status != 200
        };

        const response = await axios(config);
        const success = response.status === expectedStatus;
        
        const symbol = success ? '✅' : '❌';
        const color = success ? 'green' : 'red';
        
        log(`  ${symbol} ${description}`, color);
        log(`     → Status: ${response.status} (esperado: ${expectedStatus})`, color);
        
        return success;
    } catch (error) {
        log(`  ❌ ${description} - Error: ${error.message}`, 'red');
        return false;
    }
}

// Pruebas principales
async function runTests() {
    log('\n═══════════════════════════════════════════════════════════', 'cyan');
    log('  🧪 PRUEBAS DEL SISTEMA DE PERMISOS - Gymtec ERP', 'cyan');
    log('═══════════════════════════════════════════════════════════\n', 'cyan');

    let totalTests = 0;
    let passedTests = 0;

    // ============================================================
    // TEST 1: LOGIN Y OBTENCIÓN DE TOKENS
    // ============================================================
    log('\n📋 TEST 1: LOGIN Y OBTENCIÓN DE TOKENS', 'blue');
    log('─────────────────────────────────────────────────────────', 'blue');

    const adminCredentials = await login('admin', 'admin123');
    if (adminCredentials) {
        log('✅ Login Admin exitoso', 'green');
        log(`   Usuario: ${adminCredentials.user.username} | Rol: ${adminCredentials.user.role}`, 'cyan');
        passedTests++;
    } else {
        log('❌ Login Admin falló', 'red');
    }
    totalTests++;

    // ============================================================
    // TEST 2: ENDPOINTS PROTEGIDOS - ADMIN
    // ============================================================
    log('\n📋 TEST 2: ENDPOINTS PROTEGIDOS - ADMIN (Acceso Completo)', 'blue');
    log('─────────────────────────────────────────────────────────', 'blue');

    if (adminCredentials) {
        // Admin puede acceder a system-settings
        if (await testEndpoint('/system-settings', 'GET', adminCredentials.token, 200, 'Admin accede a /system-settings')) {
            passedTests++;
        }
        totalTests++;

        // Admin puede acceder a expenses
        if (await testEndpoint('/expenses', 'GET', adminCredentials.token, 200, 'Admin accede a /expenses')) {
            passedTests++;
        }
        totalTests++;

        // Admin puede acceder a quotes
        if (await testEndpoint('/quotes', 'GET', adminCredentials.token, 200, 'Admin accede a /quotes')) {
            passedTests++;
        }
        totalTests++;
    }

    // ============================================================
    // TEST 3: ACCESO SIN TOKEN
    // ============================================================
    log('\n📋 TEST 3: ENDPOINTS SIN AUTENTICACIÓN (Deben Ser Bloqueados)', 'blue');
    log('─────────────────────────────────────────────────────────', 'blue');

    if (await testEndpoint('/system-settings', 'GET', null, 401, 'Sin token intenta /system-settings → 401')) {
        passedTests++;
    }
    totalTests++;

    if (await testEndpoint('/expenses', 'GET', null, 401, 'Sin token intenta /expenses → 401')) {
        passedTests++;
    }
    totalTests++;

    // ============================================================
    // TEST 4: VERIFICACIÓN DE PERMISOS FRONTEND
    // ============================================================
    log('\n📋 TEST 4: ARCHIVOS DEL SISTEMA DE PERMISOS', 'blue');
    log('─────────────────────────────────────────────────────────', 'blue');

    const fs = require('fs');
    const files = [
        'frontend/js/permissions.js',
        'frontend/js/auth.js',
        'frontend/js/nav-loader.js'
    ];

    files.forEach(file => {
        if (fs.existsSync(file)) {
            log(`✅ Existe: ${file}`, 'green');
            passedTests++;
        } else {
            log(`❌ NO existe: ${file}`, 'red');
        }
        totalTests++;
    });

    // ============================================================
    // RESUMEN
    // ============================================================
    log('\n═══════════════════════════════════════════════════════════', 'cyan');
    log('  📊 RESUMEN DE PRUEBAS', 'cyan');
    log('═══════════════════════════════════════════════════════════', 'cyan');
    
    const percentage = ((passedTests / totalTests) * 100).toFixed(1);
    const color = percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red';
    
    log(`\n  Total Pruebas:    ${totalTests}`, 'cyan');
    log(`  Pruebas Exitosas: ${passedTests}`, 'green');
    log(`  Pruebas Fallidas: ${totalTests - passedTests}`, 'red');
    log(`  Porcentaje Éxito: ${percentage}%`, color);

    if (percentage >= 90) {
        log('\n  ✅ SISTEMA DE PERMISOS FUNCIONANDO CORRECTAMENTE\n', 'green');
    } else if (percentage >= 70) {
        log('\n  ⚠️ SISTEMA FUNCIONAL CON ALGUNOS ERRORES\n', 'yellow');
    } else {
        log('\n  ❌ SISTEMA TIENE PROBLEMAS CRÍTICOS\n', 'red');
    }

    process.exit(percentage >= 90 ? 0 : 1);
}

// Ejecutar pruebas
runTests().catch(error => {
    log(`\n❌ Error fatal en pruebas: ${error.message}`, 'red');
    process.exit(1);
});
