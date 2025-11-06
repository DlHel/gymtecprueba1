// Test de Diagnóstico del Dashboard - Gymtec ERP
// Ejecutar este script en la consola del navegador (F12) cuando estés en index.html

console.log('🧪 DIAGNÓSTICO DEL DASHBOARD...');
console.log('');

// Test 1: Verificar que estamos en la página correcta
console.log('1️⃣ Página actual:');
console.log('   ', window.location.pathname);
console.log('');

// Test 2: Verificar window.API_URL
console.log('2️⃣ Configuración API:');
if (window.API_URL) {
    console.log('   ✅ API_URL definido:', window.API_URL);
} else {
    console.error('   ❌ API_URL NO definido');
}
console.log('');

// Test 3: Verificar authManager
console.log('3️⃣ Autenticación:');
if (window.authManager) {
    console.log('   ✅ authManager existe');
    console.log('   Autenticado:', window.authManager.isAuthenticated());
    if (window.authManager.isAuthenticated()) {
        const user = window.authManager.getUser();
        console.log('   Usuario:', user?.username);
        console.log('   Rol:', user?.role);
    }
} else {
    console.error('   ❌ authManager NO existe');
}
console.log('');

// Test 4: Verificar dashboardManager
console.log('4️⃣ Dashboard Manager:');
if (window.dashboardManager) {
    console.log('   ✅ dashboardManager existe');
    console.log('   KPIs:', Object.keys(window.dashboardManager.kpis || {}).length, 'cargados');
} else {
    console.error('   ❌ dashboardManager NO existe');
}
console.log('');

// Test 5: Verificar elementos DOM
console.log('5️⃣ Elementos DOM del Dashboard:');
const elements = {
    'kpi-container': 'Contenedor de KPIs',
    'critical-alerts-container': 'Alertas Críticas',
    'recent-activity-container': 'Actividad Reciente',
    'error-container': 'Contenedor de Errores'
};

Object.entries(elements).forEach(([id, name]) => {
    const el = document.getElementById(id);
    if (el) {
        console.log(`   ✅ ${name} encontrado`);
    } else {
        console.warn(`   ⚠️ ${name} no encontrado`);
    }
});
console.log('');

// Test 6: Intentar cargar KPIs manualmente
console.log('6️⃣ Test de API - Cargando KPIs...');
if (window.authManager && window.API_URL) {
    window.authManager.authenticatedFetch(`${window.API_URL}/dashboard/kpis-enhanced`)
        .then(response => {
            console.log('   ✅ Respuesta:', response.status, response.statusText);
            return response.json();
        })
        .then(data => {
            console.log('   ✅ Datos recibidos:', data);
            if (data.message === 'success') {
                console.log('   ✅ KPIs disponibles:', Object.keys(data.data || {}));
            } else {
                console.error('   ❌ Respuesta sin éxito:', data);
            }
        })
        .catch(error => {
            console.error('   ❌ Error en API:', error);
        });
} else {
    console.log('   ⚠️ Saltando test (falta authManager o API_URL)');
}

console.log('');
console.log('═══════════════════════════════════════════');
console.log('📋 FIN DEL DIAGNÓSTICO');
console.log('═══════════════════════════════════════════');
console.log('');
console.log('💡 Si hay errores:');
console.log('   1. Verificar que el backend esté corriendo (http://localhost:3000)');
console.log('   2. Hacer login si no estás autenticado');
console.log('   3. Revisar la consola Network (F12) para ver llamadas fallidas');
console.log('   4. Forzar recarga sin caché: Ctrl+Shift+R');
