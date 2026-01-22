// Método de descarga simplificado - reemplaza downloadPDFFromServer
window.ReportsManager.prototype.downloadPDFFromServer = async function(ticketId) {
    try {
        console.log(\📄 Descargando PDF del servidor para ticket #\...\);
        this.showNotification('Generando PDF...', 'info');
        
        const token = window.authManager.getToken();
        if (!token) throw new Error('No hay sesión activa');
        
        // Descargar directamente via window.location
        window.location.href = \\/tickets/\/generate-pdf?token=\\;
        
        const filename = \Informe_Tecnico_\.pdf\;
        console.log(\✅ PDF descarga iniciada: \\);
        this.showNotification('PDF descargando...', 'success');
        return filename;
    } catch (error) {
        console.error('❌ Error:', error);
        this.showNotification('Error: ' + error.message, 'error');
        throw error;
    }
};
console.log('✅ Método downloadPDFFromServer actualizado');
