// informes-tecnicos.js - Módulo de generación de informes técnicos para clientes
// Este módulo extiende ReportsManager con funcionalidades de informes técnicos

// Agregar funciones al prototipo de ReportsManager
(function() {
    'use strict';
    
    // Extensión de ReportsManager
    if (typeof ReportsManager !== 'undefined') {
        
        // Generar Informe Técnico
        ReportsManager.prototype.generateInformeTecnico = async function(ticketId) {
            try {
                console.log(`📄 Generando informe técnico para ticket #${ticketId}`);
                
                // 1. Cargar datos del ticket
                const informeData = await this.loadTicketInformeData(ticketId);
                
                if (!informeData) {
                    throw new Error('No se pudieron cargar los datos del ticket');
                }
                
                // 2. Generar PDF
                const filename = await this.generateInformePDF(informeData);
                
                // 3. Registrar informe en el servidor
                await this.saveInformeRecord({
                    ticket_id: ticketId,
                    filename: filename,
                    notas_adicionales: informeData.notasAdicionales || ''
                });
                
                this.showNotification('Informe técnico generado exitosamente', 'success');
                await this.loadReportsHistory();
                
                return filename;
                
            } catch (error) {
                console.error('❌ Error generando informe técnico:', error);
                this.showNotification('Error al generar informe: ' + error.message, 'error');
                throw error;
            }
        };
        
        // Cargar datos completos del ticket para informe
        ReportsManager.prototype.loadTicketInformeData = async function(ticketId) {
            try {
                const response = await authenticatedFetch(`${API_URL}/tickets/${ticketId}/informe-data`);
                
                if (!response || !response.ok) {
                    throw new Error('Error al obtener datos del ticket');
                }
                
                const result = await response.json();
                
                if (result.message === 'success' && result.data) {
                    const { ticket, comments, photos } = result.data;
                    
                    // Extraer comentarios etiquetados
                    const contenido = this.extractTaggedComments(comments);
                    
                    // Construir objeto de informe
                    return {
                        ticketId: ticket.id,
                        ticketTitle: ticket.title,
                        priority: ticket.priority || 'Media',
                        status: ticket.status,
                        
                        cliente: {
                            nombre: ticket.client_name || 'N/A',
                            rut: ticket.client_rut || '',
                            contacto: ticket.client_contact || '',
                            telefono: ticket.client_phone || ''
                        },
                        
                        ubicacion: {
                            nombre: ticket.location_name || 'N/A',
                            direccion: ticket.location_address || ''
                        },
                        
                        equipo: {
                            modelo: ticket.equipment_model || 'N/A',
                            tipo: ticket.equipment_type || '',
                            serial: ticket.serial_number || ''
                        },
                        
                        tecnico: {
                            nombre: ticket.technician_name || 'N/A'
                        },
                        
                        fechas: {
                            creacion: ticket.created_at,
                            cierre: ticket.updated_at,
                            duracion: this.calculateDuration(ticket.created_at, ticket.updated_at)
                        },
                        
                        contenido: contenido,
                        fotos: photos.map(p => ({
                            id: p.id,
                            data: p.photo_base64,
                            fecha: p.uploaded_at
                        })),
                        
                        notasAdicionales: ''
                    };
                }
                
                throw new Error('Datos inválidos recibidos del servidor');
                
            } catch (error) {
                console.error('Error cargando datos de informe:', error);
                throw error;
            }
        };
        
        // Extraer comentarios etiquetados
        ReportsManager.prototype.extractTaggedComments = function(comments) {
            const contenido = {
                diagnostico: [],
                trabajo: [],
                solucion: [],
                recomendaciones: [],
                cierre: null
            };
            
            if (!Array.isArray(comments)) return contenido;
            
            comments.forEach(comment => {
                const texto = comment.comment_text || '';
                
                if (texto.includes('#diagnostico')) {
                    const clean = texto.replace('#diagnostico', '').trim();
                    if (clean) contenido.diagnostico.push(clean);
                }
                
                if (texto.includes('#trabajo')) {
                    const clean = texto.replace('#trabajo', '').trim();
                    if (clean) contenido.trabajo.push(clean);
                }
                
                if (texto.includes('#solucion')) {
                    const clean = texto.replace('#solucion', '').trim();
                    if (clean) contenido.solucion.push(clean);
                }
                
                if (texto.includes('#recomendacion')) {
                    const clean = texto.replace('#recomendacion', '').trim();
                    if (clean) contenido.recomendaciones.push(clean);
                }
                
                if (texto.includes('#cierre')) {
                    const clean = texto.replace('#cierre', '').trim();
                    if (clean) contenido.cierre = clean;
                }
            });
            
            return contenido;
        };
        
        // Generar PDF con jsPDF
        ReportsManager.prototype.generateInformePDF = async function(informe) {
            try {
                // Verificar que jsPDF esté disponible
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    throw new Error('jsPDF no está cargado');
                }
                
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                let yPos = 20;
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 20;
                const maxWidth = pageWidth - (margin * 2);
                
                // PORTADA
                doc.setFontSize(24);
                doc.setFont('helvetica', 'bold');
                doc.text('GYMTEC ERP', pageWidth / 2, yPos, { align: 'center' });
                yPos += 15;
                
                doc.setFontSize(16);
                doc.text('INFORME TÉCNICO DE SERVICIO', pageWidth / 2, yPos, { align: 'center' });
                yPos += 25;
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(`Ticket #${informe.ticketId}`, margin, yPos);
                yPos += 8;
                doc.text(`Cliente: ${informe.cliente.nombre}`, margin, yPos);
                yPos += 8;
                doc.text(`Fecha: ${this.formatDate(informe.fechas.cierre)}`, margin, yPos);
                yPos += 8;
                doc.text(`Técnico: ${informe.tecnico.nombre}`, margin, yPos);
                yPos += 20;
                
                // RESUMEN EJECUTIVO
                this.addSection(doc, 'RESUMEN EJECUTIVO', yPos);
                yPos += 10;
                
                doc.setFontSize(10);
                doc.text(`Equipo: ${informe.equipo.modelo}`, margin, yPos);
                yPos += 6;
                doc.text(`Ubicación: ${informe.ubicacion.nombre}`, margin, yPos);
                yPos += 6;
                doc.text(`Prioridad: ${informe.priority}`, margin, yPos);
                yPos += 6;
                doc.text(`Duración: ${informe.fechas.duracion}`, margin, yPos);
                yPos += 15;
                
                // DIAGNÓSTICO INICIAL
                if (informe.contenido.diagnostico.length > 0) {
                    yPos = this.checkPageBreak(doc, yPos, 40);
                    this.addSection(doc, 'DIAGNÓSTICO INICIAL', yPos);
                    yPos += 10;
                    
                    informe.contenido.diagnostico.forEach(item => {
                        const lines = doc.splitTextToSize(`• ${item}`, maxWidth - 10);
                        yPos = this.checkPageBreak(doc, yPos, lines.length * 6);
                        doc.setFontSize(10);
                        doc.text(lines, margin + 5, yPos);
                        yPos += lines.length * 6 + 2;
                    });
                    yPos += 10;
                }
                
                // TRABAJO EJECUTADO
                if (informe.contenido.trabajo.length > 0) {
                    yPos = this.checkPageBreak(doc, yPos, 40);
                    this.addSection(doc, 'TRABAJO EJECUTADO', yPos);
                    yPos += 10;
                    
                    informe.contenido.trabajo.forEach(item => {
                        const lines = doc.splitTextToSize(`✓ ${item}`, maxWidth - 10);
                        yPos = this.checkPageBreak(doc, yPos, lines.length * 6);
                        doc.setFontSize(10);
                        doc.text(lines, margin + 5, yPos);
                        yPos += lines.length * 6 + 2;
                    });
                    yPos += 10;
                }
                
                // SOLUCIÓN
                if (informe.contenido.solucion.length > 0) {
                    yPos = this.checkPageBreak(doc, yPos, 40);
                    this.addSection(doc, 'SOLUCIÓN APLICADA', yPos);
                    yPos += 10;
                    
                    informe.contenido.solucion.forEach(item => {
                        const lines = doc.splitTextToSize(item, maxWidth - 10);
                        yPos = this.checkPageBreak(doc, yPos, lines.length * 6);
                        doc.setFontSize(10);
                        doc.text(lines, margin + 5, yPos);
                        yPos += lines.length * 6 + 2;
                    });
                    yPos += 10;
                }
                
                // FOTOS
                if (informe.fotos.length > 0) {
                    doc.addPage();
                    yPos = 20;
                    
                    this.addSection(doc, 'REGISTRO FOTOGRÁFICO', yPos);
                    yPos += 15;
                    
                    let fotosEnPagina = 0;
                    const fotoWidth = 80;
                    const fotoHeight = 60;
                    
                    for (const foto of informe.fotos) {
                        if (fotosEnPagina >= 3) {
                            doc.addPage();
                            yPos = 20;
                            fotosEnPagina = 0;
                        }
                        
                        try {
                            // Verificar que la foto tenga datos
                            if (foto.data && foto.data.startsWith('data:image')) {
                                doc.addImage(foto.data, 'JPEG', margin, yPos, fotoWidth, fotoHeight);
                                doc.setFontSize(8);
                                doc.text(`Foto ${foto.id} - ${this.formatDate(foto.fecha)}`, margin, yPos + fotoHeight + 5);
                            }
                        } catch (error) {
                            console.error('Error agregando foto:', error);
                        }
                        
                        fotosEnPagina++;
                        yPos += fotoHeight + 15;
                    }
                }
                
                // RECOMENDACIONES
                if (informe.contenido.recomendaciones.length > 0) {
                    doc.addPage();
                    yPos = 20;
                    
                    this.addSection(doc, 'RECOMENDACIONES', yPos);
                    yPos += 10;
                    
                    informe.contenido.recomendaciones.forEach(item => {
                        const lines = doc.splitTextToSize(`• ${item}`, maxWidth - 10);
                        yPos = this.checkPageBreak(doc, yPos, lines.length * 6);
                        doc.setFontSize(10);
                        doc.text(lines, margin + 5, yPos);
                        yPos += lines.length * 6 + 2;
                    });
                    yPos += 15;
                }
                
                // COMENTARIO DE CIERRE
                if (informe.contenido.cierre) {
                    yPos = this.checkPageBreak(doc, yPos, 60);
                    this.addSection(doc, 'COMENTARIO DE CIERRE', yPos);
                    yPos += 10;
                    
                    const lines = doc.splitTextToSize(informe.contenido.cierre, maxWidth - 10);
                    doc.setFontSize(10);
                    doc.text(lines, margin + 5, yPos);
                    yPos += lines.length * 6 + 20;
                }
                
                // FIRMAS
                doc.addPage();
                yPos = 20;
                
                this.addSection(doc, 'CONFORMIDAD Y FIRMAS', yPos);
                yPos += 20;
                
                // Líneas de firma
                doc.line(margin, yPos, margin + 70, yPos);
                doc.line(pageWidth - margin - 70, yPos, pageWidth - margin, yPos);
                yPos += 6;
                
                doc.setFontSize(10);
                doc.text('Técnico Responsable', margin, yPos);
                doc.text('Cliente (Nombre y Firma)', pageWidth - margin - 70, yPos);
                yPos += 5;
                
                doc.text(informe.tecnico.nombre, margin, yPos);
                yPos += 10;
                
                doc.setFontSize(8);
                doc.text(`Fecha: ${this.formatDate(informe.fechas.cierre)}`, margin, yPos);
                doc.text('Fecha: _______________', pageWidth - margin - 70, yPos);
                
                // Guardar PDF
                const filename = `Informe_tecnico_${informe.ticketId}_${Date.now()}.pdf`;
                doc.save(filename);
                
                return filename;
                
            } catch (error) {
                console.error('Error generando PDF:', error);
                throw error;
            }
        };
        
        // Helper: Agregar sección con formato
        ReportsManager.prototype.addSection = function(doc, title, yPos) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 20, yPos);
            doc.setFont('helvetica', 'normal');
            return yPos;
        };
        
        // Helper: Verificar salto de página
        ReportsManager.prototype.checkPageBreak = function(doc, yPos, neededSpace) {
            const pageHeight = doc.internal.pageSize.getHeight();
            if (yPos + neededSpace > pageHeight - 20) {
                doc.addPage();
                return 20;
            }
            return yPos;
        };
        
        // Calcular duración entre fechas
        ReportsManager.prototype.calculateDuration = function(startDate, endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diff = end - start;
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            if (days > 0) {
                return `${days} día${days > 1 ? 's' : ''}, ${hours} hora${hours !== 1 ? 's' : ''}`;
            } else {
                return `${hours} hora${hours !== 1 ? 's' : ''}`;
            }
        };
        
        // Registrar informe en servidor
        ReportsManager.prototype.saveInformeRecord = async function(data) {
            try {
                const response = await authenticatedFetch(`${API_URL}/informes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response || !response.ok) {
                    console.warn('No se pudo registrar el informe en el servidor');
                    return null;
                }
                
                const result = await response.json();
                console.log('✅ Informe registrado en servidor:', result);
                return result.data;
                
            } catch (error) {
                console.error('Error registrando informe:', error);
                return null;
            }
        };
        
        console.log('✅ Módulo de informes técnicos cargado correctamente');
    }
})();
