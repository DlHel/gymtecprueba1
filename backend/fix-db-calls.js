const fs = require('fs');
const path = require('path');

/**
 * Script para convertir db.query a db.all en los servicios de Fase 2
 */

const files = [
    'c:\\Users\\felip\\OneDrive\\Desktop\\desa\\g\\gymtecprueba1\\backend\\src\\services\\task-scheduler.js',
    'c:\\Users\\felip\\OneDrive\\Desktop\\desa\\g\\gymtecprueba1\\backend\\src\\services\\alert-processor.js',
    'c:\\Users\\felip\\OneDrive\\Desktop\\desa\\g\\gymtecprueba1\\backend\\src\\routes\\notifications.js'
];

files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        console.log(`Arreglando: ${path.basename(filePath)}`);
        
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Reemplazar db.query con db.all
        content = content.replace(/await db\.query\(/g, 'await db.all(');
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${path.basename(filePath)} arreglado`);
    } else {
        console.log(`❌ No encontrado: ${filePath}`);
    }
});

console.log('🎉 Conversión completada');
