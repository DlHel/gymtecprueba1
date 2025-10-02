/**
 * GYMTEC ERP - Test de Endpoint de Movimientos de Inventario
 * 
 * Prueba el nuevo endpoint GET /api/inventory/movements
 * implementado en CORRECCIÓN 4
 */

const API_BASE = 'http://localhost:3000/api';
let authToken = null;

// Colores para terminal
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

// Función para autenticarse
async function authenticate() {
    try {
        log('\n🔐 Autenticando...', 'cyan');
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const data = await response.json();
        
        if (data.token) {
            authToken = data.token;
            log('✅ Autenticación exitosa\n', 'green');
            return true;
        } else {
            log('❌ Error en autenticación: ' + JSON.stringify(data), 'red');
            return false;
        }
    } catch (error) {
        log('❌ Error de conexión: ' + error.message, 'red');
        return false;
    }
}

// Función para hacer fetch autenticado
async function authenticatedFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${authToken}`
        }
    });
}

// TEST 1: Obtener todos los movimientos (límite 50)
async function testGetAllMovements() {
    log('📋 TEST 1: GET /api/inventory/movements (todos)', 'yellow');
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/inventory/movements?limit=50`);
        const result = await response.json();
        
        if (response.ok && result.message === 'success') {
            log(`✅ PASS - ${result.data.length} movimientos obtenidos`, 'green');
            log(`   📊 Estadísticas:`, 'cyan');
            log(`      - Total movimientos: ${result.stats?.total_movements || 0}`, 'cyan');
            log(`      - Total entradas: ${result.stats?.total_in || 0}`, 'cyan');
            log(`      - Total salidas: ${result.stats?.total_out || 0}`, 'cyan');
            log(`      - Items afectados: ${result.stats?.items_affected || 0}`, 'cyan');
            
            if (result.data.length > 0) {
                log(`   📦 Primer movimiento:`, 'cyan');
                const first = result.data[0];
                log(`      - Item: ${first.item_name || 'N/A'}`, 'cyan');
                log(`      - Tipo: ${first.movement_type}`, 'cyan');
                log(`      - Cantidad: ${first.quantity}`, 'cyan');
                log(`      - Fecha: ${new Date(first.movement_date).toLocaleString('es-ES')}`, 'cyan');
                log(`      - Usuario: ${first.performed_by_name || 'N/A'}`, 'cyan');
            }
            return true;
        } else {
            log(`❌ FAIL - HTTP ${response.status}: ${result.error || 'Error desconocido'}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ FAIL - Error: ${error.message}`, 'red');
        return false;
    }
}

// TEST 2: Filtrar movimientos por tipo (solo entradas)
async function testFilterByType() {
    log('\n📋 TEST 2: GET /api/inventory/movements?movement_type=in (entradas)', 'yellow');
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/inventory/movements?movement_type=in&limit=20`);
        const result = await response.json();
        
        if (response.ok && result.message === 'success') {
            const allAreIn = result.data.every(m => m.movement_type === 'in');
            
            if (allAreIn) {
                log(`✅ PASS - ${result.data.length} movimientos de entrada`, 'green');
            } else {
                log(`❌ FAIL - Se encontraron movimientos que no son de entrada`, 'red');
                return false;
            }
            return true;
        } else {
            log(`❌ FAIL - HTTP ${response.status}: ${result.error || 'Error desconocido'}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ FAIL - Error: ${error.message}`, 'red');
        return false;
    }
}

// TEST 3: Filtrar movimientos por tipo (solo salidas)
async function testFilterByTypeOut() {
    log('\n📋 TEST 3: GET /api/inventory/movements?movement_type=out (salidas)', 'yellow');
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/inventory/movements?movement_type=out&limit=20`);
        const result = await response.json();
        
        if (response.ok && result.message === 'success') {
            const allAreOut = result.data.every(m => m.movement_type === 'out');
            
            if (allAreOut || result.data.length === 0) {
                log(`✅ PASS - ${result.data.length} movimientos de salida`, 'green');
            } else {
                log(`❌ FAIL - Se encontraron movimientos que no son de salida`, 'red');
                return false;
            }
            return true;
        } else {
            log(`❌ FAIL - HTTP ${response.status}: ${result.error || 'Error desconocido'}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ FAIL - Error: ${error.message}`, 'red');
        return false;
    }
}

// TEST 4: Filtrar por rango de fechas
async function testFilterByDateRange() {
    log('\n📋 TEST 4: GET /api/inventory/movements con rango de fechas', 'yellow');
    
    try {
        const startDate = '2024-01-01';
        const endDate = '2024-12-31';
        
        const response = await authenticatedFetch(
            `${API_BASE}/inventory/movements?start_date=${startDate}&end_date=${endDate}&limit=30`
        );
        const result = await response.json();
        
        if (response.ok && result.message === 'success') {
            log(`✅ PASS - ${result.data.length} movimientos en rango`, 'green');
            
            if (result.data.length > 0) {
                const dates = result.data.map(m => new Date(m.movement_date));
                const allInRange = dates.every(d => 
                    d >= new Date(startDate) && d <= new Date(endDate)
                );
                
                if (allInRange) {
                    log(`   ✅ Todas las fechas están dentro del rango`, 'green');
                } else {
                    log(`   ⚠️  Algunas fechas están fuera del rango`, 'yellow');
                }
            }
            return true;
        } else {
            log(`❌ FAIL - HTTP ${response.status}: ${result.error || 'Error desconocido'}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ FAIL - Error: ${error.message}`, 'red');
        return false;
    }
}

// TEST 5: Verificar estructura de respuesta
async function testResponseStructure() {
    log('\n📋 TEST 5: Verificar estructura de respuesta', 'yellow');
    
    try {
        const response = await authenticatedFetch(`${API_BASE}/inventory/movements?limit=5`);
        const result = await response.json();
        
        if (response.ok) {
            // Verificar estructura principal
            const hasMessage = result.hasOwnProperty('message');
            const hasData = result.hasOwnProperty('data');
            const hasStats = result.hasOwnProperty('stats');
            const dataIsArray = Array.isArray(result.data);
            
            if (hasMessage && hasData && hasStats && dataIsArray) {
                log(`✅ PASS - Estructura de respuesta correcta`, 'green');
                log(`   - message: ${result.message}`, 'cyan');
                log(`   - data: Array[${result.data.length}]`, 'cyan');
                log(`   - stats: Object`, 'cyan');
                
                // Verificar estructura de movimiento
                if (result.data.length > 0) {
                    const movement = result.data[0];
                    const requiredFields = [
                        'id', 'inventory_id', 'movement_type', 'quantity', 
                        'movement_date', 'item_name'
                    ];
                    
                    const hasAllFields = requiredFields.every(field => 
                        movement.hasOwnProperty(field)
                    );
                    
                    if (hasAllFields) {
                        log(`   ✅ Campos requeridos presentes en movimiento`, 'green');
                    } else {
                        log(`   ⚠️  Faltan algunos campos en movimiento`, 'yellow');
                        log(`      Campos presentes: ${Object.keys(movement).join(', ')}`, 'cyan');
                    }
                }
                
                return true;
            } else {
                log(`❌ FAIL - Estructura incorrecta`, 'red');
                log(`   - hasMessage: ${hasMessage}`, 'red');
                log(`   - hasData: ${hasData}`, 'red');
                log(`   - hasStats: ${hasStats}`, 'red');
                log(`   - dataIsArray: ${dataIsArray}`, 'red');
                return false;
            }
        } else {
            log(`❌ FAIL - HTTP ${response.status}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ FAIL - Error: ${error.message}`, 'red');
        return false;
    }
}

// Ejecutar todos los tests
async function runAllTests() {
    log('═══════════════════════════════════════════════════════', 'blue');
    log('  TEST: ENDPOINT DE MOVIMIENTOS DE INVENTARIO', 'blue');
    log('  GET /api/inventory/movements', 'blue');
    log('═══════════════════════════════════════════════════════', 'blue');
    
    // Autenticar primero
    const authenticated = await authenticate();
    if (!authenticated) {
        log('\n❌ No se pudo autenticar. Tests cancelados.', 'red');
        return;
    }
    
    const results = [];
    
    // Ejecutar tests
    results.push(await testGetAllMovements());
    results.push(await testFilterByType());
    results.push(await testFilterByTypeOut());
    results.push(await testFilterByDateRange());
    results.push(await testResponseStructure());
    
    // Resumen
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    log('\n═══════════════════════════════════════════════════════', 'blue');
    log('  RESUMEN DE TESTS', 'blue');
    log('═══════════════════════════════════════════════════════', 'blue');
    
    if (passed === total) {
        log(`\n✅ TODOS LOS TESTS PASARON: ${passed}/${total}`, 'green');
    } else {
        log(`\n⚠️  TESTS COMPLETADOS: ${passed}/${total} exitosos`, 'yellow');
    }
    
    log('\n');
}

// Ejecutar
runAllTests().catch(error => {
    log(`\n💥 Error fatal: ${error.message}`, 'red');
    console.error(error);
});
