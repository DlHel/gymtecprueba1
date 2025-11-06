// Test del Módulo de Asistencia - Gymtec ERP v3.2.1
// Ejecutar este script en la consola del navegador (F12) cuando estés en asistencia.html

console.log('🧪 INICIANDO PRUEBAS DEL MÓDULO DE ASISTENCIA...');
console.log('');

// Test 1: Verificar que window.authManager existe
console.log('1️⃣ Verificando window.authManager...');
if (window.authManager) {
    console.log('   ✅ window.authManager existe');
} else {
    console.error('   ❌ window.authManager NO existe');
}

// Test 2: Verificar métodos del AuthManager
console.log('');
console.log('2️⃣ Verificando métodos del AuthManager...');
const requiredMethods = [
    'getUser',
    'getToken',
    'isAuthenticated',
    'authenticatedFetch',
    'hasRole',
    'isAdmin'
];

requiredMethods.forEach(method => {
    if (typeof window.authManager[method] === 'function') {
        console.log(`   ✅ authManager.${method}() existe`);
    } else {
        console.error(`   ❌ authManager.${method}() NO existe`);
    }
});

// Test 3: Verificar usuario autenticado
console.log('');
console.log('3️⃣ Verificando autenticación...');
const isAuth = window.authManager.isAuthenticated();
console.log(`   ${isAuth ? '✅' : '❌'} Usuario autenticado: ${isAuth}`);

if (isAuth) {
    const user = window.authManager.getUser();
    console.log(`   ✅ Usuario: ${user?.username || 'N/A'}`);
    console.log(`   ✅ Rol: ${user?.role || 'N/A'}`);
    console.log(`   ✅ ID: ${user?.id || 'N/A'}`);
}

// Test 4: Verificar API_URL
console.log('');
console.log('4️⃣ Verificando configuración...');
if (window.API_URL) {
    console.log(`   ✅ API_URL configurada: ${window.API_URL}`);
} else {
    console.error('   ❌ API_URL NO configurada');
}

// Test 5: Test de llamada API (solo si está autenticado)
console.log('');
console.log('5️⃣ Test de llamada API...');
if (isAuth && window.API_URL) {
    console.log('   🔄 Intentando llamada a /attendance/today...');
    
    window.authManager.authenticatedFetch(`${window.API_URL}/attendance/today`)
        .then(response => {
            console.log(`   ✅ Respuesta del servidor: ${response.status} ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            console.log('   ✅ Datos recibidos:', data);
        })
        .catch(error => {
            console.error('   ❌ Error en llamada API:', error.message);
        });
} else {
    console.log('   ⚠️ Saltando test (no autenticado o sin API_URL)');
}

// Test 6: Verificar elementos DOM del módulo
console.log('');
console.log('6️⃣ Verificando elementos DOM...');
const criticalElements = {
    'clock-display': 'Reloj',
    'check-in-btn': 'Botón Check-in',
    'check-out-btn': 'Botón Check-out',
    'attendance-tab': 'Tab Asistencia',
    'history-tab': 'Tab Historial'
};

Object.entries(criticalElements).forEach(([id, name]) => {
    const element = document.getElementById(id);
    if (element) {
        console.log(`   ✅ ${name} encontrado`);
    } else {
        console.warn(`   ⚠️ ${name} no encontrado`);
    }
});

// Resumen Final
console.log('');
console.log('═══════════════════════════════════════════');
console.log('📊 RESUMEN DE PRUEBAS');
console.log('═══════════════════════════════════════════');
console.log('');

let passedTests = 0;
let totalTests = 6;

if (window.authManager) passedTests++;
if (window.authManager && typeof window.authManager.getUser === 'function') passedTests++;
if (isAuth) passedTests++;
if (window.API_URL) passedTests++;
// Test API se cuenta aparte
if (document.getElementById('check-in-btn')) passedTests++;

console.log(`Tests pasados: ${passedTests}/${totalTests}`);
console.log('');

if (passedTests === totalTests) {
    console.log('✅ TODOS LOS TESTS PASARON - MÓDULO FUNCIONAL');
} else {
    console.log('⚠️ ALGUNOS TESTS FALLARON - REVISAR PROBLEMAS');
}

console.log('');
console.log('═══════════════════════════════════════════');
console.log('');
console.log('💡 Para ejecutar tests adicionales:');
console.log('   - Test check-in: Hacer clic en botón "Marcar Entrada"');
console.log('   - Test check-out: Hacer clic en botón "Marcar Salida"');
console.log('   - Test historial: Cambiar a tab "Historial"');
console.log('');
