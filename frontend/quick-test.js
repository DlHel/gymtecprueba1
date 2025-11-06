console.clear();
console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 PRUEBA RÁPIDA - SISTEMA DE INFORMES TÉCNICOS');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Verificación básica
console.log('📋 Verificando componentes...');
console.log('');

// 1. Config
if (typeof window.API_URL !== 'undefined') {
    console.log('✅ API_URL: ' + window.API_URL);
} else {
    console.log('❌ API_URL no disponible');
}

// 2. Auth
if (typeof window.authManager !== 'undefined') {
    console.log('✅ AuthManager disponible');
    if (window.authManager.isAuthenticated && window.authManager.isAuthenticated()) {
        console.log('✅ Usuario autenticado');
    } else {
        console.log('⚠️ No autenticado - Necesitas iniciar sesión primero');
    }
} else {
    console.log('❌ AuthManager no disponible');
}

// 3. ReportsManager
if (typeof window.reportsManager !== 'undefined') {
    console.log('✅ ReportsManager disponible');
    
    // Verificar función de informe
    if (typeof window.reportsManager.generateInformeTecnico === 'function') {
        console.log('✅ Función generateInformeTecnico disponible');
    } else {
        console.log('❌ Función generateInformeTecnico NO disponible');
    }
} else {
    console.log('❌ ReportsManager no disponible');
    console.log('   💡 Asegúrate de estar en /reportes.html');
}

// 4. jsPDF
if (typeof window.jspdf !== 'undefined') {
    console.log('✅ jsPDF disponible');
} else {
    console.log('⚠️ jsPDF no disponible (se cargará desde CDN)');
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

if (window.authManager && window.authManager.isAuthenticated && window.authManager.isAuthenticated()) {
    console.log('🚀 Para probar el sistema, ejecuta:');
    console.log('');
    console.log('// Primero obtén un ticket completado');
    console.log('fetch(window.API_URL + "/tickets")');
    console.log('  .then(r => r.json())');
    console.log('  .then(d => {');
    console.log('    const completed = d.data.filter(t => t.status === "completed" || t.status === "Resuelto");');
    console.log('    console.log("Tickets completados:", completed.length);');
    console.log('    if (completed.length > 0) {');
    console.log('      console.log("Para generar informe:");');
    console.log('      console.log("window.reportsManager.generateInformeTecnico(" + completed[0].id + ")");');
    console.log('    }');
    console.log('  });');
    console.log('');
} else {
    console.log('⚠️ Debes iniciar sesión primero');
    console.log('');
    console.log('Ve a: http://localhost:8080/login.html');
}

console.log('═══════════════════════════════════════════════════════════');
