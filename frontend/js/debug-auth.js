/**
 * Debug de Autenticación - Gymtec ERP
 * Script específico para diagnosticar problemas de autenticación
 */

console.log('🔍 DEBUG AUTH: Iniciando diagnóstico de autenticación...');

// Función para revisar el estado completo de autenticación
function debugAuthState() {
    console.log('\n=== ESTADO DE AUTENTICACIÓN ===');
    
    // 1. Verificar localStorage
    const token = localStorage.getItem('gymtec_token');
    const user = localStorage.getItem('gymtec_user');
    const remember = localStorage.getItem('gymtec_remember');
    
    console.log('📦 LocalStorage:');
    console.log('  - Token:', token ? '✅ Presente' : '❌ Ausente');
    console.log('  - User:', user ? '✅ Presente' : '❌ Ausente');
    console.log('  - Remember:', remember ? '✅ Presente' : '❌ Ausente');
    
    if (token) {
        console.log('  - Token length:', token.length);
        console.log('  - Token preview:', token.substring(0, 20) + '...');
    }
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('  - User data:', userData);
        } catch (e) {
            console.log('  - User data ERROR:', e.message);
        }
    }
    
    // 2. Verificar AuthManager
    console.log('\n🔐 AuthManager:');
    if (window.AuthManager) {
        console.log('  - AuthManager:', '✅ Disponible');
        console.log('  - isAuthenticated():', window.AuthManager.isAuthenticated());
        console.log('  - getToken():', window.AuthManager.getToken() ? '✅ Token válido' : '❌ Sin token');
        console.log('  - getUser():', window.AuthManager.getUser());
    } else {
        console.log('  - AuthManager:', '❌ NO disponible');
    }
    
    // 3. Verificar página actual
    console.log('\n📄 Página actual:');
    console.log('  - URL:', window.location.href);
    console.log('  - Pathname:', window.location.pathname);
    console.log('  - Es login?:', window.location.pathname.includes('login'));
    console.log('  - Es dashboard?:', window.location.pathname.includes('dashboard') || window.location.pathname === '/');
    
    return {
        hasToken: !!token,
        hasUser: !!user,
        authManagerReady: !!window.AuthManager,
        isAuthenticated: window.AuthManager ? window.AuthManager.isAuthenticated() : false
    };
}

// Función para limpiar autenticación
function clearAuth() {
    console.log('🧹 Limpiando autenticación...');
    localStorage.removeItem('gymtec_token');
    localStorage.removeItem('gymtec_user');
    localStorage.removeItem('gymtec_remember');
    console.log('✅ Autenticación limpiada');
}

// Función para simular login (solo para debug)
function mockLogin() {
    console.log('🎭 Simulando login...');
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTYzNzE2MjQwMCwiZXhwIjoxNjM3MjQ4ODAwfQ.test';
    const mockUser = JSON.stringify({
        id: 1,
        username: 'admin',
        role: 'Admin',
        name: 'Felipe Maturana'
    });
    
    localStorage.setItem('gymtec_token', mockToken);
    localStorage.setItem('gymtec_user', mockUser);
    console.log('✅ Login simulado completado');
    debugAuthState();
}

// Función para verificar token con servidor
async function verifyTokenWithServer() {
    console.log('🌐 Verificando token con servidor...');
    
    const token = localStorage.getItem('gymtec_token');
    if (!token) {
        console.log('❌ No hay token para verificar');
        return false;
    }
    
    try {
        const response = await fetch(`${window.API_URL || 'http://localhost:3000/api'}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Respuesta del servidor:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Token válido:', data);
            return true;
        } else {
            const error = await response.text();
            console.log('❌ Token inválido:', error);
            return false;
        }
    } catch (error) {
        console.log('❌ Error al verificar token:', error.message);
        return false;
    }
}

// Función principal de debug
function debugAuth() {
    console.log('🚀 INICIANDO DEBUG DE AUTENTICACIÓN');
    const state = debugAuthState();
    
    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    
    if (!state.hasToken) {
        console.log('  1. ❌ No tienes token - necesitas hacer login');
    }
    
    if (!state.authManagerReady) {
        console.log('  2. ❌ AuthManager no está cargado - verifica que auth.js esté incluido');
    }
    
    if (state.hasToken && !state.isAuthenticated) {
        console.log('  3. ⚠️ Tienes token pero AuthManager dice que no estás autenticado');
    }
    
    if (state.hasToken && state.isAuthenticated) {
        console.log('  4. ✅ Todo parece estar bien - verificando con servidor...');
        verifyTokenWithServer();
    }
    
    return state;
}

// Exportar funciones para uso en consola
window.debugAuth = debugAuth;
window.debugAuthState = debugAuthState;
window.clearAuth = clearAuth;
window.mockLogin = mockLogin;
window.verifyTokenWithServer = verifyTokenWithServer;

// Auto-ejecutar debug
setTimeout(() => {
    console.log('🔍 Auto-ejecutando debug de autenticación...');
    debugAuth();
}, 1000);

console.log('✅ Debug Auth cargado - Funciones disponibles:');
console.log('  - debugAuth() - Diagnóstico completo');
console.log('  - clearAuth() - Limpiar autenticación');
console.log('  - mockLogin() - Simular login para testing');
console.log('  - verifyTokenWithServer() - Verificar token con backend');
