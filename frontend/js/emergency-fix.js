// emergency-fix.js - FIX SIMPLE PARA BUCLE DE REDIRECCIÓN
console.log('🚨 SIMPLE FIX: Control básico de redirecciones');

// Contador simple de redirecciones
let redirectCount = 0;
let lastRedirectTime = 0;

// Función simplificada para detectar bucles
function isRedirectLoop() {
    const now = Date.now();
    
    // Reset contador si ha pasado más de 5 segundos
    if (now - lastRedirectTime > 5000) {
        redirectCount = 0;
    }
    
    redirectCount++;
    lastRedirectTime = now;
    
    // Si hay más de 5 redirecciones en 5 segundos, es un bucle
    if (redirectCount > 5) {
        console.log('🛑 BUCLE DETECTADO - Más de 5 redirecciones en 5 segundos');
        return true;
    }
    
    return false;
}

// Guardar método original de redirección
const originalAssign = window.location.assign;

// Interceptar SOLO redirecciones excesivas
window.location.assign = function(url) {
    console.log('🔄 Redirección assign:', url);
    
    if (isRedirectLoop()) {
        console.log('🛑 BUCLE DETECTADO - Bloqueando redirección a:', url);
        console.log('💡 Usar forceRedirect("' + url + '") para forzar');
        return;
    }
    
    return originalAssign.call(this, url);
};

// Funciones de utilidad para debug manual
window.forceRedirect = function(url) {
    console.log('🚀 Forzando redirección a:', url);
    redirectCount = 0; // Reset contador
    window.location.href = url;
};

// Función para debug
window.debugAuth = function() {
    console.log('🔍 DEBUG AUTH:', {
        hasToken: !!localStorage.getItem('gymtec_token'),
        authManagerReady: !!window.AuthManager,
        isAuthenticated: window.AuthManager ? AuthManager.isAuthenticated() : 'N/A',
        currentPage: window.location.pathname,
        redirectCount: redirectCount
    });
};

console.log('✅ Simple redirect fix activado');
console.log('💡 Funciones disponibles: forceRedirect(url), debugAuth()');

// Funciones de utilidad para debug manual
window.forceRedirect = function(url) {
    console.log('� Forzando redirección a:', url);
    redirectHistory = []; // Limpiar historial
    return originalRedirect(url);
};

window.getRedirectHistory = function() {
    return redirectHistory;
};

window.clearRedirectHistory = function() {
    redirectHistory = [];
    console.log('🧹 Historial de redirecciones limpiado');
};

console.log('✅ Smart redirect fix activado');
console.log('💡 Funciones disponibles:');
console.log('  - forceRedirect(url) - Forzar redirección');
console.log('  - getRedirectHistory() - Ver historial');
console.log('  - clearRedirectHistory() - Limpiar historial');
console.log('  - debugAuth() - Diagnosticar autenticación');
