const fs = require('fs');
const path = require('path');

/**
 * Script de Limpieza de Archivos Redundantes
 * @bitacora: Automatización de limpieza de código redundante
 */

console.log('🧹 INICIANDO LIMPIEZA DE ARCHIVOS REDUNDANTES');
console.log('📅 Fecha:', new Date().toISOString());

const projectRoot = path.join(__dirname, '../../..');

// ===================================================================
// ARCHIVOS DE TEST ABANDONADOS (CANDIDATOS PARA ELIMINACIÓN)
// ===================================================================

const testFilesToRemove = [
    'quick-test.js',
    'test-add-checklist-item.js', 
    'test-equipment-endpoint.js',
    'test-frontend-checklist-workflow.js',
    'test-inventario-inteligente.js',
    'test-inventory-endpoint.js',
    'test-login-technicians.js',
    'test-service-tickets.js',
    'test-ticket-detail-endpoint.js',
    'test-ticket-detail-page.js'
];

// ===================================================================
// ARCHIVOS DE DEBUG ABANDONADOS
// ===================================================================

const debugFilesToRemove = [
    'backend/debug-ticket-detail.js',
    'frontend/debug-logs.html',
    'frontend/auth-debug.html',
    'frontend/js/debug-tickets.js',
    'frontend/js/debug-navigation.js',
    'frontend/js/debug-auth.js'
];

// ===================================================================
// ARCHIVOS DE TEST HTML ABANDONADOS
// ===================================================================

const testHtmlFilesToRemove = [
    'frontend/test-ticket-detail.html',
    'frontend/test-tickets-api.html', 
    'frontend/test-ticket-detail-api.html',
    'frontend/test-service-tickets.html',
    'frontend/test-dashboard-apis.html',
    'frontend/quick-auth-test.html',
    'frontend/quick-auth-check.html'
];

// ===================================================================
// FUNCIÓN DE BACKUP ANTES DE ELIMINAR
// ===================================================================

function createBackup() {
    const backupDir = path.join(projectRoot, 'backup-before-cleanup');
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('📦 Directorio de backup creado:', backupDir);
    }
    
    return backupDir;
}

// ===================================================================
// FUNCIÓN PARA MOVER ARCHIVOS A BACKUP
// ===================================================================

function moveToBackup(filePath, backupDir) {
    const fullPath = path.join(projectRoot, filePath);
    
    if (fs.existsSync(fullPath)) {
        const backupPath = path.join(backupDir, path.basename(filePath));
        
        try {
            fs.copyFileSync(fullPath, backupPath);
            fs.unlinkSync(fullPath);
            console.log(`✅ Movido a backup: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`❌ Error moviendo ${filePath}:`, error.message);
            return false;
        }
    } else {
        console.log(`⚠️ Archivo no encontrado: ${filePath}`);
        return false;
    }
}

// ===================================================================
// FUNCIÓN PRINCIPAL DE LIMPIEZA
// ===================================================================

function cleanupRedundantFiles() {
    console.log('\n🎯 Iniciando limpieza de archivos redundantes...');
    
    const backupDir = createBackup();
    let totalFiles = 0;
    let processedFiles = 0;
    
    // Limpiar archivos de test JavaScript
    console.log('\n📋 Procesando archivos de test JavaScript...');
    testFilesToRemove.forEach(file => {
        totalFiles++;
        if (moveToBackup(file, backupDir)) {
            processedFiles++;
        }
    });
    
    // Limpiar archivos de debug
    console.log('\n🐛 Procesando archivos de debug...');
    debugFilesToRemove.forEach(file => {
        totalFiles++;
        if (moveToBackup(file, backupDir)) {
            processedFiles++;
        }
    });
    
    // Limpiar archivos de test HTML
    console.log('\n🌐 Procesando archivos de test HTML...');
    testHtmlFilesToRemove.forEach(file => {
        totalFiles++;
        if (moveToBackup(file, backupDir)) {
            processedFiles++;
        }
    });
    
    console.log('\n📊 RESUMEN DE LIMPIEZA:');
    console.log(`   📁 Total archivos evaluados: ${totalFiles}`);
    console.log(`   ✅ Archivos movidos a backup: ${processedFiles}`);
    console.log(`   ⚠️ Archivos no encontrados: ${totalFiles - processedFiles}`);
    console.log(`   📦 Backup ubicado en: ${backupDir}`);
    
    if (processedFiles > 0) {
        console.log('\n🎉 LIMPIEZA COMPLETADA EXITOSAMENTE');
        console.log('💡 Los archivos han sido movidos a backup por seguridad');
        console.log('💡 Si todo funciona correctamente, puedes eliminar el directorio backup');
    } else {
        console.log('\n⚠️ No se procesaron archivos - verificar rutas');
    }
}

// ===================================================================
// FUNCIÓN PARA ANALIZAR DEPENDENCIAS
// ===================================================================

function analyzeDependencies() {
    console.log('\n🔍 ANALIZANDO DEPENDENCIAS DEL BACKEND...');
    
    const packageJsonPath = path.join(projectRoot, 'backend/package.json');
    
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = packageJson.dependencies || {};
        
        console.log('\n📦 Dependencias instaladas:');
        Object.keys(dependencies).forEach(dep => {
            console.log(`   📌 ${dep}: ${dependencies[dep]}`);
        });
        
        // Identificar dependencias problemáticas
        const problematicDeps = [];
        
        if (dependencies.mongoose) {
            problematicDeps.push('mongoose - Se usa MySQL, no MongoDB');
        }
        
        if (problematicDeps.length > 0) {
            console.log('\n⚠️ DEPENDENCIAS PROBLEMÁTICAS DETECTADAS:');
            problematicDeps.forEach(dep => {
                console.log(`   ❌ ${dep}`);
            });
        } else {
            console.log('\n✅ No se detectaron dependencias problemáticas obvias');
        }
    }
}

// ===================================================================
// EJECUTAR LIMPIEZA
// ===================================================================

if (require.main === module) {
    console.log('🚀 Ejecutando script de limpieza...\n');
    
    try {
        analyzeDependencies();
        cleanupRedundantFiles();
        
        console.log('\n🎯 SIGUIENTES PASOS RECOMENDADOS:');
        console.log('   1. Verificar que el servidor modular funcione correctamente');
        console.log('   2. Ejecutar tests básicos de funcionalidad');
        console.log('   3. Si todo funciona, eliminar el directorio backup');
        console.log('   4. Actualizar package.json para remover dependencias no utilizadas');
        
    } catch (error) {
        console.error('💥 Error durante la limpieza:', error);
        process.exit(1);
    }
}

module.exports = {
    cleanupRedundantFiles,
    analyzeDependencies
};
