// debug-frontend-auth.js - Script para debuggear autenticación del frontend
// Este script se puede ejecutar en la consola del navegador

console.log('🔍 DIAGNÓSTICO DE AUTENTICACIÓN FRONTEND');
console.log('==========================================');

// 1. Verificar AuthManager
console.log('1. 📋 Verificando AuthManager...');
if (window.AuthManager) {
    console.log('   ✅ AuthManager disponible');
    console.log('   📊 Tipo:', typeof window.AuthManager);
    console.log('   🔧 Métodos disponibles:', Object.getOwnPropertyNames(window.AuthManager));
} else {
    console.log('   ❌ AuthManager NO disponible');
}

// 2. Verificar token en localStorage
console.log('\n2. 🔑 Verificando token...');
const token = localStorage.getItem('gymtec_token');
if (token) {
    console.log('   ✅ Token encontrado');
    console.log('   📏 Longitud:', token.length);
    console.log('   🔤 Primeros 50 caracteres:', token.substring(0, 50) + '...');
    
    // Decodificar token JWT para ver contenido
    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('   📊 Payload del token:', payload);
            
            // Verificar expiración
            if (payload.exp) {
                const expDate = new Date(payload.exp * 1000);
                const now = new Date();
                console.log('   ⏰ Expira:', expDate.toLocaleString());
                console.log('   ⏰ Ahora:', now.toLocaleString());
                console.log('   ⏰ Válido:', now < expDate ? '✅ SÍ' : '❌ NO');
            }
        }
    } catch (error) {
        console.log('   ❌ Error decodificando token:', error.message);
    }
} else {
    console.log('   ❌ Token NO encontrado en localStorage');
}

// 3. Verificar usuario en localStorage
console.log('\n3. 👤 Verificando usuario...');
const user = localStorage.getItem('gymtec_user');
if (user) {
    console.log('   ✅ Usuario encontrado');
    try {
        const userData = JSON.parse(user);
        console.log('   📊 Datos del usuario:', userData);
    } catch (error) {
        console.log('   ❌ Error parseando usuario:', error.message);
    }
} else {
    console.log('   ❌ Usuario NO encontrado en localStorage');
}

// 4. Verificar authenticatedFetch
console.log('\n4. 🌐 Verificando authenticatedFetch...');
if (window.authenticatedFetch) {
    console.log('   ✅ authenticatedFetch disponible');
    console.log('   📊 Tipo:', typeof window.authenticatedFetch);
} else {
    console.log('   ❌ authenticatedFetch NO disponible');
}

// 5. Probar API call con debugger
console.log('\n5. 🧪 Probando llamada API...');
if (window.authenticatedFetch && window.API_URL) {
    window.authenticatedFetch(`${window.API_URL}/users`)
        .then(response => {
            console.log('   📡 Response status:', response.status);
            console.log('   📡 Response headers:', [...response.headers.entries()]);
            return response.json();
        })
        .then(data => {
            console.log('   ✅ API Response:', data);
        })
        .catch(error => {
            console.log('   ❌ API Error:', error.message);
        });
} else {
    console.log('   ❌ No se puede probar API (funciones no disponibles)');
}

console.log('\n✅ Diagnóstico completo');
console.log('==========================================');