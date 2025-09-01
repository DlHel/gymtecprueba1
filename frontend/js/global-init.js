// ===============================================
// GYMTEC ERP - INICIALIZACIÓN GLOBAL
// ===============================================
// Este script debe cargarse ANTES que cualquier otro
// para asegurar que las funciones básicas estén disponibles

console.log('🚀 GYMTEC: Inicializando sistema...');

// Verificar que la configuración básica esté disponible
if (typeof API_URL === 'undefined') {
    console.error('❌ GYMTEC: API_URL no está definido. Asegúrate de que config.js se cargue antes.');
}

if (typeof AuthManager === 'undefined') {
    console.error('❌ GYMTEC: AuthManager no está definido. Asegúrate de que auth.js se cargue antes.');
}

// Función global para manejo de errores de autenticación
window.handleAuthError = function(error, context = '') {
    console.error(`❌ AUTH ERROR [${context}]:`, error);
    
    // Si es un error de token expirado o inválido, limpiar y redireccionar
    if (error.message && (
        error.message.includes('token') || 
        error.message.includes('Sesión expirada') ||
        error.message.includes('401') ||
        error.message.includes('403')
    )) {
        console.log('🔄 AUTH: Limpiando sesión y redirigiendo a login...');
        localStorage.clear();
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
};

// Función global para debug de autenticación
window.debugAuth = function() {
    console.log('🔍 DEBUG AUTH STATE:');
    console.log('- API_URL:', typeof API_URL !== 'undefined' ? API_URL : 'No definido');
    console.log('- AuthManager available:', typeof AuthManager !== 'undefined');
    console.log('- authManager instance:', typeof authManager !== 'undefined');
    
    if (typeof authManager !== 'undefined') {
        console.log('- Token present:', !!authManager.getToken());
        console.log('- User present:', !!authManager.getUser());
        console.log('- Is authenticated:', authManager.isAuthenticated());
        
        const user = authManager.getUser();
        if (user) {
            console.log('- Username:', user.username);
            console.log('- Role:', user.role);
        }
        
        // Mostrar localStorage
        console.log('- LocalStorage items:');
        ['gymtec_token', 'gymtec_user', 'gymtec_remember'].forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`  - ${key}:`, value ? 'Present' : 'Not present');
        });
    }
};

// Función global para limpiar estado de autenticación
window.clearAuthState = function() {
    console.log('🧹 GYMTEC: Limpiando estado de autenticación...');
    
    // Limpiar localStorage
    const keysToRemove = [
        'gymtec_token',
        'gymtec_user', 
        'gymtec_remember',
        'authToken', // Nombres alternativos que podrían existir
        'user',
        'token'
    ];
    
    keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
            console.log(`- Removiendo ${key}`);
            localStorage.removeItem(key);
        }
    });
    
    console.log('✅ Estado de autenticación limpiado');
};

// Manejador global de errores no capturados
window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('auth')) {
        handleAuthError(event.error, 'Global Error Handler');
    }
});

// Manejador global de promesas rechazadas
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('auth') || 
         event.reason.message.includes('token') ||
         event.reason.message.includes('401') ||
         event.reason.message.includes('403'))) {
        handleAuthError(event.reason, 'Unhandled Promise Rejection');
    }
});

// Marcar que la inicialización global está completa
window.GYMTEC_GLOBAL_INITIALIZED = true;

console.log('✅ GYMTEC: Sistema inicializado correctamente');
