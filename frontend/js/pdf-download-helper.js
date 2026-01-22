// Helper para descargar PDF con nombre correcto - Versión Chrome-compatible
window.downloadPDFWithName = async function(ticketId) {
    const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('gymtec_token');
    if (!token) throw new Error('No autenticado');
    
    console.log('📥 Descargando PDF...');
    
    const response = await fetch('/api/tickets/' + ticketId + '/generate-pdf', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    
    if (!response.ok) throw new Error('Error: ' + response.status);
    
    const blob = await response.blob();
    const filename = 'Informe_Tecnico_' + ticketId + '_' + Date.now() + '.pdf';
    
    console.log('📄 Blob:', blob.size, 'bytes - Usando saveAs...');
    
    // FileSaver.js saveAs con opciones adicionales
    if (typeof saveAs === 'function') {
        // Crear un File en lugar de Blob para mejor compatibilidad
        const file = new File([blob], filename, { type: 'application/pdf' });
        saveAs(file, filename);
        console.log('✅ saveAs con File ejecutado');
    } else {
        console.warn('saveAs no disponible, usando fallback');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    return filename;
};
console.log('✅ pdf-download-helper.js cargado (File version)');
