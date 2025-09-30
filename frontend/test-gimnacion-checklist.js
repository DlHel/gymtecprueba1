// Test completo del modal de gimnación
console.log('🧪 INICIANDO TEST COMPLETO DEL MODAL DE GIMNACIÓN');

// Función para probar la funcionalidad del checklist
async function testGimnacionChecklistFlow() {
    try {
        console.log('\n=== PASO 1: Verificando autenticación ===');
        
        if (!window.AuthManager || !window.AuthManager.isAuthenticated()) {
            console.error('❌ No hay autenticación válida');
            alert('Debe iniciar sesión primero');
            return;
        }
        
        console.log('✅ Usuario autenticado');
        
        console.log('\n=== PASO 2: Abriendo modal de gimnación ===');
        
        // Buscar y hacer clic en el botón de gimnación
        const gimnacionBtn = document.querySelector('button[onclick="openGimnacionModal()"]');
        if (!gimnacionBtn) {
            console.error('❌ Botón de gimnación no encontrado');
            return;
        }
        
        // Simular clic en el botón
        gimnacionBtn.click();
        
        // Esperar un momento para que el modal se abra
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n=== PASO 3: Verificando elementos del modal ===');
        
        const modal = document.getElementById('gimnacion-modal');
        if (!modal || !modal.classList.contains('is-open')) {
            console.error('❌ Modal de gimnación no está abierto');
            return;
        }
        
        console.log('✅ Modal abierto correctamente');
        
        // Verificar elementos críticos
        const checklistTab = document.querySelector('[data-tab="gimnacion-checklist"]');
        const templateSelect = document.getElementById('checklist-template-select');
        const previewContainer = document.getElementById('checklist-preview-container');
        
        if (!checklistTab) {
            console.error('❌ Pestaña de checklist no encontrada');
            return;
        }
        
        if (!templateSelect) {
            console.error('❌ Selector de template no encontrado');
            return;
        }
        
        console.log('✅ Elementos básicos del modal encontrados');
        
        console.log('\n=== PASO 4: Probando pestaña de checklist ===');
        
        // Hacer clic en la pestaña de checklist
        checklistTab.click();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar si el selector tiene opciones
        console.log(`📋 Templates disponibles: ${templateSelect.options.length - 1}`); // -1 por la opción vacía
        
        if (templateSelect.options.length <= 1) {
            console.warn('⚠️  No hay templates de checklist disponibles');
            console.log('Probando cargar templates...');
            
            // Intentar cargar templates manualmente
            try {
                await window.fetchChecklistTemplates();
                console.log('✅ Templates cargados manualmente');
            } catch (error) {
                console.error('❌ Error cargando templates:', error);
            }
        }
        
        console.log('\n=== PASO 5: Probando selección de template ===');
        
        if (templateSelect.options.length > 1) {
            // Seleccionar el primer template disponible
            templateSelect.selectedIndex = 1;
            
            // Disparar evento change
            const changeEvent = new Event('change', { bubbles: true });
            templateSelect.dispatchEvent(changeEvent);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificar si la vista previa aparece
            if (previewContainer && !previewContainer.classList.contains('hidden')) {
                console.log('✅ Vista previa del checklist mostrada');
                
                const previewContent = document.getElementById('checklist-preview');
                if (previewContent && previewContent.innerHTML.trim()) {
                    console.log('✅ Contenido de vista previa generado');
                    console.log('Vista previa:', previewContent.innerHTML.substring(0, 200) + '...');
                } else {
                    console.warn('⚠️  Vista previa vacía');
                }
            } else {
                console.error('❌ Vista previa no se muestra');
            }
        } else {
            console.error('❌ No hay templates para probar');
        }
        
        console.log('\n=== PASO 6: Verificando funcionalidad de edición ===');
        
        // Verificar si hay elementos editables
        const editableElements = modal.querySelectorAll('input, textarea, select');
        console.log(`📝 Elementos editables encontrados: ${editableElements.length}`);
        
        let editableCount = 0;
        editableElements.forEach(element => {
            if (!element.disabled && !element.readOnly) {
                editableCount++;
            }
        });
        
        console.log(`✅ Elementos editables disponibles: ${editableCount}`);
        
        if (editableCount === 0) {
            console.error('❌ PROBLEMA: No hay elementos editables en el modal');
        }
        
        console.log('\n🎉 TEST COMPLETADO');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('💥 Error durante el test:', error);
    }
}

// Función para verificar el estado de la autenticación
function checkAuthStatus() {
    console.log('\n🔐 VERIFICANDO ESTADO DE AUTENTICACIÓN:');
    console.log(`- AuthManager disponible: ${!!window.AuthManager}`);
    console.log(`- Token presente: ${!!window.AuthManager?.getToken()}`);
    console.log(`- Autenticado: ${!!window.AuthManager?.isAuthenticated()}`);
    
    if (window.AuthManager?.getCurrentUser()) {
        const user = window.AuthManager.getCurrentUser();
        console.log(`- Usuario actual: ${user.username} (${user.role})`);
    }
}

// Ejecutar verificación de auth y luego el test
checkAuthStatus();

// Esperar a que la página esté completamente cargada
if (document.readyState === 'complete') {
    setTimeout(testGimnacionChecklistFlow, 2000);
} else {
    window.addEventListener('load', () => {
        setTimeout(testGimnacionChecklistFlow, 2000);
    });
}