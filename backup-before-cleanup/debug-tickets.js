/**
 * DEBUG ESPECÍFICO PARA TICKETS - Gymtec ERP
 * Script para depurar problemas de autenticación en tickets.html
 */

console.log('🔍 DEBUG TICKETS: Script cargado');

// Función para verificar el estado de autenticación paso a paso
function debugAuthState() {
    console.log('🔍 DEBUG TICKETS: Verificando estado de autenticación...');
    
    // 1. Verificar si AuthManager existe
    if (!window.AuthManager) {
        console.error('❌ DEBUG TICKETS: AuthManager no está disponible');
        return false;
    }
    console.log('✅ DEBUG TICKETS: AuthManager está disponible');
    
    // 2. Verificar token en localStorage
    const token = localStorage.getItem('gymtec_token');
    if (!token) {
        console.error('❌ DEBUG TICKETS: No hay token en localStorage');
        return false;
    }
    console.log('✅ DEBUG TICKETS: Token encontrado:', token.substring(0, 20) + '...');
    
    // 3. Verificar datos de usuario
    const userData = localStorage.getItem('gymtec_user');
    if (!userData) {
        console.warn('⚠️ DEBUG TICKETS: No hay datos de usuario');
    } else {
        try {
            const user = JSON.parse(userData);
            console.log('✅ DEBUG TICKETS: Usuario encontrado:', user.username, 'Rol:', user.role);
        } catch (e) {
            console.error('❌ DEBUG TICKETS: Error parsing datos de usuario:', e);
        }
    }
    
    // 4. Verificar isAuthenticated()
    const isAuth = AuthManager.isAuthenticated();
    console.log('🔐 DEBUG TICKETS: isAuthenticated():', isAuth);
    
    // 5. Verificar API_URL
    console.log('🌐 DEBUG TICKETS: API_URL:', window.API_URL);
    
    return isAuth;
}

// Función para probar el endpoint de verificación
async function testAuthEndpoint() {
    console.log('🔍 DEBUG TICKETS: Probando endpoint de verificación...');
    
    try {
        const response = await fetch(`${window.API_URL}/auth/verify`, {
            headers: AuthManager.getAuthHeaders()
        });
        
        console.log('📡 DEBUG TICKETS: Respuesta del servidor:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ DEBUG TICKETS: Token válido, datos:', data);
            return true;
        } else {
            console.error('❌ DEBUG TICKETS: Token inválido o expirado');
            return false;
        }
    } catch (error) {
        console.error('❌ DEBUG TICKETS: Error de conexión:', error);
        return false;
    }
}

// Interceptar redirecciones para debug
const originalAssign = window.location.assign;
const originalReplace = window.location.replace;

Object.defineProperty(window.location, 'href', {
    set: function(url) {
        console.log('🚨 DEBUG TICKETS: Redirección interceptada:', url);
        console.log('🚨 DEBUG TICKETS: Desde página:', window.location.pathname);
        console.trace('🚨 DEBUG TICKETS: Stack trace de redirección');
        
        // Si es una redirección a login desde tickets, hacer debug completo
        if (url.includes('login.html') && window.location.pathname.includes('tickets.html')) {
            console.log('🚨 DEBUG TICKETS: REDIRECCIÓN TICKETS -> LOGIN DETECTADA');
            debugAuthState();
        }
        
        // Continuar con la redirección original
        window.location.assign(url);
    },
    get: function() {
        return document.location.href;
    }
});

// Ejecutar debug cuando la página se carga
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 DEBUG TICKETS: Página cargada, ejecutando debug...');
    
    setTimeout(() => {
        const authOk = debugAuthState();
        
        if (authOk) {
            console.log('✅ DEBUG TICKETS: Autenticación OK, probando endpoint...');
            testAuthEndpoint().then(endpointOk => {
                if (endpointOk) {
                    console.log('✅ DEBUG TICKETS: Todo OK, no debería haber redirección');
                } else {
                    console.log('❌ DEBUG TICKETS: Endpoint falló, redirección justificada');
                }
            });
        } else {
            console.log('❌ DEBUG TICKETS: Autenticación falló, redirección esperada');
        }
    }, 500);
});

// Función global para debug manual
window.debugTicketsAuth = debugAuthState;
window.testTicketsAuth = testAuthEndpoint;

console.log('🔍 DEBUG TICKETS: Funciones globales disponibles: debugTicketsAuth(), testTicketsAuth()');
