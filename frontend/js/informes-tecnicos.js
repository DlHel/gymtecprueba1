// informes-tecnicos.js - Módulo de generación de informes técnicos para clientes
// Este módulo extiende ReportsManager con funcionalidades de informes técnicos

// Agregar funciones al prototipo de ReportsManager
(function() {
    'use strict';
    
    // Función para extender ReportsManager
    function extendReportsManager() {
        // Extensión de ReportsManager - usar window.ReportsManager que se exporta en reportes.js
        if (typeof window.ReportsManager !== 'undefined') {
            console.log('✅ Extendiendo ReportsManager con módulo de informes técnicos...');
        
        // Nueva función: Descargar PDF generado en el servidor
        window.ReportsManager.prototype.downloadPDFFromServer = async function(ticketId) {
            try {
                console.log(`📄 Descargando PDF del servidor para ticket #${ticketId}...`);
                this.showNotification('Generando PDF...', 'info');
                
                // Obtener token de autenticación
                const token = window.authManager.getToken();
                if (!token) {
                    throw new Error('No hay sesión activa');
                }
                
                // Redirigir a la URL del PDF - el navegador descargará automáticamente
                // gracias al header Content-Disposition: attachment del servidor
                const filename = await window.downloadPDFWithName(ticketId);
                
                
                console.log(`✅ PDF descarga iniciada: ${filename}`);
                
                // Delay para dar tiempo a la descarga antes de mostrar notificación
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.showNotification('PDF descargando...', 'success');
                
                return filename;
                
            } catch (error) {
                console.error('❌ Error descargando PDF del servidor:', error);
                this.showNotification('Error al descargar PDF: ' + error.message, 'error');
                throw error;
            }
        };
        
        window.ReportsManager.prototype.generateInformeTecnico = async function(ticketId) {
            try {
                console.log(`📄 Generando informe técnico para ticket #${ticketId}`);
                
                // USAR MÉTODO DEL SERVIDOR (funciona en todos los navegadores)
                const filename = await this.downloadPDFFromServer(ticketId);
                
                // Registrar en historial
                await this.saveInformeRecord({
                    ticket_id: ticketId,
                    filename: filename,
                    notas_adicionales: ''
                });
                
                await this.loadReportsHistory();
                return filename;
                
            } catch (error) {
                console.error('❌ Error generando informe técnico:', error);
                this.showNotification('Error al generar informe: ' + error.message, 'error');
                throw error;
            }
        };
        
        // Cargar datos completos del ticket para informe
        window.ReportsManager.prototype.loadTicketInformeData = async function(ticketId) {
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
        window.ReportsManager.prototype.extractTaggedComments = function(comments) {
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
        
        // Generar PDF con jsPDF - Diseño Profesional con Colores Corporativos Gymtec
        window.ReportsManager.prototype.generateInformePDF = async function(informe) {
            try {
                // Verificar que jsPDF esté disponible
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    throw new Error('jsPDF no está cargado');
                }
                
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                let yPos = 0;
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 20;
                const maxWidth = pageWidth - (margin * 2);
                
                // ========== COLORES CORPORATIVOS GYMTEC ==========
                const colors = {
                    primary: [255, 75, 43],      // #FF4B2B - Rojo Gymtec
                    dark: [26, 27, 38],          // #1A1B26 - Azul Oscuro
                    grayLight: [245, 245, 247],  // #F5F5F7 - Gris Claro
                    white: [255, 255, 255],      // #FFFFFF
                    grayText: [107, 114, 128],   // Gris para texto secundario
                    border: [229, 231, 235]      // Gris para bordes
                };
                
                // ========== PORTADA ==========
                // Header con fondo azul oscuro
                doc.setFillColor(...colors.dark);
                doc.rect(0, 0, pageWidth, 50, 'F');
                
                // Logo/Título GYMTEC
                doc.setTextColor(...colors.white);
                doc.setFontSize(28);
                doc.setFont('helvetica', 'bold');
                doc.text('GYMTEC', margin, 28);
                
                // Subtítulo
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.text('Servicio Técnico Profesional', margin, 40);
                
                // Número de ticket en la esquina derecha
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`TICKET #${informe.ticketId}`, pageWidth - margin, 28, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text(this.formatDate(informe.fechas.cierre), pageWidth - margin, 40, { align: 'right' });
                
                yPos = 60;
                
                // Título del documento
                doc.setTextColor(...colors.dark);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('INFORME TÉCNICO DE SERVICIO', pageWidth / 2, yPos, { align: 'center' });
                yPos += 15;
                
                // Línea decorativa roja
                doc.setDrawColor(...colors.primary);
                doc.setLineWidth(2);
                doc.line(pageWidth/2 - 40, yPos, pageWidth/2 + 40, yPos);
                yPos += 20;
                
                // ========== INFORMACIÓN PRINCIPAL (2 columnas) ==========
                // Caja de Cliente
                doc.setFillColor(...colors.grayLight);
                doc.roundedRect(margin, yPos, (pageWidth - margin*3)/2, 50, 3, 3, 'F');
                
                doc.setTextColor(...colors.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('CLIENTE', margin + 8, yPos + 12);
                
                doc.setTextColor(...colors.dark);
                doc.setFontSize(11);
                doc.text(informe.cliente.nombre, margin + 8, yPos + 24);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.grayText);
                if (informe.cliente.rut) doc.text(`RUT: ${informe.cliente.rut}`, margin + 8, yPos + 34);
                if (informe.cliente.telefono) doc.text(`Tel: ${informe.cliente.telefono}`, margin + 8, yPos + 44);
                
                // Caja de Ubicación
                const col2X = margin + (pageWidth - margin*3)/2 + margin;
                doc.setFillColor(...colors.grayLight);
                doc.roundedRect(col2X, yPos, (pageWidth - margin*3)/2, 50, 3, 3, 'F');
                
                doc.setTextColor(...colors.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('UBICACIÓN', col2X + 8, yPos + 12);
                
                doc.setTextColor(...colors.dark);
                doc.setFontSize(11);
                doc.text(informe.ubicacion.nombre, col2X + 8, yPos + 24);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.grayText);
                const dirLines = doc.splitTextToSize(informe.ubicacion.direccion || 'N/A', 70);
                doc.text(dirLines, col2X + 8, yPos + 34);
                
                yPos += 60;
                
                // Caja de Equipo
                doc.setFillColor(...colors.grayLight);
                doc.roundedRect(margin, yPos, (pageWidth - margin*3)/2, 50, 3, 3, 'F');
                
                doc.setTextColor(...colors.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('EQUIPO', margin + 8, yPos + 12);
                
                doc.setTextColor(...colors.dark);
                doc.setFontSize(11);
                doc.text(informe.equipo.modelo, margin + 8, yPos + 24);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.grayText);
                if (informe.equipo.tipo) doc.text(`Tipo: ${informe.equipo.tipo}`, margin + 8, yPos + 34);
                if (informe.equipo.serial) doc.text(`S/N: ${informe.equipo.serial}`, margin + 8, yPos + 44);
                
                // Caja de Servicio
                doc.setFillColor(...colors.grayLight);
                doc.roundedRect(col2X, yPos, (pageWidth - margin*3)/2, 50, 3, 3, 'F');
                
                doc.setTextColor(...colors.primary);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('SERVICIO', col2X + 8, yPos + 12);
                
                doc.setTextColor(...colors.dark);
                doc.setFontSize(11);
                doc.text(informe.tecnico.nombre, col2X + 8, yPos + 24);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colors.grayText);
                doc.text(`Prioridad: ${informe.priority}`, col2X + 8, yPos + 34);
                doc.text(`Duración: ${informe.fechas.duracion}`, col2X + 8, yPos + 44);
                
                yPos += 65;
                
                // ========== CONTENIDO DEL INFORME ==========
                // Helper para agregar sección con estilo
                const addStyledSection = (title, items, icon) => {
                    if (!items || items.length === 0) return;
                    
                    yPos = this.checkPageBreak(doc, yPos, 50);
                    
                    // Título de sección con barra roja
                    doc.setFillColor(...colors.primary);
                    doc.rect(margin, yPos, 4, 14, 'F');
                    
                    doc.setTextColor(...colors.dark);
                    doc.setFontSize(13);
                    doc.setFont('helvetica', 'bold');
                    doc.text(title, margin + 10, yPos + 10);
                    yPos += 20;
                    
                    // Contenido
                    doc.setTextColor(...colors.dark);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    
                    items.forEach(item => {
                        const lines = doc.splitTextToSize(`• ${item}`, maxWidth - 15);
                        yPos = this.checkPageBreak(doc, yPos, lines.length * 6 + 4);
                        doc.text(lines, margin + 10, yPos);
                        yPos += lines.length * 6 + 4;
                    });
                    yPos += 8;
                };
                
                // Secciones del informe
                addStyledSection('DIAGNÓSTICO INICIAL', informe.contenido.diagnostico);
                addStyledSection('TRABAJO EJECUTADO', informe.contenido.trabajo);
                addStyledSection('SOLUCIÓN APLICADA', informe.contenido.solucion);
                addStyledSection('RECOMENDACIONES', informe.contenido.recomendaciones);
                
                // Comentario de cierre
                if (informe.contenido.cierre) {
                    yPos = this.checkPageBreak(doc, yPos, 60);
                    
                    doc.setFillColor(...colors.grayLight);
                    doc.roundedRect(margin, yPos, maxWidth, 40, 3, 3, 'F');
                    
                    doc.setTextColor(...colors.primary);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text('COMENTARIO DE CIERRE', margin + 8, yPos + 12);
                    
                    doc.setTextColor(...colors.dark);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    const cierreLines = doc.splitTextToSize(informe.contenido.cierre, maxWidth - 16);
                    doc.text(cierreLines, margin + 8, yPos + 24);
                    yPos += 50;
                }
                
                // ========== REGISTRO FOTOGRÁFICO ==========
                if (informe.fotos.length > 0) {
                    doc.addPage();
                    yPos = 20;
                    
                    // Header de página
                    doc.setFillColor(...colors.dark);
                    doc.rect(0, 0, pageWidth, 25, 'F');
                    doc.setTextColor(...colors.white);
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text('REGISTRO FOTOGRÁFICO', pageWidth / 2, 16, { align: 'center' });
                    
                    yPos = 35;
                    
                    let fotosEnPagina = 0;
                    const fotoWidth = 85;
                    const fotoHeight = 65;
                    
                    for (const foto of informe.fotos) {
                        if (fotosEnPagina >= 3) {
                            doc.addPage();
                            // Mini header
                            doc.setFillColor(...colors.dark);
                            doc.rect(0, 0, pageWidth, 15, 'F');
                            doc.setTextColor(...colors.white);
                            doc.setFontSize(10);
                            doc.text('REGISTRO FOTOGRÁFICO (cont.)', pageWidth / 2, 10, { align: 'center' });
                            yPos = 25;
                            fotosEnPagina = 0;
                        }
                        
                        try {
                            if (foto.data && foto.data.startsWith('data:image')) {
                                // Marco de la foto
                                doc.setDrawColor(...colors.border);
                                doc.setLineWidth(0.5);
                                doc.roundedRect(margin - 2, yPos - 2, fotoWidth + 4, fotoHeight + 4, 2, 2, 'S');
                                
                                doc.addImage(foto.data, 'JPEG', margin, yPos, fotoWidth, fotoHeight);
                                
                                doc.setTextColor(...colors.grayText);
                                doc.setFontSize(8);
                                doc.text(`Foto ${foto.id} - ${this.formatDate(foto.fecha)}`, margin, yPos + fotoHeight + 10);
                            }
                        } catch (error) {
                            console.error('Error agregando foto:', error);
                        }
                        
                        fotosEnPagina++;
                        yPos += fotoHeight + 20;
                    }
                }
                
                // ========== PÁGINA DE FIRMAS ==========
                doc.addPage();
                
                // Header
                doc.setFillColor(...colors.dark);
                doc.rect(0, 0, pageWidth, 25, 'F');
                doc.setTextColor(...colors.white);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('CONFORMIDAD Y FIRMAS', pageWidth / 2, 16, { align: 'center' });
                
                yPos = 50;
                
                // Texto de conformidad
                doc.setTextColor(...colors.dark);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const conformidadTexto = `Con la firma del presente documento, el cliente declara su conformidad con el trabajo realizado según lo descrito en este informe técnico. El servicio fue ejecutado por personal calificado de GYMTEC.`;
                const conformidadLines = doc.splitTextToSize(conformidadTexto, maxWidth);
                doc.text(conformidadLines, margin, yPos);
                yPos += 40;
                
                // Cajas de firma
                // Firma Técnico
                doc.setFillColor(...colors.grayLight);
                doc.roundedRect(margin, yPos, 75, 60, 3, 3, 'F');
                doc.setDrawColor(...colors.dark);
                doc.line(margin + 10, yPos + 45, margin + 65, yPos + 45);
                
                doc.setTextColor(...colors.primary);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('TÉCNICO RESPONSABLE', margin + 10, yPos + 10);
                
                doc.setTextColor(...colors.dark);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(informe.tecnico.nombre, margin + 10, yPos + 52);
                
                // Firma Cliente
                doc.setFillColor(...colors.grayLight);
                doc.roundedRect(pageWidth - margin - 75, yPos, 75, 60, 3, 3, 'F');
                doc.line(pageWidth - margin - 65, yPos + 45, pageWidth - margin - 10, yPos + 45);
                
                doc.setTextColor(...colors.primary);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('CLIENTE', pageWidth - margin - 65, yPos + 10);
                
                doc.setTextColor(...colors.grayText);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('Nombre y Firma', pageWidth - margin - 65, yPos + 52);
                
                yPos += 80;
                
                // Fecha
                doc.setTextColor(...colors.dark);
                doc.setFontSize(10);
                doc.text(`Fecha del servicio: ${this.formatDate(informe.fechas.cierre)}`, margin, yPos);
                doc.text('Fecha de firma: _______________', pageWidth - margin - 75, yPos);
                
                // ========== FOOTER EN TODAS LAS PÁGINAS ==========
                const totalPages = doc.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    
                    // Línea del footer
                    doc.setDrawColor(...colors.border);
                    doc.setLineWidth(0.5);
                    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
                    
                    // Texto del footer
                    doc.setTextColor(...colors.grayText);
                    doc.setFontSize(8);
                    doc.text('GYMTEC | Servicio Técnico de Gimnasios | www.gymtec.cl', margin, pageHeight - 8);
                    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
                }
                
                // Guardar PDF usando método nativo de jsPDF
                
                const blob = doc.output('blob');
                
                // Método 1: Abrir en nueva ventana usando data URL nativo de jsPDF
                // Este método evita blob URLs completamente
                doc.output('dataurlnewwindow', { filename: filename });
                console.log(`✅ PDF abierto con dataurlnewwindow: ${filename}`);
                console.log('💡 Usa Ctrl+S para guardar el PDF');
                
                // Retornar filename y blob para subirlo al servidor
                return { filename, blob };
                
            } catch (error) {
                console.error('Error generando PDF:', error);
                throw error;
            }
        };
        
        // Helper: Agregar sección con formato
        window.ReportsManager.prototype.addSection = function(doc, title, yPos) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 20, yPos);
            doc.setFont('helvetica', 'normal');
            return yPos;
        };
        
        // Helper: Verificar salto de página
        window.ReportsManager.prototype.checkPageBreak = function(doc, yPos, neededSpace) {
            const pageHeight = doc.internal.pageSize.getHeight();
            if (yPos + neededSpace > pageHeight - 20) {
                doc.addPage();
                return 20;
            }
            return yPos;
        };
        
        // Calcular duración entre fechas
        window.ReportsManager.prototype.calculateDuration = function(startDate, endDate) {
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
        window.ReportsManager.prototype.saveInformeRecord = async function(data) {
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

        // Subir PDF al servidor
        window.ReportsManager.prototype.uploadInformePDF = async function(informeId, pdfBlob, filename) {
            try {
                const formData = new FormData();
                formData.append('pdf', pdfBlob, filename);

                const response = await authenticatedFetch(`${API_URL}/informes/${informeId}/pdf`, {
                    method: 'POST',
                    body: formData // No setear Content-Type, fetch lo hace con boundary
                });

                if (!response.ok) throw new Error('Error subiendo PDF');
                console.log('✅ PDF subido al servidor');
                return true;
            } catch (error) {
                console.error('Error subiendo PDF:', error);
                this.showNotification('Error al subir respaldo del PDF', 'warning');
                return false;
            }
        };

        // Enviar informe por correo
        window.ReportsManager.prototype.sendInformeEmail = async function(informeId, email) {
            try {
                // Pedir email si no viene (o confirmar)
                const clientEmail = prompt("Ingrese el correo del cliente para enviar el informe:", email || "");
                if (!clientEmail) return;

                this.showNotification('Enviando correo...', 'info');

                const response = await authenticatedFetch(`${API_URL}/informes/${informeId}/enviar`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client_email: clientEmail })
                });

                if (response.ok) {
                    this.showNotification('Correo enviado exitosamente', 'success');
                } else {
                    throw new Error('Error del servidor al enviar correo');
                }
            } catch (error) {
                console.error('Error enviando correo:', error);
                this.showNotification('No se pudo enviar el correo', 'error');
            }
        };
        
        console.log('✅ Módulo de informes técnicos cargado correctamente');
        } else {
            console.warn('⚠️ ReportsManager no encontrado en este intento');
        }
    }
    
    // Función robusta para inicializar - maneja race conditions
    function initializeWhenReady() {
        // Intentar obtener ReportsManager de diferentes formas
        function tryGetReportsManager() {
            // Forma 1: Directamente desde window.ReportsManager
            if (typeof window.ReportsManager !== 'undefined') {
                return true;
            }
            // Forma 2: Desde el constructor de la instancia (fallback)
            if (window.reportsManager && window.reportsManager.constructor) {
                window.ReportsManager = window.reportsManager.constructor;
                console.log('✅ ReportsManager obtenido desde constructor de instancia');
                return true;
            }
            return false;
        }
        
        // Si ReportsManager ya existe o podemos obtenerlo, extender inmediatamente
        if (tryGetReportsManager()) {
            extendReportsManager();
            return;
        }
        
        // Si no existe aún, esperar con un intervalo (máximo 5 segundos)
        let attempts = 0;
        const maxAttempts = 50; // 50 * 100ms = 5 segundos
        const interval = setInterval(function() {
            attempts++;
            if (tryGetReportsManager()) {
                clearInterval(interval);
                extendReportsManager();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('⚠️ ReportsManager no disponible después de 5 segundos');
            }
        }, 100);
    }
    
    // Ejecutar ahora si el DOM ya está listo, o esperar al evento
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializeWhenReady, 100);
        });
    } else {
        // DOMContentLoaded ya pasó - ejecutar ahora
        setTimeout(initializeWhenReady, 100);
    }
})();
