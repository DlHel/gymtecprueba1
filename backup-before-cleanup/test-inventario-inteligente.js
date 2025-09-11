// Script de prueba para verificar la integración del Tab Inteligente
// Ejecutar en la consola del navegador en http://localhost:8080/inventario.html

console.log('🧪 PRUEBA DE INTEGRACIÓN - TAB INTELIGENTE');
console.log('==========================================');

// Verificar que InventoryManager existe
if (typeof window.inventoryManager === 'undefined') {
    console.error('❌ ERROR: InventoryManager no está disponible');
} else {
    console.log('✅ InventoryManager cargado correctamente');
}

// Verificar que el tab inteligente existe en el DOM
const inteligenteTab = document.querySelector('[data-tab="inteligente"]');
if (!inteligenteTab) {
    console.error('❌ ERROR: Tab "Inventario Inteligente" no encontrado');
} else {
    console.log('✅ Tab "Inventario Inteligente" encontrado en el DOM');
}

// Verificar que las sub-pestañas existen
const subTabs = document.querySelectorAll('.sub-tab-button');
if (subTabs.length === 0) {
    console.error('❌ ERROR: No se encontraron sub-pestañas');
} else {
    console.log(`✅ ${subTabs.length} sub-pestañas encontradas`);
}

// Verificar que los métodos del tab inteligente existen
const methodsToCheck = [
    'switchSubTab',
    'loadInteligenteData',
    'loadDashboardStats',
    'renderDashboard',
    'loadProductsData',
    'renderProducts',
    'loadCategories',
    'renderCategories',
    'loadSuppliers',
    'renderSuppliers',
    'loadAnalyticsData',
    'renderAnalytics'
];

let methodsFound = 0;
methodsToCheck.forEach(method => {
    if (typeof window.inventoryManager[method] === 'function') {
        methodsFound++;
    } else {
        console.error(`❌ ERROR: Método ${method} no encontrado`);
    }
});

console.log(`✅ ${methodsFound}/${methodsToCheck.length} métodos del tab inteligente encontrados`);

// Verificar que authenticatedFetch esté disponible
if (typeof authenticatedFetch === 'undefined') {
    console.error('❌ ERROR: authenticatedFetch no está disponible');
} else {
    console.log('✅ authenticatedFetch disponible para llamadas API');
}

// Verificar estructura de datos
if (window.inventoryManager.data.analytics) {
    console.log('✅ Estructura de datos de analytics inicializada');
} else {
    console.error('❌ ERROR: Estructura de datos de analytics no inicializada');
}

console.log('');
console.log('🎯 INSTRUCCIONES DE PRUEBA MANUAL:');
console.log('1. Haz clic en el tab "Inventario Inteligente"');
console.log('2. Verifica que se muestren las sub-pestañas: Dashboard, Productos, Categorías, Proveedores, Analytics');
console.log('3. Haz clic en cada sub-pestaña y verifica que se cargue el contenido correspondiente');
console.log('4. Verifica que no haya errores en la consola del navegador');
console.log('5. Verifica que se realicen llamadas a la API (revisa Network tab)');

console.log('');
console.log('✅ PRUEBA COMPLETADA - Revisa los resultados arriba');
