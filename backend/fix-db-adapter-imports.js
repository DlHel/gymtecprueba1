const fs = require('fs');
const path = require('path');

// Función para buscar y reemplazar en un archivo
function fixDbAdapterInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // Reemplazar los patrones problemáticos
        const oldPattern1 = /const DatabaseAdapter = require\(['"]\.\.\/db-adapter['"]\);\s*const db = new DatabaseAdapter\(\);/g;
        const oldPattern2 = /const DatabaseAdapter = require\(['"]\.\.\/\.\.\/db-adapter['"]\);\s*const db = new DatabaseAdapter\(\);/g;
        const oldPattern3 = /const DatabaseAdapter = require\(['"]\.\/db-adapter['"]\);\s*const db = new DatabaseAdapter\(\);/g;

        if (oldPattern1.test(content)) {
            content = content.replace(oldPattern1, "const db = require('../db-adapter');");
            changed = true;
        }
        
        if (oldPattern2.test(content)) {
            content = content.replace(oldPattern2, "const db = require('../../db-adapter');");
            changed = true;
        }
        
        if (oldPattern3.test(content)) {
            content = content.replace(oldPattern3, "const db = require('./db-adapter');");
            changed = true;
        }

        // Reset content for more patterns
        content = fs.readFileSync(filePath, 'utf8');

        // Patrones adicionales
        if (content.includes('const DatabaseAdapter = require(') && content.includes('const db = new DatabaseAdapter()')) {
            content = content.replace(/const DatabaseAdapter = require\(['"][^'"]*['"]\);\s*\n?\s*const db = new DatabaseAdapter\(\);/g, 
                function(match) {
                    // Extraer la ruta del require
                    const requireMatch = match.match(/require\(['"]([^'"]*)['"]\)/);
                    if (requireMatch) {
                        return `const db = require('${requireMatch[1]}');`;
                    }
                    return match;
                }
            );
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed: ${filePath}`);
            return true;
        } else {
            console.log(`⏭️  No changes needed: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

// Función para buscar archivos recursivamente
function findJSFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            findJSFiles(fullPath, files);
        } else if (stat.isFile() && item.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Ejecutar el script
console.log('🔧 Iniciando corrección de imports DatabaseAdapter...');

const srcDir = path.join(__dirname, 'src');
const jsFiles = findJSFiles(srcDir);

let totalFixed = 0;
let totalFiles = jsFiles.length;

for (const file of jsFiles) {
    if (fixDbAdapterInFile(file)) {
        totalFixed++;
    }
}

console.log(`\n📊 Resumen:`);
console.log(`   Archivos procesados: ${totalFiles}`);
console.log(`   Archivos corregidos: ${totalFixed}`);
console.log(`   Archivos sin cambios: ${totalFiles - totalFixed}`);

if (totalFixed > 0) {
    console.log('\n✅ Corrección completada. Intenta iniciar el servidor nuevamente.');
} else {
    console.log('\n⚠️  No se encontraron archivos que necesiten corrección.');
}