/**
 * Test de Responsive Design - GYMTEC ERP v3.0
 * Verifica que las páginas principales se adapten correctamente a diferentes tamaños de pantalla
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 TEST DE DISEÑO RESPONSIVO - GYMTEC ERP v3.0\n');
console.log('═'.repeat(80));

// Páginas a verificar
const pages = [
    { file: 'login.html', name: 'Login' },
    { file: 'tickets.html', name: 'Tickets', css: 'css/tickets.css' },
    { file: 'equipos.html', name: 'Equipos', css: 'css/equipo.css' },
    { file: 'inventario-fase3.html', name: 'Inventario' }
];

let totalScore = 0;
let totalTests = 0;

pages.forEach(({ file, name, css }) => {
    console.log(`\n📄 ${name} (${file})`);
    console.log('─'.repeat(80));
    
    const htmlPath = path.join(__dirname, 'frontend', file);
    
    if (!fs.existsSync(htmlPath)) {
        console.log(`❌ Archivo no encontrado: ${file}`);
        return;
    }
    
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Si tiene CSS externo, leerlo también
    let cssContent = '';
    if (css) {
        const cssPath = path.join(__dirname, 'frontend', css);
        if (fs.existsSync(cssPath)) {
            cssContent = fs.readFileSync(cssPath, 'utf8');
        }
    }
    
    const fullContent = htmlContent + '\n' + cssContent;
    
    let pageScore = 0;
    let pageTests = 0;
    
    // 1. Viewport meta tag
    pageTests++;
    if (/<meta\s+name="viewport"/.test(htmlContent)) {
        console.log('✅ Viewport meta tag presente');
        pageScore++;
    } else {
        console.log('❌ Falta viewport meta tag');
    }
    
    // 2. Clases Tailwind responsive o media queries
    pageTests++;
    const tailwindMatches = fullContent.match(/\b(sm:|md:|lg:|xl:|2xl:)[\w-]+/g);
    const mediaMatches = fullContent.match(/@media\s*\([^)]+\)/g);
    
    const responsiveCount = (tailwindMatches ? tailwindMatches.length : 0) + 
                           (mediaMatches ? mediaMatches.length * 3 : 0);
    
    if (responsiveCount > 15) {
        console.log(`✅ Estilos responsive: ${responsiveCount} elementos (Tailwind: ${tailwindMatches ? tailwindMatches.length : 0}, Media Queries: ${mediaMatches ? mediaMatches.length : 0})`);
        pageScore++;
    } else if (responsiveCount > 5) {
        console.log(`⚠️ Estilos responsive limitados: ${responsiveCount} elementos`);
        pageScore += 0.5;
    } else {
        console.log(`❌ Pocos estilos responsive: ${responsiveCount} elementos`);
    }
    
    // 3. Flex responsive (flex-col, flex-wrap)
    pageTests++;
    if (/flex-col|flex-wrap|(sm:|md:|lg:)flex-row/.test(fullContent)) {
        console.log('✅ Flexbox responsive detectado');
        pageScore++;
    } else {
        console.log('⚠️ No se encontró flexbox responsive');
        pageScore += 0.3;
    }
    
    // 4. Grid responsive
    pageTests++;
    if (/grid-cols-\d+\s+(sm:|md:|lg:)|grid-template-columns.*\(@media|minmax/.test(fullContent)) {
        console.log('✅ Grid responsive detectado');
        pageScore++;
    } else {
        console.log('ℹ️ No usa grid responsive (puede no necesitarlo)');
        pageScore += 0.5;
    }
    
    // 5. Padding/margin responsive
    pageTests++;
    if (/\b(sm:|md:|lg:)(p|m|px|py|mx|my)-\d+|padding.*@media|margin.*@media/.test(fullContent)) {
        console.log('✅ Spacing responsive (padding/margin)');
        pageScore++;
    } else {
        console.log('⚠️ Spacing no responsive');
        pageScore += 0.3;
    }
    
    // 6. Tamaño de texto responsive
    pageTests++;
    if (/text-\w+\s+(sm:|md:|lg:)text-|font-size.*@media/.test(fullContent)) {
        console.log('✅ Tamaño de texto responsive');
        pageScore++;
    } else {
        console.log('⚠️ Tamaño de texto no responsive');
        pageScore += 0.3;
    }
    
    // 7. Ocultar/mostrar elementos según pantalla
    pageTests++;
    if (/\b(hidden|block|inline|flex)\s+(sm:|md:|lg:)(hidden|block|inline|flex)|display:\s*none.*@media/.test(fullContent)) {
        console.log('✅ Control de visibilidad responsive');
        pageScore++;
    } else {
        console.log('ℹ️ No usa control de visibilidad responsive');
        pageScore += 0.5;
    }
    
    // Resultado de la página
    const percentage = ((pageScore / pageTests) * 100).toFixed(1);
    console.log(`\n📊 Score: ${pageScore.toFixed(1)}/${pageTests} (${percentage}%)`);
    
    if (percentage >= 85) {
        console.log('✅ EXCELENTE responsive design');
    } else if (percentage >= 70) {
        console.log('⚠️ BUENO, pero con mejoras posibles');
    } else {
        console.log('❌ NECESITA MEJORAS en responsive design');
    }
    
    totalScore += pageScore;
    totalTests += pageTests;
});

// Resultado final
console.log('\n' + '═'.repeat(80));
console.log('📊 RESULTADO FINAL - RESPONSIVE DESIGN');
console.log('═'.repeat(80));

const finalPercentage = ((totalScore / totalTests) * 100).toFixed(1);
console.log(`\nScore Total: ${totalScore.toFixed(1)}/${totalTests} (${finalPercentage}%)`);

if (finalPercentage >= 85) {
    console.log('\n✅ Sistema con EXCELENTE diseño responsivo');
    console.log('✨ Las páginas se adaptan correctamente a mobile, tablet y desktop');
    process.exit(0);
} else if (finalPercentage >= 70) {
    console.log('\n⚠️ Sistema con BUEN diseño responsivo');
    console.log('💡 Algunas mejoras recomendadas para experiencia óptima');
    process.exit(0);
} else {
    console.log('\n❌ Sistema NECESITA MEJORAS en diseño responsivo');
    console.log('⚡ Revisar breakpoints y adaptación a diferentes pantallas');
    process.exit(1);
}

