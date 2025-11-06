// test-informe-tecnico.js - Prueba del sistema de informes técnicos
// Ejecutar este script en la consola del navegador para probar

console.log('🧪 Iniciando prueba del sistema de informes técnicos...');

async function testInformeTecnico() {
    try {
        // 1. Verificar que ReportsManager está disponible
        console.log('1️⃣ Verificando ReportsManager...');
        if (typeof window.reportsManager === 'undefined') {
            throw new Error('ReportsManager no está disponible');
        }
        console.log('   ✅ ReportsManager disponible');
        
        // 2. Verificar que las funciones de informe existen
        console.log('2️⃣ Verificando funciones de informe...');
        if (typeof window.reportsManager.generateInformeTecnico !== 'function') {
            throw new Error('generateInformeTecnico no está definido');
        }
        console.log('   ✅ Funciones de informe disponibles');
        
        // 3. Verificar jsPDF
        console.log('3️⃣ Verificando jsPDF...');
        if (!window.jspdf) {
            throw new Error('jsPDF no está cargado');
        }
        console.log('   ✅ jsPDF disponible');
        
        // 4. Listar tickets disponibles
        console.log('4️⃣ Listando tickets completados...');
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/tickets`);
        
        if (!response || !response.ok) {
            throw new Error('No se pudieron obtener tickets');
        }
        
        const result = await response.json();
        const tickets = result.data || [];
        const completedTickets = tickets.filter(t => 
            t.status === 'completed' || t.status === 'closed' || t.status === 'Resuelto'
        );
        
        console.log(`   ✅ Encontrados ${completedTickets.length} tickets completados:`);
        completedTickets.forEach(t => {
            console.log(`      - Ticket #${t.id}: ${t.title}`);
        });
        
        if (completedTickets.length === 0) {
            console.warn('   ⚠️ No hay tickets completados para generar informe');
            console.log('   💡 Tip: Completa un ticket primero y agrega comentarios con etiquetas:');
            console.log('      #diagnostico - Diagnóstico del problema');
            console.log('      #trabajo - Trabajo realizado');
            console.log('      #solucion - Solución aplicada');
            console.log('      #recomendacion - Recomendaciones');
            console.log('      #cierre - Comentario de cierre');
            return;
        }
        
        // 5. Solicitar confirmación para generar informe
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📝 Para generar un informe técnico, ejecuta:');
        console.log(`   window.reportsManager.generateInformeTecnico(${completedTickets[0].id})`);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        
        // 6. Verificar endpoint de datos de informe
        console.log('5️⃣ Probando endpoint de datos de informe...');
        const informeResponse = await window.authManager.authenticatedFetch(
            `${window.API_URL}/tickets/${completedTickets[0].id}/informe-data`
        );
        
        if (!informeResponse || !informeResponse.ok) {
            throw new Error('Endpoint de informe no responde');
        }
        
        const informeData = await informeResponse.json();
        console.log('   ✅ Endpoint de informe funcionando');
        console.log('   📊 Datos disponibles:');
        console.log(`      - Comentarios: ${informeData.data.comments.length}`);
        console.log(`      - Fotos: ${informeData.data.photos.length}`);
        
        // 7. Análisis de comentarios etiquetados
        if (informeData.data.comments.length > 0) {
            console.log('');
            console.log('6️⃣ Analizando comentarios etiquetados...');
            const tags = {
                diagnostico: 0,
                trabajo: 0,
                solucion: 0,
                recomendacion: 0,
                cierre: 0
            };
            
            informeData.data.comments.forEach(c => {
                const text = c.comment_text || '';
                if (text.includes('#diagnostico')) tags.diagnostico++;
                if (text.includes('#trabajo')) tags.trabajo++;
                if (text.includes('#solucion')) tags.solucion++;
                if (text.includes('#recomendacion')) tags.recomendacion++;
                if (text.includes('#cierre')) tags.cierre++;
            });
            
            console.log('   📋 Etiquetas encontradas:');
            Object.entries(tags).forEach(([tag, count]) => {
                const icon = count > 0 ? '✅' : '⚠️';
                console.log(`      ${icon} #${tag}: ${count}`);
            });
            
            if (Object.values(tags).every(v => v === 0)) {
                console.log('');
                console.log('   ⚠️ No se encontraron etiquetas en los comentarios');
                console.log('   💡 Agrega comentarios con etiquetas para un informe completo');
            }
        }
        
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║                                                      ║');
        console.log('║  ✅ SISTEMA DE INFORMES TÉCNICOS FUNCIONANDO        ║');
        console.log('║                                                      ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('🚀 Para generar un informe ahora, ejecuta:');
        console.log(`   window.reportsManager.generateInformeTecnico(${completedTickets[0].id})`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Error en prueba:', error);
        console.log('');
        console.log('💡 Soluciones posibles:');
        console.log('   1. Verifica que estés en /reportes.html');
        console.log('   2. Asegúrate de estar autenticado');
        console.log('   3. Verifica que el backend esté corriendo');
        console.log('   4. Verifica que jsPDF esté cargado');
    }
}

// Ejecutar test
testInformeTecnico();
