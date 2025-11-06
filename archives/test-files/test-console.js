console.log('🧪 PRUEBA DEL SISTEMA DE INFORMES TÉCNICOS');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Función de prueba completa
async function pruebaInformeTecnico() {
    try {
        console.log('1️⃣ Verificando sistema...');
        
        // Verificar AuthManager
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            console.error('❌ No autenticado. Por favor inicia sesión primero.');
            return;
        }
        console.log('   ✅ Usuario autenticado');
        
        // Verificar ReportsManager
        if (!window.reportsManager) {
            console.error('❌ ReportsManager no disponible');
            console.log('   💡 Asegúrate de estar en /reportes.html');
            return;
        }
        console.log('   ✅ ReportsManager disponible');
        
        // Verificar función de informe
        if (typeof window.reportsManager.generateInformeTecnico !== 'function') {
            console.error('❌ generateInformeTecnico no disponible');
            return;
        }
        console.log('   ✅ Función generateInformeTecnico disponible');
        
        // Verificar jsPDF
        if (!window.jspdf) {
            console.error('❌ jsPDF no está cargado');
            console.log('   💡 Necesitas incluir jsPDF en el HTML');
            return;
        }
        console.log('   ✅ jsPDF disponible');
        
        console.log('');
        console.log('2️⃣ Obteniendo tickets completados...');
        
        // Obtener tickets
        const response = await window.authManager.authenticatedFetch(window.API_URL + '/tickets');
        if (!response.ok) {
            throw new Error('Error al obtener tickets');
        }
        
        const result = await response.json();
        const tickets = result.data || [];
        
        // Filtrar completados
        const completados = tickets.filter(t => 
            ['completed', 'closed', 'Resuelto', 'Cerrado'].includes(t.status)
        );
        
        console.log('   📋 Total de tickets: ' + tickets.length);
        console.log('   ✅ Tickets completados: ' + completados.length);
        
        if (completados.length === 0) {
            console.log('');
            console.log('⚠️ No hay tickets completados para generar informe');
            console.log('');
            console.log('💡 Para crear un ticket de prueba:');
            console.log('   1. Ve a /tickets.html');
            console.log('   2. Crea un ticket');
            console.log('   3. Agrégale comentarios con etiquetas:');
            console.log('      #diagnostico Se detectó problema en motor');
            console.log('      #trabajo Se reemplazó correa de transmisión');
            console.log('      #solucion Motor funcionando correctamente');
            console.log('      #recomendacion Realizar mantenimiento mensual');
            console.log('      #cierre Trabajo completado satisfactoriamente');
            console.log('   4. Cierra el ticket');
            console.log('   5. Regresa aquí y ejecuta: pruebaInformeTecnico()');
            return;
        }
        
        console.log('');
        console.log('3️⃣ Analizando primer ticket completado...');
        const ticket = completados[0];
        console.log('   🎫 Ticket #' + ticket.id + ': ' + ticket.title);
        console.log('   📍 Estado: ' + ticket.status);
        console.log('   📅 Creado: ' + new Date(ticket.created_at).toLocaleDateString('es-ES'));
        
        console.log('');
        console.log('4️⃣ Verificando datos para informe...');
        
        const informeResponse = await window.authManager.authenticatedFetch(
            window.API_URL + '/tickets/' + ticket.id + '/informe-data'
        );
        
        if (!informeResponse.ok) {
            throw new Error('Error al obtener datos de informe');
        }
        
        const informeData = await informeResponse.json();
        const { comments, photos } = informeData.data;
        
        console.log('   💬 Comentarios: ' + comments.length);
        console.log('   📷 Fotos: ' + photos.length);
        
        // Analizar etiquetas
        const tags = { diagnostico: 0, trabajo: 0, solucion: 0, recomendacion: 0, cierre: 0 };
        comments.forEach(c => {
            const text = c.comment_text || '';
            if (text.includes('#diagnostico')) tags.diagnostico++;
            if (text.includes('#trabajo')) tags.trabajo++;
            if (text.includes('#solucion')) tags.solucion++;
            if (text.includes('#recomendacion')) tags.recomendacion++;
            if (text.includes('#cierre')) tags.cierre++;
        });
        
        console.log('');
        console.log('   📋 Etiquetas encontradas:');
        Object.entries(tags).forEach(([tag, count]) => {
            const icon = count > 0 ? '✅' : '⚠️';
            console.log('      ' + icon + ' #' + tag + ': ' + count);
        });
        
        const totalTags = Object.values(tags).reduce((a, b) => a + b, 0);
        
        if (totalTags === 0) {
            console.log('');
            console.log('   ⚠️ No hay etiquetas en los comentarios');
            console.log('   💡 El informe se generará pero estará vacío');
            console.log('   💡 Agrega comentarios con etiquetas para un informe completo');
        }
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('✅ SISTEMA LISTO PARA GENERAR INFORMES');
        console.log('');
        console.log('🚀 Para generar el informe técnico, ejecuta:');
        console.log('');
        console.log('   window.reportsManager.generateInformeTecnico(' + ticket.id + ')');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        
        // Retornar info útil
        return {
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            comentarios: comments.length,
            fotos: photos.length,
            etiquetas: tags,
            comando: 'window.reportsManager.generateInformeTecnico(' + ticket.id + ')'
        };
        
    } catch (error) {
        console.error('❌ Error en prueba:', error);
        console.log('');
        console.log('💡 Posibles soluciones:');
        console.log('   1. Verifica que estés en /reportes.html');
        console.log('   2. Asegúrate de estar autenticado');
        console.log('   3. Verifica que el backend esté corriendo en puerto 3000');
        console.log('   4. Revisa la consola para más detalles');
    }
}

// Ejecutar automáticamente
pruebaInformeTecnico();
