document.addEventListener('DOMContentLoaded', () => {
    // CRÍTICO: Protección de autenticación PRIMERO
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado en equipo.js, redirigiendo a login...');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }
    
    console.log('✅ Usuario autenticado, cargando módulo de equipo...');    const API_URL = window.API_URL || 'http://localhost:3000/api';
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const backButton = document.querySelector('header a');

    const state = {
        equipment: null,
        tickets: [],
        notes: []
    };

    const api = {
        getEquipment: id => authenticatedFetch(`${API_URL}/equipment/${id}`).then(res => res.json()),
        getEquipmentTickets: id => authenticatedFetch(`${API_URL}/equipment/${id}/tickets`).then(res => res.json()),
        getEquipmentNotes: id => authenticatedFetch(`${API_URL}/equipment/${id}/notes`).then(res => res.json()),
        addEquipmentNote: (id, note) => authenticatedFetch(`${API_URL}/equipment/${id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(note)
        }).then(res => res.json()),
        deleteEquipmentNote: (noteId) => authenticatedFetch(`${API_URL}/equipment/notes/${noteId}`, {
            method: 'DELETE'
        }).then(res => res.json())
    };

    const render = {
        all: () => {
            const { equipment, tickets } = state;
            if (!equipment) {
                mainContent.innerHTML = '<div class="equipment-error">No se pudo cargar la información del equipo.</div>';
                return;
            }

            pageTitle.textContent = `${equipment.type} - ${equipment.model || equipment.name}`;

            const formatDate = (dateString) => {
                return dateString ? new Date(dateString).toLocaleDateString('es-CL') : 'N/A';
            };
            
            const ticketsHtml = tickets.length > 0 ? tickets.map(t => `
                <div class="equipment-ticket-item">
                    <div class="equipment-ticket-title">${t.title}</div>
                    <div class="equipment-ticket-description">${t.description}</div>
                    <div class="equipment-ticket-meta">
                        <span><i data-lucide="calendar"></i>${formatDate(t.created_at)}</span>
                        <span><i data-lucide="flag"></i>Estado: ${t.status}</span>
                        <span><i data-lucide="alert-circle"></i>Prioridad: ${t.priority}</span>
                    </div>
                </div>
            `).join('') : '<div class="equipment-empty">No hay tickets para este equipo.</div>';

            mainContent.innerHTML = `
                <div class="equipment-container">
                    <!-- Tarjeta de información general optimizada -->
                    <div class="equipment-card">
                        <h2 class="equipment-section-title">
                            <i data-lucide="info"></i>
                            Información General
                        </h2>
                        <div class="equipment-info-compact">
                            <!-- Detalles del equipo -->
                            <div class="equipment-details-compact">
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Tipo</span>
                                    <span class="equipment-detail-value">${equipment.type}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Marca</span>
                                    <span class="equipment-detail-value">${equipment.brand || 'N/A'}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Modelo</span>
                                    <span class="equipment-detail-value">${equipment.model || 'N/A'}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Nº Serie</span>
                                    <span class="equipment-detail-value serial">${equipment.serial_number || 'N/A'}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Fecha Adquisición</span>
                                    <span class="equipment-detail-value">${formatDate(equipment.acquisition_date)}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Última Mantención</span>
                                    <span class="equipment-detail-value">${formatDate(equipment.last_maintenance_date)}</span>
                                </div>
                            </div>
                            
                            <!-- QR Code compacto -->
                            <div class="equipment-qr-compact">
                                <div class="equipment-qr-title">Identificador Único</div>
                                <div id="qrcode" class="equipment-qr-container-compact">
                                    <!-- El código QR se generará aquí -->
                                </div>
                                <div class="equipment-custom-id-compact">${equipment.custom_id}</div>
                                <button id="print-qr-btn" class="equipment-btn equipment-btn-secondary equipment-btn-small">
                                    <i data-lucide="printer"></i> Imprimir
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjeta de Notas -->
                    <div class="equipment-card">
                        <div class="equipment-notes-header">
                            <h2 class="equipment-section-title">
                                <i data-lucide="sticky-note"></i>
                                Notas del Equipo
                            </h2>
                            <button id="add-note-btn" class="equipment-btn equipment-btn-primary">
                                <i data-lucide="plus"></i> Agregar Nota
                            </button>
                        </div>
                        
                        <!-- Formulario para nueva nota (inicialmente oculto) -->
                        <div id="note-form" class="equipment-note-form hidden">
                            <textarea id="note-textarea" placeholder="Escribe tu nota aquí..." class="equipment-note-textarea" rows="4"></textarea>
                            <div class="equipment-note-actions">
                                <button id="cancel-note-btn" class="equipment-btn equipment-btn-ghost">Cancelar</button>
                                <button id="save-note-btn" class="equipment-btn equipment-btn-success">Guardar Nota</button>
                            </div>
                        </div>
                        
                        <!-- Lista de notas -->
                        <div id="notes-container" class="equipment-notes-container">
                            <!-- Las notas se cargarán aquí -->
                        </div>
                    </div>

                    <!-- Tarjeta de Historial de Tickets -->
                    <div class="equipment-card">
                         <h2 class="equipment-section-title">
                             <i data-lucide="clipboard-list"></i>
                             Historial de Tickets
                         </h2>
                         <div class="equipment-tickets-list">${ticketsHtml}</div>
                    </div>
                </div>
            `;
            
            lucide.createIcons();
            
            // Generar QR
            if (state.equipment && state.equipment.custom_id) {
                console.log('Generando código QR...');
                const qrContainer = document.getElementById('qrcode');
                if (!qrContainer) {
                    console.error('No se encontró el contenedor del QR');
                    return;
                }
                qrContainer.innerHTML = ''; // Limpiar por si acaso
                const qrUrl = `${window.location.origin}${window.location.pathname}?id=${state.equipment.id}`;
                console.log('URL del QR:', qrUrl);
                
                try {
                    new QRCode(qrContainer, {
                        text: qrUrl,
                        width: 100,
                        height: 100,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                    console.log('QR generado exitosamente');
                } catch (error) {
                    console.error('Error al generar QR:', error);
                    qrContainer.innerHTML = '<p class="text-red-500">Error al generar código QR</p>';
                }
            } else {
                console.warn('No se puede generar QR: equipment o custom_id faltante');
            }
            
            // Cargar y renderizar notas
            render.notes();
        },
        
        notes: () => {
            const notesContainer = document.getElementById('notes-container');
            if (!notesContainer) return;
            
            if (state.notes.length === 0) {
                notesContainer.innerHTML = '<div class="equipment-empty">No hay notas para este equipo.</div>';
                return;
            }
            
            const notesHtml = state.notes.map(note => {
                const date = new Date(note.created_at).toLocaleString('es-CL');
                return `
                    <div class="equipment-note-item">
                        <div class="equipment-note-header">
                            <div class="equipment-note-meta">
                                <span class="equipment-note-date">${date}</span>
                                <span class="equipment-note-author">Por: ${note.author || 'Sistema'}</span>
                            </div>
                            <button class="equipment-note-delete delete-note-btn" data-note-id="${note.id}" title="Eliminar nota">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                        <div class="equipment-note-content">${note.note.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }).join('');
            
            notesContainer.innerHTML = notesHtml;
        },

        createEquipmentForm: () => {
            console.log('Renderizando formulario de creación de equipo...');
            
            mainContent.innerHTML = `
                <div class="equipment-container">
                    <!-- Formulario de creación de equipo -->
                    <div class="equipment-card">
                        <h2 class="equipment-section-title">
                            <i data-lucide="plus-circle"></i>
                            Crear Nuevo Equipo
                        </h2>
                        
                        <form id="create-equipment-form" class="equipment-form">
                            <div class="equipment-form-grid">
                                <div class="equipment-form-group">
                                    <label for="equipment-name" class="equipment-form-label">Nombre del Equipo *</label>
                                    <input type="text" id="equipment-name" name="name" class="equipment-form-input" required>
                                </div>
                                
                                <div class="equipment-form-group">
                                    <label for="equipment-type" class="equipment-form-label">Tipo de Equipo *</label>
                                    <select id="equipment-type" name="type" class="equipment-form-input" required>
                                        <option value="">Seleccionar tipo...</option>
                                        <option value="Cardiovascular">Cardiovascular</option>
                                        <option value="Fuerza">Fuerza</option>
                                        <option value="Funcional">Funcional</option>
                                        <option value="Accesorio">Accesorio</option>
                                    </select>
                                </div>
                                
                                <div class="equipment-form-group">
                                    <label for="equipment-brand" class="equipment-form-label">Marca</label>
                                    <input type="text" id="equipment-brand" name="brand" class="equipment-form-input">
                                </div>
                                
                                <div class="equipment-form-group">
                                    <label for="equipment-model" class="equipment-form-label">Modelo</label>
                                    <input type="text" id="equipment-model" name="model" class="equipment-form-input">
                                </div>
                                
                                <div class="equipment-form-group">
                                    <label for="equipment-serial" class="equipment-form-label">Número de Serie</label>
                                    <input type="text" id="equipment-serial" name="serial_number" class="equipment-form-input">
                                </div>
                                
                                <div class="equipment-form-group">
                                    <label for="equipment-client" class="equipment-form-label">Cliente *</label>
                                    <select id="equipment-client" name="client_id" class="equipment-form-input" required>
                                        <option value="">Seleccionar cliente...</option>
                                    </select>
                                </div>
                                
                                <div class="equipment-form-group">
                                    <label for="equipment-location" class="equipment-form-label">Ubicación *</label>
                                    <select id="equipment-location" name="location_id" class="equipment-form-input" required disabled>
                                        <option value="">Primero selecciona un cliente...</option>
                                    </select>
                                </div>
                                
                                <div class="equipment-form-group">
                                    <label for="equipment-acquisition-date" class="equipment-form-label">Fecha de Adquisición</label>
                                    <input type="date" id="equipment-acquisition-date" name="acquisition_date" class="equipment-form-input">
                                </div>
                                
                                <div class="equipment-form-group">
                                    <label for="equipment-installation-date" class="equipment-form-label">Fecha de Instalación</label>
                                    <input type="date" id="equipment-installation-date" name="installation_date" class="equipment-form-input">
                                </div>
                                
                                <div class="equipment-form-group full-width">
                                    <label for="equipment-description" class="equipment-form-label">Descripción</label>
                                    <textarea id="equipment-description" name="description" class="equipment-form-input" rows="3" placeholder="Describe las características especiales del equipo..."></textarea>
                                </div>
                            </div>
                            
                            <div class="equipment-form-actions">
                                <button type="button" id="cancel-equipment-btn" class="equipment-btn equipment-btn-ghost">
                                    <i data-lucide="x"></i> Cancelar
                                </button>
                                <button type="submit" id="save-equipment-btn" class="equipment-btn equipment-btn-primary">
                                    <i data-lucide="check"></i> Crear Equipo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            lucide.createIcons();
            
            // Cargar datos para los selectores
            actions.loadFormData();
            
            // Event listeners del formulario
            actions.setupFormEventListeners();
        }
    };

    const actions = {
        init: async () => {
            console.log('Iniciando carga de equipo...');
            const urlParams = new URLSearchParams(window.location.search);
            const equipmentId = urlParams.get('id');
            const clientId = urlParams.get('clientId');
            
            console.log('Parámetros URL:', { equipmentId, clientId });

            // Hacer el botón de volver inteligente
            if (clientId) {
                backButton.href = `clientes.html?openClient=${clientId}`;
            }

            // NUEVO: Soportar modo crear y modo editar
            if (!equipmentId) {
                console.log('Modo CREAR EQUIPO - No se proporcionó ID de equipo');
                // Cambiar título de la página
                document.getElementById('page-title').textContent = 'Crear Nuevo Equipo';
                
                // Renderizar formulario de creación
                render.createEquipmentForm();
                return;
            }

            try {
                console.log('Modo EDITAR EQUIPO - Cargando datos del equipo...');
                const [equipmentData, ticketsData, notesData] = await Promise.all([
                    api.getEquipment(equipmentId),
                    api.getEquipmentTickets(equipmentId),
                    api.getEquipmentNotes(equipmentId)
                ]);
                console.log('Datos cargados:', { equipmentData, ticketsData, notesData });
                state.equipment = equipmentData;
                state.tickets = ticketsData;
                state.notes = notesData;
                render.all();
                
            } catch (error) {
                console.error('Error al cargar los datos del equipo:', error);
                mainContent.innerHTML = `<div class="equipment-error">Error al cargar la información. ${error.message}</div>`;
            }
        },
        
        saveNote: async () => {
            const textarea = document.getElementById('note-textarea');
            const noteText = textarea.value.trim();
            
            if (!noteText) {
                alert('Por favor, escribe una nota antes de guardar.');
                return;
            }
            
            try {
                console.log('Guardando nota...');
                const saveBtn = document.getElementById('save-note-btn');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Guardando...';
                
                await api.addEquipmentNote(state.equipment.id, noteText);
                
                // Recargar las notas
                state.notes = await api.getEquipmentNotes(state.equipment.id);
                render.notes();
                
                // Limpiar y ocultar formulario
                const noteForm = document.getElementById('note-form');
                textarea.value = '';
                noteForm.classList.add('hidden');
                
                console.log('Nota guardada exitosamente');
                
            } catch (error) {
                console.error('Error al guardar la nota:', error);
                alert('Error al guardar la nota. Por favor, inténtalo de nuevo.');
            } finally {
                const saveBtn = document.getElementById('save-note-btn');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Nota';
            }
        },
        
        deleteNote: async (noteId) => {
            if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
                return;
            }
            
            try {
                console.log('Eliminando nota...');
                await api.deleteEquipmentNote(noteId);
                
                // Recargar las notas
                state.notes = await api.getEquipmentNotes(state.equipment.id);
                render.notes();
                
                console.log('Nota eliminada exitosamente');
                
            } catch (error) {
                console.error('Error al eliminar la nota:', error);
                alert('Error al eliminar la nota. Por favor, inténtalo de nuevo.');
            }
        },

        // NUEVAS FUNCIONES para el formulario de creación
        loadFormData: async () => {
            try {
                console.log('Cargando datos para el formulario...');
                
                // Cargar clientes
                const clientsResponse = await authenticatedFetch(`${API_URL}/clients`);
                if (!clientsResponse.ok) throw new Error('Error al cargar clientes');
                const clientsData = await clientsResponse.json();
                
                const clientSelect = document.getElementById('equipment-client');
                clientSelect.innerHTML = '<option value="">Seleccionar cliente...</option>';
                
                if (clientsData.data && clientsData.data.length > 0) {
                    clientsData.data.forEach(client => {
                        clientSelect.innerHTML += `<option value="${client.id}">${client.name}</option>`;
                    });
                }
                
                console.log('Datos del formulario cargados exitosamente');
                
            } catch (error) {
                console.error('Error al cargar datos del formulario:', error);
                alert('Error al cargar datos del formulario. Por favor, recarga la página.');
            }
        },

        loadLocations: async (clientId) => {
            try {
                console.log('Cargando ubicaciones para cliente:', clientId);
                
                const locationsResponse = await authenticatedFetch(`${API_URL}/locations?client_id=${clientId}`);
                if (!locationsResponse.ok) throw new Error('Error al cargar ubicaciones');
                const locationsData = await locationsResponse.json();
                
                const locationSelect = document.getElementById('equipment-location');
                locationSelect.innerHTML = '<option value="">Seleccionar ubicación...</option>';
                locationSelect.disabled = false;
                
                if (locationsData.data && locationsData.data.length > 0) {
                    locationsData.data.forEach(location => {
                        locationSelect.innerHTML += `<option value="${location.id}">${location.name}</option>`;
                    });
                } else {
                    locationSelect.innerHTML = '<option value="">No hay ubicaciones disponibles</option>';
                }
                
                console.log('Ubicaciones cargadas exitosamente');
                
            } catch (error) {
                console.error('Error al cargar ubicaciones:', error);
                const locationSelect = document.getElementById('equipment-location');
                locationSelect.innerHTML = '<option value="">Error al cargar ubicaciones</option>';
            }
        },

        setupFormEventListeners: () => {
            console.log('Configurando event listeners del formulario...');
            
            // Evento change del selector de cliente
            const clientSelect = document.getElementById('equipment-client');
            clientSelect.addEventListener('change', (e) => {
                const clientId = e.target.value;
                if (clientId) {
                    actions.loadLocations(clientId);
                } else {
                    const locationSelect = document.getElementById('equipment-location');
                    locationSelect.innerHTML = '<option value="">Primero selecciona un cliente...</option>';
                    locationSelect.disabled = true;
                }
            });

            // Evento submit del formulario
            const form = document.getElementById('create-equipment-form');
            form.addEventListener('submit', actions.handleFormSubmit);

            // Evento cancelar
            const cancelBtn = document.getElementById('cancel-equipment-btn');
            cancelBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que quieres cancelar? Se perderán los datos ingresados.')) {
                    window.location.href = 'clientes.html';
                }
            });
        },

        handleFormSubmit: async (e) => {
            e.preventDefault();
            
            console.log('Enviando formulario de creación de equipo...');
            
            const form = e.target;
            const formData = new FormData(form);
            const equipmentData = Object.fromEntries(formData);
            
            // Validar campos requeridos
            if (!equipmentData.name || !equipmentData.type || !equipmentData.client_id || !equipmentData.location_id) {
                alert('Por favor, completa todos los campos requeridos (*)');
                return;
            }
            
            try {
                const saveBtn = document.getElementById('save-equipment-btn');
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Creando...';
                
                console.log('Datos del equipo a crear:', equipmentData);
                
                const response = await authenticatedFetch(`${API_URL}/equipment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(equipmentData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al crear el equipo');
                }
                
                const result = await response.json();
                console.log('Equipo creado exitosamente:', result);
                
                alert('Equipo creado exitosamente');
                
                // Redirigir al detalle del equipo creado
                window.location.href = `equipo.html?id=${result.data.id}&clientId=${equipmentData.client_id}`;
                
            } catch (error) {
                console.error('Error al crear el equipo:', error);
                alert(`Error al crear el equipo: ${error.message}`);
            } finally {
                const saveBtn = document.getElementById('save-equipment-btn');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i data-lucide="check"></i> Crear Equipo';
                lucide.createIcons();
            }
        }
    };

    const events = {
        setup: () => {
            document.body.addEventListener('click', e => {
                // Manejar impresión de QR
                if (e.target.matches('#print-qr-btn, #print-qr-btn *')) {
                    e.preventDefault();
                    console.log('Iniciando impresión del QR...');
                    
                    const qrContainer = document.getElementById('qrcode');
                    const canvas = qrContainer.querySelector('canvas');
                    if (!canvas) {
                        alert("El código QR no se ha generado todavía.");
                        return;
                    }

                    const customId = state.equipment.custom_id || 'Equipo sin ID';
                    const equipmentName = `${state.equipment.type} - ${state.equipment.model || state.equipment.name}`;
                    
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
                    
                    console.log('Ventana de impresión creada');
                }
                
                // Manejar botón "Agregar Nota"
                if (e.target.matches('#add-note-btn')) {
                    e.preventDefault();
                    const noteForm = document.getElementById('note-form');
                    const textarea = document.getElementById('note-textarea');
                    noteForm.classList.remove('hidden');
                    textarea.focus();
                }
                
                // Manejar botón "Cancelar"
                if (e.target.matches('#cancel-note-btn')) {
                    e.preventDefault();
                    const noteForm = document.getElementById('note-form');
                    const textarea = document.getElementById('note-textarea');
                    noteForm.classList.add('hidden');
                    textarea.value = '';
                }
                
                // Manejar botón "Guardar Nota"
                if (e.target.matches('#save-note-btn')) {
                    e.preventDefault();
                    actions.saveNote();
                }
                
                // Manejar botón "Eliminar Nota"
                if (e.target.matches('.delete-note-btn, .delete-note-btn *')) {
                    e.preventDefault();
                    const button = e.target.closest('.delete-note-btn');
                    const noteId = button.getAttribute('data-note-id');
                    actions.deleteNote(noteId);
                }
            });
        }
    };

    actions.init();
    events.setup();
    lucide.createIcons();
}); 