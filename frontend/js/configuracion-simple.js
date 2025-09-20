/**
 * Configuración SIMPLE - Debug Version
 * Versión simplificada para diagnosticar problemas
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 CONFIGURACIÓN SIMPLE: Iniciando...');
    
    // Test básico de autenticación
    console.log('Test 1: window.authManager existe?', !!window.authManager);
    
    if (!window.authManager) {
        console.log('❌ Redirigiendo por falta de authManager');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    console.log('Test 2: isAuthenticated?', window.authManager.isAuthenticated());
    
    if (!window.authManager.isAuthenticated()) {
        console.log('❌ Redirigiendo por no autenticado');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    console.log('✅ AUTENTICACIÓN EXITOSA - Cargando configuración...');
    
    // Mostrar mensaje de éxito en la página
    setTimeout(() => {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px; border-radius: 5px; z-index: 9999;';
        successDiv.textContent = '✅ Configuración cargada correctamente!';
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }, 500);
    
    // Resto de la lógica original de configuración...
    console.log('📋 Configuración completamente iniciada');
});