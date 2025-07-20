// === DETALLE DE TICKETS - ARCHIVO PRINCIPAL REDISEÑADO ===

// Estado global de la aplicación
window.state = {
    currentTicket: null,
    timeEntries: [],
    notes: [],
    checklist: [],
    spareParts: [],
    photos: [],
    history: [],
    isTimerRunning: false,
    startTime: null,
    currentElapsedSeconds: 0,
    timerInterval: null,
    activeTab: 'overview'
};

// Referencia local para compatibilidad
const state = window.state;

// Referencias a elementos DOM
const elements = {
    loadingState: null,
    ticketContent: null,
    errorState: null,
    errorMessage: null,
    timerBtn: null,
    timerDisplay: null,
    timerStatus: null,
    contextualActions: null,
    editTicketBtn: null,
    printTicketBtn: null,
    // Contadores
    taskCounter: null,
    notesCounter: null,
    partsCounter: null,
    photosCounter: null,
    timerIndicator: null
};

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎫 Iniciando detalle de ticket mejorado...');
    console.log('🔗 API URL:', API_URL);
    
    // Obtener referencias DOM
    elements.loadingState = document.getElementById('loading-state');
    elements.ticketContent = document.getElementById('ticket-content');
    elements.errorState = document.getElementById('error-state');
    elements.errorMessage = document.getElementById('error-message');
    elements.timerBtn = document.getElementById('timer-btn');
    elements.timerDisplay = document.getElementById('timer-display');
    elements.timerStatus = document.getElementById('timer-status');
    elements.contextualActions = document.getElementById('contextual-actions');
    elements.editTicketBtn = document.getElementById('edit-ticket-btn');
    elements.printTicketBtn = document.getElementById('print-ticket-btn');
    
    // Contadores
    elements.taskCounter = document.getElementById('task-counter');
    elements.notesCounter = document.getElementById('notes-counter');
    elements.partsCounter = document.getElementById('parts-counter');
    elements.photosCounter = document.getElementById('photos-counter');
    elements.timerIndicator = document.getElementById('timer-indicator');
    
    console.log('📍 Elementos DOM encontrados:', {
        loadingState: !!elements.loadingState,
        ticketContent: !!elements.ticketContent,
        contextualActions: !!elements.contextualActions,
        editTicketBtn: !!elements.editTicketBtn,
        printTicketBtn: !!elements.printTicketBtn
    });
    
    // Configurar event listeners
    setupEventListeners();
    setupKeyboardShortcuts();
    
    // Cargar ticket desde URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    
    console.log('🆔 Ticket ID desde URL:', ticketId);
    
    if (ticketId) {
        await loadTicketDetail(ticketId);
    } else {
        showError('ID de ticket no especificado');
    }
});

// === FUNCIONES DE CARGA DE DATOS ===
async function loadTicketDetail(ticketId) {
    try {
        showLoading();
        console.log(`📡 Cargando detalle del ticket ${ticketId}...`);
        
        const response = await fetch(`${API_URL}/tickets/${ticketId}/detail`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📨 Respuesta recibida:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📄 Resultado parseado:', result);
        
        if (!result || (!result.success && result.message !== 'success')) {
            throw new Error(result?.error || 'Respuesta inválida del servidor');
        }
        
        if (!result.data) {
            throw new Error('No se recibieron datos del ticket');
        }
        
        if (!result.data.id) {
            throw new Error('Los datos del ticket no contienen un ID válido');
        }
        
        // Actualizar estado - la API devuelve los datos del ticket directamente en data
        const data = result.data;
        
        // Separar el ticket base de las relaciones
        state.currentTicket = {
            id: data.id,
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            client_id: data.client_id,
            location_id: data.location_id,
            equipment_id: data.equipment_id,
            assigned_technician_id: data.assigned_technician_id,
            created_at: data.created_at,
            updated_at: data.updated_at,
            due_date: data.due_date,
            // Campos calculados/con JOIN
            client_name: data.client_name || 'Cliente sin asignar',
            location_name: data.location_name || 'Sede sin asignar',
            location_address: data.location_address || '',
            equipment_name: data.equipment_name || 'Equipo sin asignar',
            equipment_custom_id: data.equipment_custom_id || '',
            equipment_serial: data.equipment_serial || '',
            equipment_model_name: data.equipment_model_name || '',
            equipment_brand: data.equipment_brand || '',
            assigned_to: data.technician_name || 'Sin asignar',
            checklist_auto_generated: data.checklist_auto_generated, // Nuevo campo
            equipment_category: data.equipment_category // Nuevo campo
        };
        
        // Cargar datos relacionados
        state.timeEntries = data.time_entries || [];
        state.notes = data.notes || [];
        state.checklist = data.checklist || [];
        state.spareParts = data.spare_parts || [];
        state.photos = data.photos || [];
        state.history = data.history || [];
        
        // Log para debug
        console.log('📊 Datos del ticket procesados:', {
            id: state.currentTicket.id,
            title: state.currentTicket.title,
            client: state.currentTicket.client_name,
            location: state.currentTicket.location_name,
            equipment: state.currentTicket.equipment_name
        });
        
        console.log('✅ Datos cargados exitosamente:', {
            ticket: !!state.currentTicket,
            ticketTitle: state.currentTicket?.title,
            timeEntries: state.timeEntries.length,
            notes: state.notes.length,
            checklist: state.checklist.length,
            spareParts: state.spareParts.length,
            photos: state.photos.length,
            history: state.history.length
        });
        
        // Renderizar interfaz
        renderTicketDetail();
        showContent();
        
    } catch (error) {
        console.error('❌ Error al cargar ticket:', error);
        showError(`Error al cargar el ticket: ${error.message}`);
    }
}

// === FUNCIONES DE RENDERIZADO ===
function renderTicketDetail() {
    console.log('🎨 Renderizando detalle del ticket...');
    
    if (!state.currentTicket) {
        console.warn('❌ No hay ticket para renderizar');
        return;
    }
    
    // Renderizar secciones principales
    renderTicketHeader(state.currentTicket);
    renderTicketDescription(state.currentTicket);
    renderTicketStats();
    renderStatusActions(state.currentTicket);
    renderChecklist();  // ✅ Agregar llamada a renderChecklist
    updateChecklistCounter();  // ✅ Agregar llamada a updateChecklistCounter
    renderPhotos();
    
    // Configurar event listeners para los nuevos elementos
    setupUnifiedEventListeners();
    
    // Actualizar título de la página
    document.title = `Ticket #${state.currentTicket.id} - ${state.currentTicket.title} - Gymtec ERP`;
    
    console.log('✅ Detalle del ticket renderizado');
}

function renderTicketHeader(ticket) {
    const header = document.getElementById('ticket-header');
    if (!header) return;
    
    const statusClass = getStatusClass(ticket.status);
    const priorityClass = getPriorityClass(ticket.priority);
    const slaClass = getSLAClass(ticket.due_date);
    
    header.innerHTML = `
        <h2>
            <i data-lucide="ticket" class="w-6 h-6"></i>
            Ticket #${ticket.id}: ${ticket.title}
        </h2>
        <div class="header-info">
            <div class="header-info-item">
                <i data-lucide="user" class="w-4 h-4"></i>
                <span>Cliente: ${ticket.client_name}</span>
            </div>
            <div class="header-info-item">
                <i data-lucide="map-pin" class="w-4 h-4"></i>
                <span>Sede: ${ticket.location_name}</span>
            </div>
            <div class="header-info-item">
                <i data-lucide="wrench" class="w-4 h-4"></i>
                <span>Equipo: ${ticket.equipment_name}</span>
            </div>
            <div class="header-info-item">
                <i data-lucide="calendar" class="w-4 h-4"></i>
                <span>Creado: ${formatDateTime(ticket.created_at)}</span>
            </div>
            <div class="header-info-item">
                <i data-lucide="clock" class="w-4 h-4"></i>
                <span>Vencimiento: ${formatDateTime(ticket.due_date)}</span>
            </div>
            <div class="header-info-item">
                <i data-lucide="user-check" class="w-4 h-4"></i>
                <span>Asignado a: ${ticket.assigned_to || 'Sin asignar'}</span>
            </div>
        </div>
    `;
    
    // Actualizar clase del header según estado
    header.className = `ticket-detail-header-improved status-${statusClass}`;
    
    // Inicializar iconos
    setTimeout(() => lucide.createIcons(), 10);
}

function getStatusClass(status) {
    const statusMap = {
        'Abierto': 'abierto',
        'En Progreso': 'progreso',
        'En Espera': 'espera',
        'Resuelto': 'resuelto',
        'Cerrado': 'cerrado'
    };
    return statusMap[status] || 'abierto';
}

function getPriorityClass(priority) {
    const priorityMap = {
        'Baja': 'baja',
        'Media': 'media',
        'Alta': 'alta',
        'Urgente': 'urgente'
    };
    return priorityMap[priority] || 'media';
}

function getSLAClass(dueDate) {
    if (!dueDate) return 'neutral';
    
    const now = new Date();
    const due = new Date(dueDate);
    const timeDiff = due - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff < 0) return 'red';
    if (hoursDiff < 24) return 'yellow';
    return 'green';
}

function renderTicketDescription(ticket) {
    const description = document.getElementById('ticket-description');
    if (!description) return;
    
    // Generar HTML de las notas
    let notesHtml = '';
    if (state.notes.length > 0) {
        notesHtml = `
            <div class="ticket-notes-in-summary">
                <h4 class="font-semibold text-blue-800 mb-3">
                    <i data-lucide="sticky-note" class="w-4 h-4 inline mr-1"></i>
                    Notas del Ticket (${state.notes.length})
                </h4>
                <div class="ticket-notes-summary-list">
                    ${state.notes.map(note => `
                        <div class="ticket-note-summary-item">
                            <div class="ticket-note-summary-header">
                                <span class="ticket-note-author">
                                    <i data-lucide="user" class="w-3 h-3"></i>
                                    ${note.author || 'Usuario'}
                                </span>
                                <span class="ticket-note-date">${formatDateTime(note.created_at)}</span>
                            </div>
                            <div class="ticket-note-summary-content">${note.note || note.content || 'Sin contenido'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    description.innerHTML = `
        <div class="ticket-description-text">
            ${ticket.description || 'Sin descripción disponible'}
        </div>
        ${ticket.diagnosis ? `
            <div class="ticket-diagnosis">
                <h4 class="font-semibold text-amber-800 mb-2">
                    <i data-lucide="search" class="w-4 h-4 inline mr-1"></i>
                    Diagnóstico
                </h4>
                <p class="text-amber-700">${ticket.diagnosis}</p>
            </div>
        ` : ''}
        ${ticket.solution ? `
            <div class="ticket-solution">
                <h4 class="font-semibold text-green-800 mb-2">
                    <i data-lucide="check-circle" class="w-4 h-4 inline mr-1"></i>
                    Solución
                </h4>
                <p class="text-green-700">${ticket.solution}</p>
            </div>
        ` : ''}
        ${notesHtml}
    `;
    
    setTimeout(() => lucide.createIcons(), 10);
}

function renderTicketStats() {
    const stats = document.getElementById('ticket-stats');
    if (!stats) return;
    
    const totalTime = calculateTotalTime();
    const completedTasks = state.checklist.filter(item => item.is_completed).length;
    const totalTasks = state.checklist.length;
    
    stats.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">
                <i data-lucide="clock" class="w-4 h-4"></i>
                <span>Tiempo Total</span>
            </div>
            <div class="stat-value">${formatDuration(totalTime)}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">
                <i data-lucide="check-square" class="w-4 h-4"></i>
                <span>Tareas</span>
            </div>
            <div class="stat-value">${completedTasks}/${totalTasks}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">
                <i data-lucide="sticky-note" class="w-4 h-4"></i>
                <span>Notas</span>
            </div>
            <div class="stat-value">${state.notes.length}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">
                <i data-lucide="camera" class="w-4 h-4"></i>
                <span>Fotos</span>
            </div>
            <div class="stat-value">${state.photos.length}</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">
                <i data-lucide="package" class="w-4 h-4"></i>
                <span>Repuestos</span>
            </div>
            <div class="stat-value">${state.spareParts.length}</div>
        </div>
    `;
    
    setTimeout(() => lucide.createIcons(), 10);
}

function renderStatusActions(ticket) {
    const statusActions = document.getElementById('status-actions');
    if (!statusActions) return;
    
    const statusClass = getStatusClass(ticket.status);
    const priorityClass = getPriorityClass(ticket.priority);
    const slaClass = getSLAClass(ticket.due_date);
    
    statusActions.innerHTML = `
        <div class="ticket-status-badge ${statusClass}">
            <i data-lucide="activity" class="w-4 h-4"></i>
            ${ticket.status}
        </div>
        
        <div class="ticket-badge priority-${priorityClass}">
            <i data-lucide="flag" class="w-4 h-4"></i>
            ${ticket.priority}
        </div>
        
        <div class="ticket-badge sla-${slaClass}">
            <i data-lucide="clock" class="w-4 h-4"></i>
            ${slaClass === 'red' ? 'Vencido' : slaClass === 'yellow' ? 'Próximo' : 'A tiempo'}
        </div>
        
        <button id="change-status-btn" class="ticket-action-btn primary" data-current-status="${ticket.status}">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            Cambiar Estado
        </button>
    `;
    
    setTimeout(() => lucide.createIcons(), 10);
}

// === CONFIGURACIÓN DE EVENTOS UNIFICADOS ===
function setupUnifiedEventListeners() {
    console.log('⚡ Configurando event listeners unificados...');
    
    // Botón para agregar nota
    const addNoteBtn = document.getElementById('add-note-btn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', handleAddNote);
    }
    
    // Botón para agregar checklist
    const addChecklistBtn = document.getElementById('add-checklist-btn');
    if (addChecklistBtn) {
        addChecklistBtn.addEventListener('click', showAddChecklistModal);
    }
    
    // Botón para agregar foto
    const addPhotoBtn = document.getElementById('add-photo-btn');
    if (addPhotoBtn) {
        addPhotoBtn.addEventListener('click', () => {
            document.getElementById('photo-input').click();
        });
    }
    
    // Input de foto
    const photoInput = document.getElementById('photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoSelection);
    }
    
    // Botón para subir foto
    const uploadPhotoBtn = document.getElementById('upload-photo-btn');
    if (uploadPhotoBtn) {
        uploadPhotoBtn.addEventListener('click', handlePhotoUpload);
    }
    
    // Botón de cambio de estado
    const changeStatusBtn = document.getElementById('change-status-btn');
    if (changeStatusBtn) {
        console.log('🔘 Configurando event listener para botón de cambio de estado');
        changeStatusBtn.addEventListener('click', () => {
            console.log('🖱️ Clic en botón de cambio de estado');
            const currentStatus = changeStatusBtn.dataset.currentStatus;
            console.log('📊 Estado actual del dataset:', currentStatus);
            changeStatus(currentStatus);
        });
    } else {
        console.warn('⚠️ No se encontró el botón de cambio de estado');
    }
}

// === FUNCIÓN PARA SUBIR FOTO ===
async function uploadPhoto(file) {
    try {
        const formData = new FormData();
        formData.append('photo', file);
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/photos`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Foto subida exitosamente:', result);
        
        // Recargar el ticket para mostrar la nueva foto
        await loadTicketDetail(state.currentTicket.id);
        
    } catch (error) {
        console.error('Error al subir foto:', error);
        showError('Error al subir la foto');
    }
}

// === FUNCIONES DE RENDERIZADO POR PESTAÑA ===
function renderTimeEntries() {
    const timeEntriesList = document.getElementById('time-entries-list');
    if (!timeEntriesList) return;
    
    if (state.timeEntries.length === 0) {
        timeEntriesList.innerHTML = `
            <div class="ticket-empty-state">
                <i data-lucide="clock" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3>No hay registros de tiempo</h3>
                <p>Inicia el timer para comenzar a registrar tiempo en este ticket</p>
            </div>
        `;
    } else {
        timeEntriesList.innerHTML = state.timeEntries.map(entry => `
            <div class="ticket-time-entry">
                <div class="ticket-time-entry-info">
                    <div class="ticket-time-entry-duration">${formatDuration(entry.duration_seconds)}</div>
                    <div class="ticket-time-entry-date">${formatDateTime(entry.start_time)}</div>
                    ${entry.description ? `<div class="ticket-time-entry-description">${entry.description}</div>` : ''}
                </div>
                <div class="ticket-time-entry-actions">
                    <button class="ticket-action-btn danger" onclick="deleteTimeEntry(${entry.id})">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    setTimeout(() => lucide.createIcons(), 10);
}

function renderChecklist() {
    console.log('🎯 Ejecutando renderChecklist()');
    const checklistItems = document.getElementById('checklist-items');
    console.log('📋 Elemento checklist-items encontrado:', !!checklistItems);
    console.log('📝 Datos del checklist:', state.checklist);
    
    if (!checklistItems) {
        console.warn('❌ No se encontró el elemento #checklist-items');
        return;
    }
    
    if (state.checklist.length === 0) {
        console.log('📋 No hay tareas en el checklist, mostrando estado vacío');
        
        // Mostrar mensaje específico si hay equipo pero no template
        const hasEquipment = state.currentTicket?.equipment_id;
        const emptyMessage = hasEquipment 
            ? `<div class="ticket-empty-state">
                <i data-lucide="check-square" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3>No hay checklist disponible</h3>
                <p>No se encontró una guía de mantenimiento para este tipo de equipo</p>
                <button onclick="showAddChecklistModal()" class="ticket-action-btn primary mt-3">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Agregar Tarea Manual
                </button>
            </div>`
            : `<div class="ticket-empty-state">
                <i data-lucide="check-square" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3>No hay tareas pendientes</h3>
                <p>Este ticket no tiene equipo asociado o no requiere checklist</p>
                <button onclick="showAddChecklistModal()" class="ticket-action-btn primary mt-3">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Agregar Primera Tarea
                </button>
            </div>`;
        
        checklistItems.innerHTML = emptyMessage;
    } else {
        console.log(`📝 Renderizando ${state.checklist.length} tareas del checklist`);
        
        // Header informativo si el checklist fue auto-generado
        let headerInfo = '';
        if (state.currentTicket?.checklist_auto_generated) {
            const category = state.currentTicket?.equipment_category || 'equipo';
            headerInfo = `
                <div class="checklist-auto-generated-info">
                    <div class="auto-generated-badge">
                        <i data-lucide="zap" class="w-4 h-4"></i>
                        <span>Guía de mantenimiento automática para equipos de ${category}</span>
                    </div>
                    <p class="auto-generated-description">
                        Este checklist se generó automáticamente basado en las mejores prácticas de mantenimiento 
                        para equipos de tipo <strong>${category}</strong>. Puedes marcar, editar o agregar más tareas según necesites.
                    </p>
                </div>
            `;
        }
        
        const checklistHTML = state.checklist
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map(item => `
            <div class="ticket-checklist-item ${item.is_completed ? 'completed' : ''}">
                <div class="checklist-item-checkbox">
                    <input type="checkbox" 
                           ${item.is_completed ? 'checked' : ''} 
                           data-item-id="${item.id}"
                           onchange="toggleChecklistItem(${item.id}, this.checked)"
                           class="form-checkbox">
                </div>
                <div class="checklist-item-content">
                    <div class="checklist-item-title">${item.title}</div>
                    ${item.description ? `<div class="checklist-item-description">${item.description}</div>` : ''}
                    ${item.is_completed && item.completed_at ? `
                        <div class="checklist-item-meta">
                            <i data-lucide="check-circle" class="w-3 h-3"></i>
                            Completada por ${item.completed_by || 'Usuario'} el ${formatDateTime(item.completed_at)}
                        </div>
                    ` : ''}
                </div>
                <div class="checklist-item-actions">
                    <button class="ticket-action-btn danger" onclick="deleteChecklistItem(${item.id})" title="Eliminar tarea">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        checklistItems.innerHTML = headerInfo + checklistHTML;
    }
    
    console.log('✅ Checklist renderizado exitosamente');
    setTimeout(() => lucide.createIcons(), 10);
}

function updateChecklistCounter() {
    const counter = document.getElementById('checklist-counter');
    if (!counter) return;
    
    const completedTasks = state.checklist.filter(item => item.is_completed).length;
    const totalTasks = state.checklist.length;
    
    counter.textContent = `${completedTasks}/${totalTasks}`;
    
    // Actualizar color del contador según progreso
    counter.className = 'ticket-counter-badge';
    if (totalTasks > 0) {
        const progress = completedTasks / totalTasks;
        if (progress === 1) {
            counter.classList.add('completed');
        } else if (progress > 0.5) {
            counter.classList.add('progress');
        } else {
            counter.classList.add('pending');
        }
    }
}

function renderNotes() {
    const notesList = document.getElementById('notes-list');
    if (!notesList) return;
    
    if (state.notes.length === 0) {
        notesList.innerHTML = `
            <div class="ticket-empty-state">
                <i data-lucide="sticky-note" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3>No hay notas</h3>
                <p>Agrega notas para documentar el progreso del ticket</p>
            </div>
        `;
    } else {
        notesList.innerHTML = state.notes.map(note => `
            <div class="ticket-note-item">
                <div class="ticket-note-header">
                    <div class="ticket-note-author">
                        <i data-lucide="user" class="w-4 h-4"></i>
                        ${note.author || 'Usuario'}
                    </div>
                    <div class="ticket-note-date">${formatDateTime(note.created_at)}</div>
                </div>
                <div class="ticket-note-content">${note.note || note.content || 'Sin contenido'}</div>
                <div class="ticket-note-actions">
                    <button class="ticket-action-btn danger" onclick="deleteNote(${note.id})">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Actualizar también el resumen para mostrar las notas actualizadas
    if (state.currentTicket) {
        renderTicketDescription(state.currentTicket);
    }
    
    setTimeout(() => lucide.createIcons(), 10);
}

function renderSpareParts() {
    const sparePartsList = document.getElementById('spare-parts-list');
    if (!sparePartsList) return;
    
    if (state.spareParts.length === 0) {
        sparePartsList.innerHTML = `
            <div class="ticket-empty-state">
                <i data-lucide="package" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3>No hay repuestos utilizados</h3>
                <p>Registra los repuestos utilizados en este ticket</p>
            </div>
        `;
    } else {
        sparePartsList.innerHTML = state.spareParts.map(part => `
            <div class="ticket-spare-part-item">
                <div class="ticket-spare-part-info">
                    <div class="ticket-spare-part-name">${part.spare_part_name || part.name || 'Repuesto'}</div>
                    <div class="ticket-spare-part-details">
                        <span class="ticket-spare-part-sku">${part.spare_part_sku || part.sku || 'N/A'}</span>
                        <span class="ticket-spare-part-quantity">Cantidad: ${part.quantity_used}</span>
                        ${part.unit_cost ? `<span class="ticket-spare-part-cost">Costo: $${part.unit_cost}</span>` : ''}
                    </div>
                    ${part.notes ? `<div class="ticket-spare-part-notes">${part.notes}</div>` : ''}
                </div>
                <div class="ticket-spare-part-actions">
                    <button class="ticket-action-btn danger" onclick="deleteSparePartUsage(${part.id})">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    setTimeout(() => lucide.createIcons(), 10);
}

function renderPhotos() {
    const photosGrid = document.getElementById('photos-grid');
    if (!photosGrid) return;
    
    if (state.photos.length === 0) {
        photosGrid.innerHTML = `
            <div class="ticket-empty-state">
                <i data-lucide="camera" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3>No hay fotos</h3>
                <p>Agrega fotos para documentar visualmente el ticket</p>
            </div>
        `;
    } else {
        photosGrid.innerHTML = state.photos.map(photo => `
            <div class="ticket-photo-item" onclick="viewPhoto(${photo.id})">
                <img src="${photo.file_path || (photo.photo_data ? `data:${photo.mime_type};base64,${photo.photo_data}` : '')}" 
                     alt="${photo.description || photo.file_name || 'Foto del ticket'}" 
                     loading="lazy">
                <div class="ticket-photo-overlay">
                    <div class="ticket-photo-type">${photo.photo_type || 'General'}</div>
                    ${photo.description ? `<div class="ticket-photo-description">${photo.description}</div>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    setTimeout(() => lucide.createIcons(), 10);
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    if (state.history.length === 0) {
        historyList.innerHTML = `
            <div class="ticket-empty-state">
                <i data-lucide="history" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3>No hay historial</h3>
                <p>El historial de cambios aparecerá aquí</p>
            </div>
        `;
    } else {
        historyList.innerHTML = state.history.map(item => `
            <div class="ticket-history-item">
                <div class="ticket-history-header">
                    <div class="ticket-history-action">${item.field_changed || item.action || 'Cambio'}: 
                        ${item.old_value ? `${item.old_value} → ${item.new_value}` : (item.description || 'Sin detalles')}
                    </div>
                    <div class="ticket-history-date">${formatDateTime(item.changed_at || item.created_at)}</div>
                </div>
                <div class="ticket-history-content">
                    ${item.changed_by ? `Por: ${item.changed_by}` : ''}
                </div>
            </div>
        `).join('');
    }
    
    setTimeout(() => lucide.createIcons(), 10);
}

// === ACCIONES CONTEXTUALES ===
function renderContextualActions() {
    if (!elements.contextualActions) return;
    
    const contextualConfig = {
        'overview': {
            title: 'Resumen del Ticket',
            info: 'Información general y estadísticas',
            actions: []
        },
        'time-tracking': {
            title: 'Control de Tiempo',
            info: `${state.timeEntries.length} registro(s) de tiempo`,
            actions: [
                {
                    text: 'Exportar Tiempos',
                    icon: 'download',
                    class: 'primary',
                    onclick: 'exportTimeEntries()'
                }
            ]
        },
        'checklist': {
            title: 'Lista de Tareas',
            info: `${state.checklist.filter(t => t.is_completed).length}/${state.checklist.length} completadas`,
            actions: [
                {
                    text: 'Agregar Tarea',
                    icon: 'plus',
                    class: 'primary',
                    onclick: 'showAddChecklistModal()'
                }
            ]
        },
        'notes': {
            title: 'Notas del Ticket',
            info: `${state.notes.length} nota(s)`,
            actions: [
                {
                    text: 'Agregar Nota',
                    icon: 'plus',
                    class: 'primary',
                    onclick: 'showAddNoteModal()'
                }
            ]
        },
        'spare-parts': {
            title: 'Repuestos Utilizados',
            info: `${state.spareParts.length} repuesto(s)`,
            actions: [
                {
                    text: 'Agregar Repuesto',
                    icon: 'plus',
                    class: 'primary',
                    onclick: 'showAddSparePartModal()'
                }
            ]
        },
        'photos': {
            title: 'Fotos del Servicio',
            info: `${state.photos.length} foto(s)`,
            actions: [
                {
                    text: 'Subir Foto',
                    icon: 'camera',
                    class: 'primary',
                    onclick: 'showAddPhotoModal()'
                }
            ]
        },
        'history': {
            title: 'Historial de Cambios',
            info: `${state.history.length} evento(s)`,
            actions: []
        }
    };
    
    const config = contextualConfig[state.activeTab] || contextualConfig.overview;
    
    elements.contextualActions.innerHTML = `
        <div class="actions-left">
            <div class="context-title">${config.title}</div>
            <div class="context-info">${config.info}</div>
        </div>
        <div class="actions-right">
            ${config.actions.map(action => `
                <button class="ticket-contextual-btn ${action.class || ''}" onclick="${action.onclick}">
                    <i data-lucide="${action.icon}" class="w-4 h-4"></i>
                    ${action.text}
                </button>
            `).join('')}
        </div>
    `;
    
    setTimeout(() => lucide.createIcons(), 10);
}

// === CONTADORES Y INDICADORES ===
function updateTabCounters() {
    const completedTasks = state.checklist.filter(item => item.is_completed).length;
    const totalTasks = state.checklist.length;
    
    // Actualizar contadores
    if (elements.taskCounter) {
        elements.taskCounter.textContent = `${completedTasks}/${totalTasks}`;
    }
    
    if (elements.notesCounter) {
        elements.notesCounter.textContent = state.notes.length;
    }
    
    if (elements.partsCounter) {
        elements.partsCounter.textContent = state.spareParts.length;
    }
    
    if (elements.photosCounter) {
        elements.photosCounter.textContent = state.photos.length;
    }
    
    // Actualizar indicador de timer
    if (elements.timerIndicator) {
        elements.timerIndicator.className = `timer-indicator ${state.isTimerRunning ? 'active' : ''}`;
    }
    
    // Actualizar status del timer
    if (elements.timerStatus) {
        elements.timerStatus.textContent = state.isTimerRunning ? 'Estado: Ejecutándose' : 'Estado: Detenido';
    }
}

// === NAVEGACIÓN DE PESTAÑAS ===
// Función removida - ya no tenemos pestañas

// === ATAJOS DE TECLADO ===
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S - Guardar (editar ticket)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (state.currentTicket) {
                editTicket(state.currentTicket.id);
            }
        }
        
        // Ctrl+P - Imprimir
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            printTicket();
        }
        
        // Ctrl+N - Agregar nota rápida
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            const noteTextarea = document.getElementById('new-note-text');
            if (noteTextarea) {
                noteTextarea.focus();
            }
        }
        
        // Escape para cerrar modales
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.base-modal');
            modals.forEach(modal => modal.remove());
        }
    });
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    // Botón de editar ticket
    if (elements.editTicketBtn) {
        elements.editTicketBtn.addEventListener('click', () => {
            if (state.currentTicket) {
                editTicket(state.currentTicket.id);
            }
        });
    }
    
    // Botón de imprimir
    if (elements.printTicketBtn) {
        elements.printTicketBtn.addEventListener('click', () => {
            printTicket();
        });
    }
    
    // Timer
    if (elements.timerBtn) {
        elements.timerBtn.addEventListener('click', toggleTimer);
    }
}

// === FUNCIONES DEL TIMER ===
function toggleTimer() {
    if (state.isTimerRunning) {
        stopTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    state.isTimerRunning = true;
    state.startTime = new Date();
    state.currentElapsedSeconds = 0;
    
    // Actualizar UI
    if (elements.timerBtn) {
        elements.timerBtn.innerHTML = '<i data-lucide="stop" class="w-5 h-5"></i><span>Detener</span>';
        elements.timerBtn.className = 'ticket-timer-btn-large stop';
    }
    
    // Iniciar interval
    state.timerInterval = setInterval(() => {
        state.currentElapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
    
    updateTabCounters();
    updateTimerDisplay();
    
    // Regenerar iconos
    setTimeout(() => lucide.createIcons(), 10);
}

async function stopTimer() {
    if (!state.isTimerRunning) return;
    
    state.isTimerRunning = false;
    
    // Detener interval
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    
    // Guardar entrada de tiempo
    if (state.currentElapsedSeconds > 0) {
        await saveTimeEntry(state.currentElapsedSeconds);
    }
    
    // Actualizar UI
    if (elements.timerBtn) {
        elements.timerBtn.innerHTML = '<i data-lucide="play" class="w-5 h-5"></i><span>Iniciar</span>';
        elements.timerBtn.className = 'ticket-timer-btn-large start';
    }
    
    // Reset timer
    state.currentElapsedSeconds = 0;
    state.startTime = null;
    
    updateTabCounters();
    updateTimerDisplay();
    
    // Regenerar iconos
    setTimeout(() => lucide.createIcons(), 10);
}

function updateTimerDisplay() {
    if (elements.timerDisplay) {
        elements.timerDisplay.textContent = formatDuration(state.currentElapsedSeconds);
    }
}

async function saveTimeEntry(durationSeconds) {
    if (!state.currentTicket) return;
    
    try {
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/time-entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                duration_seconds: durationSeconds,
                start_time: state.startTime.toISOString(),
                description: 'Sesión de trabajo'
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Actualizar estado
            state.timeEntries.push(result.data);
            
            // Re-renderizar
            renderTimeEntries();
            renderTicketStats();
            updateTabCounters();
            
            console.log('✅ Entrada de tiempo guardada:', result.data);
        } else {
            console.error('❌ Error al guardar entrada de tiempo:', result.error);
        }
    } catch (error) {
        console.error('❌ Error al guardar entrada de tiempo:', error);
    }
}

// === FUNCIONES AUXILIARES ===
function calculateTotalTime() {
    return state.timeEntries.reduce((total, entry) => total + (entry.duration_seconds || 0), 0);
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDateTime(dateString) {
    if (!dateString) return 'No especificado';
    
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// === FUNCIONES DE ESTADO ===
function showLoading() {
    if (elements.loadingState) elements.loadingState.classList.remove('hidden');
    if (elements.ticketContent) elements.ticketContent.classList.add('hidden');
    if (elements.errorState) elements.errorState.classList.add('hidden');
}

function showContent() {
    if (elements.loadingState) elements.loadingState.classList.add('hidden');
    if (elements.ticketContent) elements.ticketContent.classList.remove('hidden');
    if (elements.errorState) elements.errorState.classList.add('hidden');
}

function showError(message) {
    if (elements.loadingState) elements.loadingState.classList.add('hidden');
    if (elements.ticketContent) elements.ticketContent.classList.add('hidden');
    if (elements.errorState) elements.errorState.classList.remove('hidden');
    if (elements.errorMessage) elements.errorMessage.textContent = message;
}

// === FUNCIONES DE MODALES Y ACCIONES ===
function editTicket(ticketId) {
    console.log(`✏️ Abriendo modal de edición para ticket ${ticketId}`);
    
    if (!state.currentTicket) {
        console.error('❌ No hay ticket cargado para editar');
        return;
    }
    
    if (typeof createEditTicketModal !== 'function') {
        console.error('❌ La función createEditTicketModal no está definida');
        return;
    }
    
    try {
        const modal = createEditTicketModal(state.currentTicket);
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        setTimeout(() => {
            modal.classList.add('is-open');
        }, 10);
        
        lucide.createIcons();
        
        console.log('✅ Modal de edición abierto correctamente');
    } catch (error) {
        console.error('❌ Error al crear el modal:', error);
    }
}

function changeStatus(currentStatus) {
    console.log('🔄 Cambiando estado de:', currentStatus);
    console.log('📋 Estado actual del ticket:', window.state.currentTicket);
    
    try {
        const modal = createStatusChangeModal(currentStatus);
        document.body.appendChild(modal);
        
        // Mostrar modal con clase correcta
        setTimeout(() => {
            modal.classList.add('is-open');
            lucide.createIcons();
        }, 10);
        
        console.log('✅ Modal de cambio de estado abierto correctamente');
    } catch (error) {
        console.error('❌ Error al abrir modal de cambio de estado:', error);
        alert('Error al abrir el modal de cambio de estado');
    }
}

function closeStatusModal() {
    const modal = document.getElementById('status-change-modal');
    if (modal) {
        modal.classList.remove('is-open');
        setTimeout(() => modal.remove(), 300);
    }
}

function showAddNoteModal() {
    const modal = createAdvancedNoteModal();
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    lucide.createIcons();
}

function showAddChecklistModal() {
    // Crear modal dinámico para agregar tarea al checklist
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.id = 'add-checklist-modal';
    modal.innerHTML = `
        <div class="base-modal-content modal-small">
            <div class="base-modal-header">
                <h3 class="base-modal-title">
                    <i data-lucide="plus-circle" class="w-5 h-5 text-blue-600 mr-2"></i>
                    Agregar Nueva Tarea
                </h3>
                <button type="button" class="base-modal-close" onclick="closeChecklistModal()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="base-modal-body">
                <form id="add-checklist-form" class="space-y-6">
                    <div class="form-group">
                        <label for="checklist-title" class="form-label required">
                            <i data-lucide="check-square" class="w-4 h-4 text-blue-500"></i>
                            Título de la tarea
                        </label>
                        <input type="text" 
                               id="checklist-title" 
                               name="title" 
                               class="form-input form-input-modern" 
                               placeholder="Ej: Verificar conexiones eléctricas, lubricar componentes..."
                               required 
                               maxlength="200"
                               autocomplete="off">
                        <p class="form-help-text">Descripción clara y específica de la tarea a realizar</p>
                    </div>
                    
                    <div class="form-group">
                        <label for="checklist-description" class="form-label">
                            <i data-lucide="align-left" class="w-4 h-4 text-green-500"></i>
                            Descripción detallada
                            <span class="text-sm text-gray-500 font-normal ml-1">(opcional)</span>
                        </label>
                        <textarea id="checklist-description" 
                                  name="description" 
                                  class="form-textarea form-textarea-modern" 
                                  rows="4" 
                                  placeholder="Instrucciones específicas, herramientas necesarias, precauciones de seguridad..."
                                  maxlength="500"></textarea>
                        <p class="form-help-text">Detalles adicionales que ayuden al técnico a completar la tarea</p>
                    </div>
                </form>
            </div>
            
            <div class="base-modal-footer">
                <button type="button" class="base-btn base-btn-secondary" onclick="closeChecklistModal()">
                    <i data-lucide="x" class="w-4 h-4"></i>
                    Cancelar
                </button>
                <button type="button" class="base-btn base-btn-primary" onclick="submitChecklistItem()">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                    Agregar Tarea
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Mostrar modal
    setTimeout(() => {
        modal.classList.add('is-open');
        document.getElementById('checklist-title').focus();
        lucide.createIcons();
    }, 10);
}

function closeChecklistModal() {
    const modal = document.getElementById('add-checklist-modal');
    if (modal) {
        modal.classList.remove('is-open');
        setTimeout(() => modal.remove(), 300);
    }
}

async function submitChecklistItem() {
    const form = document.getElementById('add-checklist-form');
    const formData = new FormData(form);
    
    const title = formData.get('title').trim();
    const description = formData.get('description').trim();
    
    if (!title) {
        alert('El título de la tarea es obligatorio');
        return;
    }
    
    try {
        const submitBtn = document.querySelector('#add-checklist-modal .base-btn-primary');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Agregando...';
        
        await addChecklistItem(title, description);
        closeChecklistModal();
        
    } catch (error) {
        console.error('Error al agregar tarea:', error);
        alert('Error al agregar la tarea. Inténtalo de nuevo.');
        
        const submitBtn = document.querySelector('#add-checklist-modal .base-btn-primary');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Agregar Tarea';
    }
}

async function addChecklistItem(title, description = '') {
    try {
        console.log('🎯 Agregando nueva tarea al checklist:', { title, description });
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/checklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description,
                order_index: state.checklist.length
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Tarea agregada exitosamente:', result);
        
        // Agregar al estado local
        const newItem = {
            id: result.data.id,
            title,
            description,
            is_completed: false,
            completed_at: null,
            completed_by: null,
            order_index: state.checklist.length,
            created_at: new Date().toISOString()
        };
        
        state.checklist.push(newItem);
        
        // Re-renderizar checklist
        renderChecklist();
        updateChecklistCounter();
        renderTicketStats();
        
        console.log('🔄 Checklist actualizado en interfaz');
        
    } catch (error) {
        console.error('❌ Error al agregar tarea al checklist:', error);
        throw error;
    }
}

async function toggleChecklistItem(itemId, isCompleted) {
    try {
        console.log('🔄 Cambiando estado de tarea:', { itemId, isCompleted, type: typeof isCompleted });
        
        // Asegurar que is_completed sea boolean
        const completed = Boolean(isCompleted);
        
        const response = await fetch(`${API_URL}/tickets/checklist/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                is_completed: completed,
                completed_by: completed ? 'Felipe Maturana' : null
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error response:', { status: response.status, statusText: response.statusText, data: errorData });
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Estado de tarea actualizado:', result);
        
        // Actualizar estado local DESPUÉS de confirmar éxito del backend
        const item = state.checklist.find(item => item.id == itemId); // Usar == por si hay diferencia de tipos
        if (item) {
            item.is_completed = completed;
            item.completed_at = completed ? new Date().toISOString() : null;
            item.completed_by = completed ? 'Felipe Maturana' : null;
            console.log('🔄 Item actualizado localmente:', item);
        } else {
            console.warn('⚠️ Item no encontrado en estado local:', itemId);
        }
        
        // Re-renderizar checklist sin recargar la página
        renderChecklist();
        updateChecklistCounter();
        renderTicketStats();
        
    } catch (error) {
        console.error('❌ Error al cambiar estado de tarea:', error);
        
        // Revertir el checkbox si hay error
        const checkbox = document.querySelector(`input[data-item-id="${itemId}"]`);
        if (checkbox) {
            checkbox.checked = !isCompleted;
            console.log('🔄 Checkbox revertido:', { itemId, originalState: !isCompleted });
        }
        
        alert(`Error al actualizar el estado de la tarea: ${error.message}`);
    }
}

async function deleteChecklistItem(itemId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando tarea del checklist:', itemId);
        
        const response = await fetch(`${API_URL}/tickets/checklist/${itemId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ Tarea eliminada exitosamente');
        
        // Remover del estado local
        state.checklist = state.checklist.filter(item => item.id !== itemId);
        
        // Re-renderizar checklist
        renderChecklist();
        updateChecklistCounter();
        renderTicketStats();
        
    } catch (error) {
        console.error('❌ Error al eliminar tarea:', error);
        alert('Error al eliminar la tarea. Inténtalo de nuevo.');
    }
}

async function deleteSparePartUsage(usageId) {
    // Implementación existente...
    console.log('Eliminando uso de repuesto:', usageId);
} 

// === EXPOSICIÓN GLOBAL DE FUNCIONES PARA MODALES ===
window.renderTicketHeader = renderTicketHeader;
window.renderStatusActions = renderStatusActions;
window.renderNotes = renderNotes;
window.renderTicketStats = renderTicketStats;
window.state = window.state; // Ya asignado arriba, pero para claridad

// === FUNCIONES DE MANEJO DE EVENTOS ===

async function handleAddNote() {
    const noteTextarea = document.getElementById('new-note-text');
    if (!noteTextarea) return;
    
    const noteText = noteTextarea.value.trim();
    if (!noteText) {
        alert('Por favor escribe una nota antes de agregarla');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                note: noteText,
                note_type: 'General',
                author: 'Felipe Maturana'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Nota agregada exitosamente:', result);
        
        // Agregar al estado local
        const newNote = {
            id: result.data.id,
            note: noteText,
            note_type: 'General',
            author: 'Felipe Maturana',
            is_internal: false,
            created_at: new Date().toISOString()
        };
        
        state.notes.unshift(newNote);
        
        // Limpiar textarea y actualizar interfaz
        noteTextarea.value = '';
        renderTicketDescription(state.currentTicket); // Actualizar el resumen que muestra notas
        renderTicketStats();
        
        console.log('🔄 Nota agregada y interfaz actualizada');
        
    } catch (error) {
        console.error('❌ Error al agregar nota:', error);
        alert('Error al agregar la nota. Inténtalo de nuevo.');
    }
}

function handlePhotoSelection(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const photoPreview = document.getElementById('photo-preview');
    const previewImage = document.getElementById('preview-image');
    
    if (!photoPreview || !previewImage) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona solo archivos de imagen');
        e.target.value = '';
        return;
    }
    
    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        e.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        photoPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function handlePhotoUpload() {
    const photoInput = document.getElementById('photo-input');
    const file = photoInput.files[0];
    
    if (!file) {
        alert('No hay foto seleccionada');
        return;
    }
    
    try {
        const uploadBtn = document.getElementById('upload-photo-btn');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Subiendo...';
        
        // Convertir imagen a base64
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        
        // Obtener información del archivo
        const fileName = file.name || 'foto.jpg';
        const mimeType = file.type || 'image/jpeg';
        const fileSize = file.size || 0;
        
        console.log('📸 Información del archivo:', { fileName, mimeType, fileSize });
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                photo_data: base64,
                file_name: fileName,
                mime_type: mimeType,
                file_size: fileSize,
                description: `Foto del ticket ${state.currentTicket.id}`,
                photo_type: 'Evidencia'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Foto subida exitosamente:', result);
        
        // Agregar al estado local
        const newPhoto = {
            id: result.data.id,
            photo_data: base64,
            description: `Foto del ticket ${state.currentTicket.id}`,
            category: 'general',
            uploaded_at: new Date().toISOString()
        };
        
        state.photos.push(newPhoto);
        
        // Limpiar input y ocultar preview
        photoInput.value = '';
        document.getElementById('photo-preview').classList.add('hidden');
        
        // Actualizar interfaz
        renderPhotos();
        renderTicketStats();
        
        console.log('🔄 Foto agregada y interfaz actualizada');
        
    } catch (error) {
        console.error('❌ Error al subir foto:', error);
        alert('Error al subir la foto. Inténtalo de nuevo.');
    } finally {
        const uploadBtn = document.getElementById('upload-photo-btn');
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i data-lucide="upload" class="w-4 h-4"></i> Subir Foto';
    }
}