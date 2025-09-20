// fix-frontend-auth.js - Script para corregir la autenticación del frontend
// Ejecutar desde la consola del navegador o incluir en una página

console.log('🔧 CORRECCIÓN DE AUTENTICACIÓN FRONTEND');
console.log('=====================================');

// Token válido generado con el secret correcto
const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZ3ltdGVjLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1ODM5NzgxMSwiZXhwIjoxNzU4NDg0MjExfQ.hJm1I30SqjJlrQBLGW7gzlhWCQQGKKhZhN7KVnN3F4I';

// Datos del usuario admin
const adminUser = {
    id: 1,
    username: 'admin',
    email: 'admin@gymtec.com',
    role: 'Admin'
};

// 1. Limpiar localStorage
console.log('1. 🧹 Limpiando localStorage...');
localStorage.removeItem('gymtec_token');
localStorage.removeItem('gymtec_user');
localStorage.removeItem('gymtec_remember');

// 2. Establecer token válido
console.log('2. 🔑 Estableciendo token válido...');
localStorage.setItem('gymtec_token', validToken);
localStorage.setItem('gymtec_user', JSON.stringify(adminUser));

// 3. Verificar
console.log('3. ✅ Verificando configuración...');
const storedToken = localStorage.getItem('gymtec_token');
const storedUser = localStorage.getItem('gymtec_user');

if (storedToken && storedUser) {
    console.log('   ✅ Token configurado correctamente');
    console.log('   ✅ Usuario configurado correctamente');
    console.log('   👤 Usuario:', JSON.parse(storedUser));
    
    // Verificar expiración del token
    try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        console.log('   ⏰ Token expira:', expDate.toLocaleString());
        console.log('   ⏰ Válido por:', Math.round((expDate - now) / (1000 * 60 * 60)), 'horas');
    } catch (error) {
        console.log('   ⚠️ Error verificando expiración:', error.message);
    }
    
    console.log('\n🎉 ¡Autenticación configurada correctamente!');
    console.log('🔄 Recarga la página personal.html para que funcione');
    
} else {
    console.log('   ❌ Error configurando autenticación');
}

console.log('=====================================');