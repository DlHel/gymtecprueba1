/**
 * Script de Testing Manual - Flujo de Autenticación en Inventario
 * Ejecutar en la consola del navegador
 */

console.log('🧪 === INICIANDO TEST DE AUTENTICACIÓN INVENTARIO ===');

// Test 1: Verificar que authManager existe
console.log('\n📋 Test 1: Verificar authManager');
if (window.authManager) {
    console.log('✅ window.authManager existe');
    console.log('   - isAuthenticated:', typeof window.authManager.isAuthenticated);
    console.log('   - redirectToLogin:', typeof window.authManager.redirectToLogin);
    console.log('   - getToken:', typeof window.authManager.getToken);
} else {
    console.error('❌ window.authManager NO existe');
}

// Test 2: Verificar estado de autenticación
console.log('\n📋 Test 2: Estado de autenticación');
if (window.authManager) {
    const isAuth = window.authManager.isAuthenticated();
    const token = window.authManager.getToken();
    const user = window.authManager.getUser();
    
    console.log('   - isAuthenticated():', isAuth);
    console.log('   - Token presente:', !!token);
    console.log('   - Usuario:', user?.username || 'N/A');
    
    if (isAuth) {
        console.log('✅ Usuario ESTÁ autenticado');
    } else {
        console.log('⚠️ Usuario NO está autenticado');
    }
}

// Test 3: Verificar URL actual y parámetros
console.log('\n📋 Test 3: URL y parámetros');
console.log('   - pathname:', window.location.pathname);
console.log('   - search:', window.location.search);
console.log('   - href:', window.location.href);

const urlParams = new URLSearchParams(window.location.search);
const returnUrl = urlParams.get('return');
console.log('   - returnUrl param:', returnUrl);

// Test 4: Simular flujo de redirección (sin ejecutar)
console.log('\n📋 Test 4: Simular redirectToLogin()');
if (window.authManager && typeof window.authManager.redirectToLogin === 'function') {
    const currentPage = window.location.pathname;
    const mockReturnUrl = encodeURIComponent(currentPage + window.location.search);
    const mockRedirectUrl = `login.html?return=${mockReturnUrl}`;
    
    console.log('   - Desde:', currentPage);
    console.log('   - returnUrl codificado:', mockReturnUrl);
    console.log('   - URL de redirección:', mockRedirectUrl);
    console.log('✅ redirectToLogin está disponible');
}

// Test 5: Verificar inventoryManager
console.log('\n📋 Test 5: Verificar inventoryManager');
if (window.inventoryManager) {
    console.log('✅ window.inventoryManager existe');
    console.log('   - Tipo:', typeof window.inventoryManager);
} else {
    console.log('⚠️ window.inventoryManager NO existe (puede ser normal si no está autenticado)');
}

// Test 6: Verificar localStorage
console.log('\n📋 Test 6: Estado de localStorage');
const tokenKey = 'gymtec_token';
const userKey = 'gymtec_user';
const localToken = localStorage.getItem(tokenKey);
const localUser = localStorage.getItem(userKey);

console.log('   - gymtec_token:', localToken ? '✅ Presente' : '❌ Ausente');
console.log('   - gymtec_user:', localUser ? '✅ Presente' : '❌ Ausente');

if (localUser) {
    try {
        const userData = JSON.parse(localUser);
        console.log('   - Usuario:', userData.username);
        console.log('   - Rol:', userData.role);
    } catch (e) {
        console.error('   - Error parseando usuario:', e.message);
    }
}

console.log('\n🧪 === FIN DEL TEST ===\n');

// Resumen
console.log('📊 RESUMEN:');
const authOK = window.authManager && window.authManager.isAuthenticated();
const tokenOK = !!localStorage.getItem(tokenKey);
const managerOK = !!window.authManager;

if (authOK && tokenOK && managerOK) {
    console.log('✅ TODOS LOS CHECKS PASARON - Debería funcionar correctamente');
} else {
    console.log('⚠️ PROBLEMAS DETECTADOS:');
    if (!managerOK) console.log('   - authManager no está disponible');
    if (!tokenOK) console.log('   - No hay token en localStorage');
    if (!authOK) console.log('   - Usuario no está autenticado');
}
