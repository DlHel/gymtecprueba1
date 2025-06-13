// ===== EQUIPMENT DRAWER MANAGER =====

class EquipmentDrawer {
    constructor() {
        this.overlay = null;
        this.drawer = null;
        this.isOpen = false;
        this.currentEquipmentId = null;
        this.init();
    }

    init() {
        this.createDrawerHTML();
        this.bindEvents();
    }

    createDrawerHTML() {
        // Crear el overlay y drawer
        const drawerHTML = `
            <div class="equipment-drawer-overlay" id="equipmentDrawerOverlay">
                <div class="equipment-drawer">
                    <div class="equipment-drawer-header">
                        <h3 class="equipment-drawer-title">Detalle del Equipo</h3>
                        <button class="equipment-drawer-close" id="equipmentDrawerClose">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="equipment-drawer-content" id="equipmentDrawerContent">
                        <div class="equipment-loading">
                            <div class="spinner"></div>
                            <p>Cargando información del equipo...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar al body
        document.body.insertAdjacentHTML('beforeend', drawerHTML);
        
        // Obtener referencias
        this.overlay = document.getElementById('equipmentDrawerOverlay');
        this.drawer = this.overlay.querySelector('.equipment-drawer');
        this.content = document.getElementById('equipmentDrawerContent');
    }

    bindEvents() {
        // Botón cerrar
        const closeBtn = document.getElementById('equipmentDrawerClose');
        closeBtn.addEventListener('click', () => this.close());

        // Click en overlay para cerrar
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // ESC para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Permitir scroll dentro del drawer, prevenir scroll del body
        this.overlay.addEventListener('wheel', (e) => {
            // Solo prevenir si el scroll no es dentro del contenido del drawer
            if (e.target === this.overlay) {
                e.preventDefault();
            }
        });
    }

    async open(equipmentId) {
        if (this.isOpen && this.currentEquipmentId === equipmentId) {
            return; // Ya está abierto con el mismo equipo
        }

        this.currentEquipmentId = equipmentId;
        this.isOpen = true;

        // Mostrar overlay
        this.overlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';

        // Cargar contenido
        await this.loadEquipmentContent(equipmentId);
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.currentEquipmentId = null;

        // Ocultar overlay
        this.overlay.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    async loadEquipmentContent(equipmentId) {
        try {
            // Mostrar loading
            this.content.innerHTML = `
                <div class="equipment-loading">
                    <div class="spinner"></div>
                    <p>Cargando información del equipo...</p>
                </div>
            `;

            // Obtener datos del equipo
            const response = await fetch(`${API_URL}/equipment/${equipmentId}`);
            if (!response.ok) {
                throw new Error('Error al cargar el equipo');
            }

            const equipo = await response.json();
            
            // Generar contenido del drawer
            const content = await this.generateEquipmentContent(equipo);
            this.content.innerHTML = content;

            // Inicializar funcionalidades específicas
            this.initEquipmentFeatures(equipo);

        } catch (error) {
            console.error('Error loading equipment:', error);
            this.content.innerHTML = `
                <div class="equipment-error">
                    <p>Error al cargar la información del equipo</p>
                    <button class="equipment-btn equipment-btn-primary" onclick="equipmentDrawer.loadEquipmentContent(${equipmentId})">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    async generateEquipmentContent(equipo) {
        const formatDate = (dateString) => {
            return dateString ? new Date(dateString).toLocaleDateString('es-CL') : 'N/A';
        };

        // Usar el mismo contenido que equipo.html pero adaptado para drawer
        return `
            <div class="equipment-container">
                <!-- Información General -->
                <div class="equipment-card">
                    <h2 class="equipment-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Información General
                    </h2>
                    <div class="equipment-info-compact">
                        <div class="equipment-details-compact">
                            <div class="equipment-detail-item">
                                <span class="equipment-detail-label">Tipo</span>
                                <span class="equipment-detail-value">${equipo.type || 'N/A'}</span>
                            </div>
                            <div class="equipment-detail-item">
                                <span class="equipment-detail-label">Marca</span>
                                <span class="equipment-detail-value">${equipo.brand || 'N/A'}</span>
                            </div>
                            <div class="equipment-detail-item">
                                <span class="equipment-detail-label">Modelo</span>
                                <span class="equipment-detail-value">${equipo.model || equipo.name || 'N/A'}</span>
                            </div>
                            <div class="equipment-detail-item">
                                <span class="equipment-detail-label">Nº Serie</span>
                                <span class="equipment-detail-value serial">${equipo.serial_number || 'N/A'}</span>
                            </div>
                            <div class="equipment-detail-item">
                                <span class="equipment-detail-label">Fecha Adquisición</span>
                                <span class="equipment-detail-value">${formatDate(equipo.acquisition_date)}</span>
                            </div>
                            <div class="equipment-detail-item">
                                <span class="equipment-detail-label">Última Mantención</span>
                                <span class="equipment-detail-value">${formatDate(equipo.last_maintenance_date)}</span>
                            </div>
                        </div>
                        <div class="equipment-qr-compact">
                            <div class="equipment-qr-title">Identificador Único</div>
                            <div id="qrcode-drawer" class="equipment-qr-container-compact">
                                <!-- El código QR se generará aquí -->
                            </div>
                            <div class="equipment-custom-id-compact">${equipo.custom_id || equipo.id}</div>
                            <button id="print-qr-btn-drawer" class="equipment-btn equipment-btn-secondary equipment-btn-small">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6,9 6,2 18,2 18,9"></polyline>
                                    <path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18"></path>
                                    <line x1="6" y1="14" x2="18" y2="14"></line>
                                </svg>
                                Imprimir
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Foto del Modelo -->
                <div class="equipment-card" id="model-photo-section-drawer" style="display: none;">
                    <h2 class="equipment-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21,15 16,10 5,21"></polyline>
                        </svg>
                        Foto del Modelo
                    </h2>
                    <div class="equipment-model-photo-container" id="modelPhotoContainer-drawer">
                        <!-- La foto del modelo se cargará aquí -->
                    </div>
                </div>

                <!-- Fotos del Equipo -->
                <div class="equipment-card">
                    <div class="equipment-notes-header">
                        <h2 class="equipment-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21,15 16,10 5,21"></polyline>
                            </svg>
                            Fotos Específicas del Equipo
                        </h2>
                        <button id="add-photo-btn-drawer" class="equipment-btn equipment-btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Agregar Foto
                        </button>
                    </div>
                    
                    <!-- Input de archivo oculto -->
                    <input type="file" id="photo-input-drawer" accept="image/*" multiple style="display: none;">
                    
                    <!-- Galería de fotos -->
                    <div class="equipment-photos-gallery" id="photosGallery-drawer">
                        <!-- Las fotos se cargarán aquí -->
                    </div>
                </div>

                <!-- Notas -->
                <div class="equipment-card">
                    <div class="equipment-notes-header">
                        <h2 class="equipment-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 3v18h18V3H3z"></path>
                                <path d="M7 7h10"></path>
                                <path d="M7 11h10"></path>
                                <path d="M7 15h6"></path>
                            </svg>
                            Notas del Equipo
                        </h2>
                        <button id="add-note-btn-drawer" class="equipment-btn equipment-btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Agregar Nota
                        </button>
                    </div>
                    
                    <!-- Formulario para nueva nota (inicialmente oculto) -->
                    <div id="note-form-drawer" class="equipment-note-form hidden">
                        <textarea id="note-textarea-drawer" placeholder="Escribe tu nota aquí..." class="equipment-note-textarea" rows="4"></textarea>
                        <div class="equipment-note-actions">
                            <button id="cancel-note-btn-drawer" class="equipment-btn equipment-btn-ghost">Cancelar</button>
                            <button id="save-note-btn-drawer" class="equipment-btn equipment-btn-success">Guardar Nota</button>
                        </div>
                    </div>
                    
                    <div class="equipment-notes-list" id="notesList-drawer">
                        <!-- Las notas se cargarán aquí -->
                    </div>
                </div>

                <!-- Tickets -->
                <div class="equipment-card">
                    <h2 class="equipment-section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                        Historial de Tickets
                    </h2>
                    <div class="equipment-tickets-list" id="ticketsList-drawer">
                        <!-- Los tickets se cargarán aquí -->
                    </div>
                </div>
            </div>
        `;
    }

    initEquipmentFeatures(equipo) {
        // Generar QR Code
        this.generateQRCode(equipo);
        
        // Cargar notas
        this.loadNotes(equipo.id);
        
        // Cargar tickets
        this.loadTickets(equipo.id);
        
        // Cargar fotos
        this.loadPhotos(equipo.id);
        
        // Cargar foto del modelo si existe
        this.loadModelPhoto(equipo);
        
        // Configurar event listeners
        this.setupEquipmentEvents(equipo);
        
        // Configurar manejadores de fotos
        this.setupPhotoHandlers(equipo.id);
    }

    generateQRCode(equipo) {
        const qrContainer = document.getElementById('qrcode-drawer');
        if (qrContainer && equipo) {
            qrContainer.innerHTML = '';
            const qrUrl = `${window.location.origin}/equipo.html?id=${equipo.id}`;
            
            try {
                new QRCode(qrContainer, {
                    text: qrUrl,
                    width: 100,
                    height: 100,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                console.log('QR generado exitosamente en drawer');
            } catch (error) {
                console.error('Error al generar QR en drawer:', error);
                // Fallback: mostrar el texto del QR
                qrContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; border: 2px dashed #ccc; border-radius: 8px;">
                        <p style="font-size: 12px; color: #666; margin: 0;">QR Code</p>
                        <p style="font-size: 10px; color: #999; margin: 5px 0 0 0; word-break: break-all;">${qrUrl}</p>
                    </div>
                `;
            }
        }
    }

    async loadNotes(equipmentId) {
        try {
            const response = await fetch(`${API_URL}/equipment/${equipmentId}/notes`);
            const notas = await response.json();
            
            const notesList = document.getElementById('notesList-drawer');
            if (notesList) {
                if (notas.length === 0) {
                    notesList.innerHTML = '<div class="equipment-empty">No hay notas para este equipo.</div>';
                } else {
                    const notesHtml = notas.map(note => {
                        const date = new Date(note.created_at).toLocaleString('es-CL');
                        return `
                            <div class="equipment-note-item">
                                <div class="equipment-note-header">
                                    <div class="equipment-note-meta">
                                        <span class="equipment-note-date">${date}</span>
                                        <span class="equipment-note-author">Por: ${note.author || 'Sistema'}</span>
                                    </div>
                                    <button class="equipment-note-delete delete-note-btn-drawer" data-note-id="${note.id}" title="Eliminar nota">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3,6 5,6 21,6"></polyline>
                                            <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </div>
                                <div class="equipment-note-content">${note.note.replace(/\n/g, '<br>')}</div>
                            </div>
                        `;
                    }).join('');
                    notesList.innerHTML = notesHtml;
                }
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            const notesList = document.getElementById('notesList-drawer');
            if (notesList) {
                notesList.innerHTML = '<div class="equipment-error">Error al cargar notas</div>';
            }
        }
    }

    async loadTickets(equipmentId) {
        try {
            const response = await fetch(`${API_URL}/equipment/${equipmentId}/tickets`);
            const tickets = await response.json();
            
            const ticketsList = document.getElementById('ticketsList-drawer');
            if (ticketsList) {
                if (tickets.length === 0) {
                    ticketsList.innerHTML = '<div class="equipment-empty">No hay tickets para este equipo.</div>';
                } else {
                    const formatDate = (dateString) => {
                        return dateString ? new Date(dateString).toLocaleDateString('es-CL') : 'N/A';
                    };
                    
                    const ticketsHtml = tickets.map(t => `
                        <div class="equipment-ticket-item">
                            <div class="equipment-ticket-title">${t.title}</div>
                            <div class="equipment-ticket-description">${t.description}</div>
                            <div class="equipment-ticket-meta">
                                <span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    ${formatDate(t.created_at)}
                                </span>
                                <span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
                                        <path d="M13 13l6 6"></path>
                                    </svg>
                                    Estado: ${t.status}
                                </span>
                                <span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    Prioridad: ${t.priority}
                                </span>
                            </div>
                        </div>
                    `).join('');
                    ticketsList.innerHTML = ticketsHtml;
                }
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            const ticketsList = document.getElementById('ticketsList-drawer');
            if (ticketsList) {
                ticketsList.innerHTML = '<div class="equipment-error">Error al cargar tickets</div>';
            }
        }
    }

    // Configurar event listeners específicos del equipo
    setupEquipmentEvents(equipo) {
        // Event listener para imprimir QR
        const printBtn = document.getElementById('print-qr-btn-drawer');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printQR(equipo));
        }

        // Event listeners para notas
        const addNoteBtn = document.getElementById('add-note-btn-drawer');
        const cancelNoteBtn = document.getElementById('cancel-note-btn-drawer');
        const saveNoteBtn = document.getElementById('save-note-btn-drawer');

        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => this.showNoteForm());
        }
        if (cancelNoteBtn) {
            cancelNoteBtn.addEventListener('click', () => this.hideNoteForm());
        }
        if (saveNoteBtn) {
            saveNoteBtn.addEventListener('click', () => this.saveNote());
        }

        // Event listeners para eliminar notas (delegación de eventos)
        const notesList = document.getElementById('notesList-drawer');
        if (notesList) {
            notesList.addEventListener('click', (e) => {
                if (e.target.closest('.delete-note-btn-drawer')) {
                    const button = e.target.closest('.delete-note-btn-drawer');
                    const noteId = button.getAttribute('data-note-id');
                    this.deleteNote(noteId);
                }
            });
        }
    }

    // Métodos de funcionalidad
    printQR(equipo) {
        const qrContainer = document.getElementById('qrcode-drawer');
        const canvas = qrContainer?.querySelector('canvas');
        
        if (!canvas) {
            alert("El código QR no se ha generado todavía.");
            return;
        }

        const customId = equipo.custom_id || equipo.id || 'Equipo sin ID';
        const equipmentName = `${equipo.type} - ${equipo.model || equipo.name}`;
        
        // Crear ventana de impresión
        const printWindow = window.open('', 'PRINT', 'height=700,width=900');
        
        if (!printWindow) {
            alert('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueada por el navegador.');
            return;
        }

        const qrDataUrl = canvas.toDataURL('image/png');
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Imprimir QR - ${customId}</title>
                <style>
                    @media print {
                        @page { margin: 1cm; }
                        body { margin: 0; }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .qr-container {
                        border: 2px solid #000;
                        padding: 20px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    h1 {
                        font-size: 24px;
                        margin: 0 0 10px 0;
                        color: #333;
                    }
                    h2 {
                        font-size: 18px;
                        margin: 0 0 20px 0;
                        color: #666;
                        font-weight: normal;
                    }
                    .qr-image {
                        width: 300px;
                        height: 300px;
                        margin: 20px 0;
                    }
                    .custom-id {
                        font-family: 'Courier New', monospace;
                        font-size: 20px;
                        font-weight: bold;
                        margin-top: 15px;
                        letter-spacing: 2px;
                    }
                    .print-info {
                        margin-top: 30px;
                        font-size: 12px;
                        color: #888;
                    }
                    @media screen {
                        .no-print {
                            margin-top: 30px;
                        }
                        button {
                            padding: 10px 20px;
                            margin: 0 10px;
                            font-size: 16px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                        }
                        .print-btn {
                            background: #007bff;
                            color: white;
                        }
                        .close-btn {
                            background: #6c757d;
                            color: white;
                        }
                    }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <h1>${customId}</h1>
                    <h2>${equipmentName}</h2>
                    <img src="${qrDataUrl}" alt="Código QR" class="qr-image">
                    <div class="custom-id">${customId}</div>
                    <div class="print-info">
                        Gymtec ERP - ${new Date().toLocaleDateString('es-CL')}
                    </div>
                </div>
                <div class="no-print">
                    <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                    <button class="close-btn" onclick="window.close()">❌ Cerrar</button>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Esperar a que la ventana cargue completamente
        printWindow.onload = function() {
            console.log('Ventana de impresión cargada');
            printWindow.focus();
            
            // Dar un pequeño delay para asegurar que todo esté renderizado
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
    }

    showNoteForm() {
        const noteForm = document.getElementById('note-form-drawer');
        const textarea = document.getElementById('note-textarea-drawer');
        if (noteForm && textarea) {
            noteForm.classList.remove('hidden');
            textarea.focus();
        }
    }

    hideNoteForm() {
        const noteForm = document.getElementById('note-form-drawer');
        const textarea = document.getElementById('note-textarea-drawer');
        if (noteForm && textarea) {
            noteForm.classList.add('hidden');
            textarea.value = '';
        }
    }

    async saveNote() {
        const textarea = document.getElementById('note-textarea-drawer');
        const noteText = textarea?.value.trim();
        
        if (!noteText) {
            alert('Por favor, escribe una nota antes de guardar.');
            return;
        }
        
        try {
            console.log('Guardando nota...');
            const saveBtn = document.getElementById('save-note-btn-drawer');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Guardando...';
            }
            
            const response = await fetch(`${API_URL}/equipment/${this.currentEquipmentId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: noteText })
            });

            if (!response.ok) {
                throw new Error('Error al guardar la nota');
            }
            
            // Recargar las notas
            await this.loadNotes(this.currentEquipmentId);
            
            // Limpiar y ocultar formulario
            this.hideNoteForm();
            
            console.log('Nota guardada exitosamente');
            
        } catch (error) {
            console.error('Error al guardar la nota:', error);
            alert('Error al guardar la nota. Por favor, inténtalo de nuevo.');
        } finally {
            const saveBtn = document.getElementById('save-note-btn-drawer');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Nota';
            }
        }
    }

    async deleteNote(noteId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
            return;
        }
        
        try {
            console.log('Eliminando nota...');
            const response = await fetch(`${API_URL}/equipment/notes/${noteId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la nota');
            }
            
            // Recargar las notas
            await this.loadNotes(this.currentEquipmentId);
            
            console.log('Nota eliminada exitosamente');
            
        } catch (error) {
            console.error('Error al eliminar la nota:', error);
            alert('Error al eliminar la nota. Por favor, inténtalo de nuevo.');
        }
    }

    // ===== MÉTODOS PARA MANEJO DE FOTOS =====

    async loadModelPhoto(equipo) {
        const modelPhotoSection = document.getElementById('model-photo-section-drawer');
        const modelPhotoContainer = document.getElementById('modelPhotoContainer-drawer');
        
        if (!modelPhotoSection || !modelPhotoContainer) return;
        
        // Si el equipo no tiene model_id, ocultar la sección
        if (!equipo.model_id) {
            modelPhotoSection.style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/models/${equipo.model_id}/main-photo`);
            
            if (response.ok) {
                const photoData = await response.json();
                
                // Mostrar la sección y cargar la foto
                modelPhotoSection.style.display = 'block';
                modelPhotoContainer.innerHTML = `
                    <img src="data:${photoData.mime_type};base64,${photoData.photo_data}" 
                         alt="Foto del modelo ${equipo.model_name || equipo.model}" 
                         class="equipment-model-photo"
                         onclick="equipmentDrawer.viewPhoto('${photoData.photo_data}', '${photoData.mime_type}')"
                         title="Click para ver en tamaño completo">
                `;
            } else {
                // No hay foto del modelo, mostrar placeholder
                modelPhotoSection.style.display = 'block';
                modelPhotoContainer.innerHTML = `
                    <div class="equipment-model-photo-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21,15 16,10 5,21"></polyline>
                        </svg>
                        <p>No hay foto disponible para este modelo</p>
                        <small>${equipo.model_name || equipo.model || 'Modelo desconocido'}</small>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading model photo:', error);
            // En caso de error, ocultar la sección
            modelPhotoSection.style.display = 'none';
        }
    }

    async loadPhotos(equipmentId) {
        try {
            const response = await fetch(`${API_URL}/equipment/${equipmentId}/photos`);
            const photos = await response.json();
            
            const photosGallery = document.getElementById('photosGallery-drawer');
            if (photosGallery) {
                if (photos.length === 0) {
                    photosGallery.innerHTML = `
                        <div class="equipment-photos-empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21,15 16,10 5,21"></polyline>
                            </svg>
                            <p>No hay fotos para este equipo</p>
                        </div>
                    `;
                } else {
                    const photosHtml = photos.map(photo => `
                        <div class="equipment-photo-item">
                            <img src="data:${photo.mime_type};base64,${photo.photo_data}" alt="Foto del equipo">
                            <div class="equipment-photo-overlay">
                                <div class="equipment-photo-actions">
                                    <button class="equipment-photo-btn view" onclick="equipmentDrawer.viewPhoto('${photo.photo_data}', '${photo.mime_type}')" title="Ver foto">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
                                    <button class="equipment-photo-btn delete" onclick="equipmentDrawer.deletePhoto(${photo.id})" title="Eliminar foto">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3,6 5,6 21,6"></polyline>
                                            <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                    photosGallery.innerHTML = photosHtml;
                }
            }
        } catch (error) {
            console.error('Error loading photos:', error);
            const photosGallery = document.getElementById('photosGallery-drawer');
            if (photosGallery) {
                photosGallery.innerHTML = '<div class="equipment-error">Error al cargar fotos</div>';
            }
        }
    }

    setupPhotoHandlers(equipmentId) {
        // Botón agregar foto
        const addPhotoBtn = document.getElementById('add-photo-btn-drawer');
        const photoInput = document.getElementById('photo-input-drawer');

        if (addPhotoBtn && photoInput) {
            addPhotoBtn.addEventListener('click', () => {
                photoInput.click();
            });

            photoInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.uploadPhotos(equipmentId, e.target.files);
                }
            });
        }
    }

    async uploadPhotos(equipmentId, files) {
        const addPhotoBtn = document.getElementById('add-photo-btn-drawer');
        const originalText = addPhotoBtn.innerHTML;
        
        try {
            // Mostrar estado de carga
            addPhotoBtn.innerHTML = `
                <div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
                Subiendo...
            `;
            addPhotoBtn.disabled = true;

            for (let file of files) {
                // Validar tipo de archivo
                if (!file.type.startsWith('image/')) {
                    alert(`El archivo ${file.name} no es una imagen válida.`);
                    continue;
                }

                // Validar tamaño (máximo 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert(`El archivo ${file.name} es demasiado grande. Máximo 5MB.`);
                    continue;
                }

                // Convertir a base64
                const base64 = await this.fileToBase64(file);
                
                // Enviar al servidor
                const response = await fetch(`${API_URL}/equipment/${equipmentId}/photos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        photo_data: base64.split(',')[1], // Remover el prefijo data:image/...;base64,
                        mime_type: file.type,
                        filename: file.name
                    })
                });

                if (!response.ok) {
                    throw new Error(`Error al subir ${file.name}`);
                }
            }

            // Recargar galería
            await this.loadPhotos(equipmentId);
            
            // Limpiar input
            document.getElementById('photo-input-drawer').value = '';

        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Error al subir las fotos. Inténtalo de nuevo.');
        } finally {
            // Restaurar botón
            addPhotoBtn.innerHTML = originalText;
            addPhotoBtn.disabled = false;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    viewPhoto(photoData, mimeType) {
        // Crear modal para ver la foto
        const modal = document.createElement('div');
        modal.className = 'photo-modal';
        modal.innerHTML = `
            <div class="photo-modal-content">
                <button class="photo-modal-close">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <img src="data:${mimeType};base64,${photoData}" alt="Foto del equipo">
            </div>
        `;

        document.body.appendChild(modal);
        
        // Mostrar modal
        setTimeout(() => modal.classList.add('active'), 10);

        // Event listeners para cerrar
        const closeBtn = modal.querySelector('.photo-modal-close');
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => document.body.removeChild(modal), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    async deletePhoto(photoId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/equipment/photos/${photoId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la foto');
            }

            // Recargar galería
            await this.loadPhotos(this.currentEquipmentId);

        } catch (error) {
            console.error('Error deleting photo:', error);
            alert('Error al eliminar la foto. Inténtalo de nuevo.');
        }
    }
}

// Inicializar el drawer cuando el DOM esté listo
let equipmentDrawer;
document.addEventListener('DOMContentLoaded', () => {
    equipmentDrawer = new EquipmentDrawer();
});

// Función global para abrir el drawer
function openEquipmentDrawer(equipmentId) {
    if (equipmentDrawer) {
        equipmentDrawer.open(equipmentId);
    }
} 