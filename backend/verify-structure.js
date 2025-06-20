const fs = require('fs');
const path = require('path');

console.log('📁 VERIFICACIÓN COMPLETA DE ESTRUCTURA - GYMTEC ERP\n');

// Estructura esperada del proyecto
const expectedStructure = {
    'backend': {
        type: 'directory',
        required: true,
        files: [
            'package.json',
            'config.env',
            'src/server.js',
            'src/database.js',
            'src/mysql-database.js',
            'src/db-adapter.js'
        ]
    },
    'frontend': {
        type: 'directory',
        required: true,
        files: [
            'index.html',
            'clientes.html',
            'inventario.html',
            'modelos.html',
            'tickets.html',
            'css/style.css',
            'js/clientes.js',
            'js/inventario.js',
            'js/modelos.js'
        ]
    },
    'uploads': {
        type: 'directory',
        required: true,
        subdirs: ['models']
    }
};

function checkFileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch {
        return 0;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function verifyStructure() {
    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    
    const rootPath = '../';
    
    console.log('📂 VERIFICANDO ESTRUCTURA DE DIRECTORIOS:');
    
    for (const [dirName, dirConfig] of Object.entries(expectedStructure)) {
        const dirPath = path.join(rootPath, dirName);
        totalChecks++;
        
        if (checkFileExists(dirPath)) {
            console.log(`   ✅ ${dirName}/ - Directorio existe`);
            passedChecks++;
            
            // Verificar archivos dentro del directorio
            if (dirConfig.files) {
                console.log(`      📄 Verificando archivos en ${dirName}/:`);
                
                for (const fileName of dirConfig.files) {
                    const filePath = path.join(dirPath, fileName);
                    totalChecks++;
                    
                    if (checkFileExists(filePath)) {
                        const size = getFileSize(filePath);
                        console.log(`         ✅ ${fileName} - ${formatBytes(size)}`);
                        passedChecks++;
                    } else {
                        console.log(`         ❌ ${fileName} - No encontrado`);
                        failedChecks++;
                    }
                }
            }
            
            // Verificar subdirectorios
            if (dirConfig.subdirs) {
                console.log(`      📁 Verificando subdirectorios en ${dirName}/:`);
                
                for (const subdir of dirConfig.subdirs) {
                    const subdirPath = path.join(dirPath, subdir);
                    totalChecks++;
                    
                    if (checkFileExists(subdirPath)) {
                        console.log(`         ✅ ${subdir}/ - Subdirectorio existe`);
                        passedChecks++;
                    } else {
                        console.log(`         ❌ ${subdir}/ - No encontrado`);
                        failedChecks++;
                    }
                }
            }
            
        } else {
            console.log(`   ❌ ${dirName}/ - Directorio no encontrado`);
            failedChecks++;
        }
        
        console.log('');
    }
    
    // Verificar archivos críticos en la raíz
    console.log('📋 VERIFICANDO ARCHIVOS CRÍTICOS EN RAÍZ:');
    
    const criticalFiles = [
        'package.json',
        'README.md',
        'BITACORA_PROYECTO.md',
        'start-servers.bat',
        'start-dev-mysql.bat'
    ];
    
    for (const fileName of criticalFiles) {
        const filePath = path.join(rootPath, fileName);
        totalChecks++;
        
        if (checkFileExists(filePath)) {
            const size = getFileSize(filePath);
            console.log(`   ✅ ${fileName} - ${formatBytes(size)}`);
            passedChecks++;
        } else {
            console.log(`   ❌ ${fileName} - No encontrado`);
            failedChecks++;
        }
    }
    
    // Verificar configuraciones específicas
    console.log('\n⚙️  VERIFICANDO CONFIGURACIONES:');
    
    // Package.json del backend
    const backendPackagePath = path.join(rootPath, 'backend', 'package.json');
    totalChecks++;
    
    if (checkFileExists(backendPackagePath)) {
        try {
            const packageData = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
            const hasMySQL = packageData.dependencies && packageData.dependencies['mysql2'];
            const hasDotenv = packageData.dependencies && packageData.dependencies['dotenv'];
            
            if (hasMySQL && hasDotenv) {
                console.log('   ✅ Backend package.json - Dependencias MySQL correctas');
                passedChecks++;
            } else {
                console.log('   ⚠️  Backend package.json - Faltan dependencias MySQL');
                failedChecks++;
            }
        } catch {
            console.log('   ❌ Backend package.json - Error al leer archivo');
            failedChecks++;
        }
    } else {
        console.log('   ❌ Backend package.json - No encontrado');
        failedChecks++;
    }
    
    // Config.env
    const configPath = path.join(rootPath, 'backend', 'config.env');
    totalChecks++;
    
    if (checkFileExists(configPath)) {
        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            const hasDBConfig = configData.includes('DB_HOST') && 
                              configData.includes('DB_NAME') && 
                              configData.includes('DB_USER');
            
            if (hasDBConfig) {
                console.log('   ✅ config.env - Configuración de base de datos presente');
                passedChecks++;
            } else {
                console.log('   ❌ config.env - Configuración de base de datos incompleta');
                failedChecks++;
            }
        } catch {
            console.log('   ❌ config.env - Error al leer archivo');
            failedChecks++;
        }
    } else {
        console.log('   ❌ config.env - No encontrado');
        failedChecks++;
    }
    
    // Verificar uploads y contenido
    console.log('\n📸 VERIFICANDO DIRECTORIO DE UPLOADS:');
    
    const uploadsPath = path.join(rootPath, 'uploads', 'models');
    if (checkFileExists(uploadsPath)) {
        try {
            const files = fs.readdirSync(uploadsPath);
            const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
            
            console.log(`   ✅ uploads/models/ - ${imageFiles.length} imágenes encontradas`);
            
            if (imageFiles.length > 0) {
                console.log('      📷 Ejemplos de imágenes:');
                imageFiles.slice(0, 3).forEach(file => {
                    const filePath = path.join(uploadsPath, file);
                    const size = getFileSize(filePath);
                    console.log(`         • ${file} - ${formatBytes(size)}`);
                });
            }
        } catch {
            console.log('   ❌ uploads/models/ - Error al leer directorio');
        }
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE VERIFICACIÓN DE ESTRUCTURA:');
    console.log(`   ✅ Verificaciones exitosas: ${passedChecks}`);
    console.log(`   ❌ Verificaciones fallidas: ${failedChecks}`);
    console.log(`   📈 Total verificaciones: ${totalChecks}`);
    console.log(`   📊 Porcentaje de éxito: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
    
    if (failedChecks === 0) {
        console.log('\n🎉 ¡ESTRUCTURA DEL PROYECTO COMPLETAMENTE CORRECTA!');
        console.log('✅ Todos los archivos y directorios están en su lugar');
    } else if (failedChecks <= 3) {
        console.log('\n⚠️  Estructura mayormente correcta con algunos archivos faltantes');
    } else {
        console.log('\n❌ Estructura del proyecto requiere atención - varios archivos faltantes');
    }
}

verifyStructure(); 