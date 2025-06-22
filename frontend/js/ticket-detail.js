// === DETALLE DE TICKETS - ARCHIVO PRINCIPAL ===

// Estado global de la aplicación
const state = {
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
    timerInterval: null
};

// Referencias a elementos DOM
const elements = {
    loadingState: null,
    ticketContent: null,
    errorState: null,
    errorMessage: null,
    timerBtn: null,
    timerDisplay: null
};

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎫 Iniciando detalle de ticket...');
    console.log('🔗 API URL:', API_URL);
    
    // Obtener referencias DOM
    elements.loadingState = document.getElementById('loading-state');
    elements.ticketContent = document.getElementById('ticket-content');
    elements.errorState = document.getElementById('error-state');
    elements.errorMessage = document.getElementById('error-message');
    elements.timerBtn = document.getElementById('timer-btn');
    elements.timerDisplay = document.getElementById('timer-display');
    
    console.log('📍 Elementos DOM encontrados:', {
        loadingState: !!elements.loadingState,
        ticketContent: !!elements.ticketContent,
        errorState: !!elements.errorState,
        errorMessage: !!elements.errorMessage,
        timerBtn: !!elements.timerBtn,
        timerDisplay: !!elements.timerDisplay
    });
    
    // Configurar event listeners
    setupEventListeners();
    setupTabNavigation();
    
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
        console.log(`🌐 URL completa: ${API_URL}/tickets/${ticketId}/detail`);
        
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
        
        // Verificar si la respuesta es válida
        if (!result || (!result.success && result.message !== 'success')) {
            console.log('❌ Resultado no exitoso:', result);
            throw new Error(result?.error || 'Respuesta inválida del servidor');
        }
        
        // Verificar que tenemos datos
        if (!result.data) {
            throw new Error('No se recibieron datos del ticket');
        }
        
        // Actualizar estado - manejar formato actual de la API
        const data = result.data;
        console.log('📊 Datos del ticket:', data);
        
        // El ticket viene directamente en data
        state.currentTicket = data;
        state.timeEntries = data.time_entries || [];
        state.notes = data.notes || [];
        state.checklist = data.checklist || [];
        state.spareParts = data.spare_parts || [];
        state.photos = data.photos || [];
        state.history = data.history || [];
        
        console.log('✅ Estado actualizado:', {
            ticket: !!state.currentTicket,
            timeEntries: state.timeEntries.length,
            notes: state.notes.length,
            checklist: state.checklist.length,
            spareParts: state.spareParts.length,
            photos: state.photos.length,
            history: state.history.length
        });
        
        // Renderizar contenido
        renderTicketDetail();
        showContent();
        
    } catch (error) {
        console.error('❌ Error loading ticket:', error);
        console.error('❌ Stack trace:', error.stack);
        showError(`Error al cargar el ticket: ${error.message}`);
    }
}

// === FUNCIONES DE RENDERIZADO ===
function renderTicketDetail() {
    if (!state.currentTicket) return;
    
    renderTicketHeader(state.currentTicket);
    renderTicketStats();
    renderTicketDescription(state.currentTicket);
    renderQuickActions(state.currentTicket);
    renderTimeEntries();
    renderChecklist();
    renderNotes();
    renderSpareParts();
    renderPhotos();
    renderHistory();
    
    // Reinicializar iconos
    lucide.createIcons();
}

function renderTicketHeader(ticket) {
    const header = document.getElementById('ticket-header');
    if (!header) return;
    
    const sla = calculateSLAStatus(ticket.due_date);
    
    header.innerHTML = `
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <h1 class="text-2xl font-bold text-gray-900">Ticket #${ticket.id}</h1>
                    <div class="flex gap-2">
                        <span class="status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}">${ticket.status}</span>
                        <span class="priority-badge priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                        <span class="sla-badge ${sla.class}">${sla.text}</span>
                    </div>
                </div>
                <h2 class="text-lg text-gray-700 font-medium">${ticket.title}</h2>
                <div class="flex items-center gap-4 text-sm text-gray-500 mt-2">
                    <span><i data-lucide="calendar" class="w-4 h-4 inline mr-1"></i>Creado: ${formatDateTime(ticket.created_at)}</span>
                    <span><i data-lucide="user" class="w-4 h-4 inline mr-1"></i>Cliente: ${ticket.client_name || 'No asignado'}</span>
                    <span><i data-lucide="wrench" class="w-4 h-4 inline mr-1"></i>Equipo: ${ticket.equipment_name || 'No especificado'}</span>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="editTicket(${ticket.id})" class="btn-secondary flex items-center gap-2">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                    Editar
                </button>
                <button onclick="changeStatus('${ticket.status}')" class="btn-primary flex items-center gap-2">
                    <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    Cambiar Estado
                </button>
            </div>
        </div>
    `;
}

function renderTicketStats() {
    const stats = document.getElementById('ticket-stats');
    if (!stats) return;
    
    const totalTime = calculateTotalTime();
    const completedTasks = state.checklist.filter(item => item.is_completed).length;
    const totalTasks = state.checklist.length;
    
    stats.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="stat-card">
                <div class="stat-icon bg-blue-100 text-blue-600">
                    <i data-lucide="clock" class="w-5 h-5"></i>
                </div>
                <div>
                    <div class="stat-value">${formatDuration(totalTime)}</div>
                    <div class="stat-label">Tiempo Total</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-green-100 text-green-600">
                    <i data-lucide="check-circle" class="w-5 h-5"></i>
                </div>
                <div>
                    <div class="stat-value">${completedTasks}/${totalTasks}</div>
                    <div class="stat-label">Tareas</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-purple-100 text-purple-600">
                    <i data-lucide="message-circle" class="w-5 h-5"></i>
                </div>
                <div>
                    <div class="stat-value">${state.notes.length}</div>
                    <div class="stat-label">Notas</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-orange-100 text-orange-600">
                    <i data-lucide="camera" class="w-5 h-5"></i>
                </div>
                <div>
                    <div class="stat-value">${state.photos.length}</div>
                    <div class="stat-label">Fotos</div>
                </div>
            </div>
        </div>
    `;
}

function renderTicketDescription(ticket) {
    const description = document.getElementById('ticket-description');
    if (!description) return;
    
    description.innerHTML = `
        <div class="prose max-w-none">
            <p>${ticket.description || 'Sin descripción disponible'}</p>
        </div>
    `;
}

function renderQuickActions(ticket) {
    const actions = document.getElementById('quick-actions');
    if (!actions) {
        console.warn('❌ Contenedor quick-actions no encontrado');
        return;
    }
    
    console.log('🎯 Renderizando acciones rápidas...');
    
    actions.innerHTML = `
        <button onclick="showAddNoteModal()" class="action-btn btn-primary-action">
            <i data-lucide="message-circle-plus" class="w-4 h-4"></i>
            Agregar Nota
        </button>
        <button onclick="showAddChecklistModal()" class="action-btn btn-secondary-action">
            <i data-lucide="list-plus" class="w-4 h-4"></i>
            Agregar Tarea
        </button>
        <button onclick="showAddSparePartModal()" class="action-btn btn-secondary-action">
            <i data-lucide="package-plus" class="w-4 h-4"></i>
            Agregar Repuesto
        </button>
        <button onclick="showAddPhotoModal()" class="action-btn btn-secondary-action">
            <i data-lucide="camera-plus" class="w-4 h-4"></i>
            Subir Foto
        </button>
        <button onclick="printTicket()" class="action-btn btn-secondary-action">
            <i data-lucide="printer" class="w-4 h-4"></i>
            Imprimir
        </button>
    `;
    
    console.log('✅ Acciones rápidas renderizadas');
}

function renderTimeEntries() {
    const container = document.getElementById('time-entries-list');
    if (!container) {
        console.warn('❌ Contenedor time-entries-list no encontrado');
        return;
    }
    
    if (state.timeEntries.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay registros de tiempo</p>';
        return;
    }
    
    container.innerHTML = state.timeEntries.map(entry => `
        <div class="time-entry-card">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <i data-lucide="clock" class="w-4 h-4 text-blue-500"></i>
                        <span class="font-medium">${formatDuration(entry.duration_seconds)}</span>
                        <span class="text-sm text-gray-500">por ${entry.technician_name || 'Técnico'}</span>
                    </div>
                    <div class="text-sm text-gray-600 mb-2">
                        ${formatDateTime(entry.start_time)} - ${formatDateTime(entry.end_time)}
                    </div>
                    ${entry.description ? `<p class="text-sm text-gray-700">${entry.description}</p>` : ''}
                </div>
                <button onclick="deleteTimeEntry(${entry.id})" class="text-red-500 hover:text-red-700 p-1">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderChecklist() {
    const container = document.getElementById('checklist-items');
    if (!container) return;
    
    if (state.checklist.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay tareas en el checklist</p>';
        return;
    }
    
    container.innerHTML = state.checklist.map(item => `
        <div class="checklist-item ${item.is_completed ? 'completed' : ''}">
            <div class="flex items-center gap-3">
                <input type="checkbox" 
                       ${item.is_completed ? 'checked' : ''} 
                       onchange="toggleChecklistItem(${item.id}, this.checked)"
                       class="form-checkbox">
                <span class="flex-1 ${item.is_completed ? 'line-through text-gray-500' : ''}">${item.title}</span>
                <div class="flex gap-1">
                    ${item.is_completed ? `<span class="text-xs text-green-600">✓ ${item.completed_by}</span>` : ''}
                    <button onclick="deleteChecklistItem(${item.id})" class="text-red-500 hover:text-red-700 p-1">
                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderNotes() {
    const container = document.getElementById('notes-list');
    if (!container) return;
    
    if (state.notes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay notas</p>';
        return;
    }
    
    container.innerHTML = state.notes.map(note => `
        <div class="note-card">
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span class="note-type-badge note-type-${note.note_type.toLowerCase()}">${note.note_type}</span>
                    ${note.is_internal ? '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Interno</span>' : ''}
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500">${formatDateTime(note.created_at)}</span>
                    <button onclick="deleteNote(${note.id})" class="text-red-500 hover:text-red-700 p-1">
                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>
                </div>
            </div>
            <p class="text-gray-700 mb-2">${note.note}</p>
            <div class="text-xs text-gray-500">Por: ${note.author}</div>
        </div>
    `).join('');
}

function renderSpareParts() {
    const container = document.getElementById('spare-parts-list');
    if (!container) return;
    
    if (state.spareParts.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No se han utilizado repuestos</p>';
        return;
    }
    
    let totalCost = 0;
    
    const html = state.spareParts.map(part => {
        const cost = (part.quantity_used * (part.unit_cost || 0));
        totalCost += cost;
        
        return `
            <div class="spare-part-card">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-medium">${part.spare_part_name}</span>
                            <span class="text-sm text-gray-500">(${part.spare_part_sku})</span>
                        </div>
                        <div class="text-sm text-gray-600 mb-2">
                            Cantidad: ${part.quantity_used} × $${part.unit_cost || 0} = $${cost.toLocaleString()}
                        </div>
                        ${part.notes ? `<p class="text-sm text-gray-700">${part.notes}</p>` : ''}
                    </div>
                    <button onclick="deleteSparePartUsage(${part.id})" class="text-red-500 hover:text-red-700 p-1">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html + `
        <div class="mt-4 p-3 bg-gray-50 rounded-lg">
            <div class="flex justify-between items-center font-medium">
                <span>Costo Total en Repuestos:</span>
                <span class="text-lg">$${totalCost.toLocaleString()}</span>
            </div>
        </div>
    `;
}

function renderPhotos() {
    const container = document.getElementById('photos-grid');
    if (!container) return;
    
    if (state.photos.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay fotos adjuntas</p>';
        return;
    }
    
    container.innerHTML = state.photos.map(photo => `
        <div class="photo-card" onclick="viewPhoto(${photo.id})">
            <img src="data:${photo.mime_type};base64,${photo.photo_data}" 
                 alt="${photo.file_name}" 
                 class="photo-thumbnail">
            <div class="photo-info">
                <div class="photo-type">${photo.photo_type}</div>
                <div class="photo-name">${photo.file_name}</div>
            </div>
        </div>
    `).join('');
}

function renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;
    
    if (state.history.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay historial de cambios</p>';
        return;
    }
    
    container.innerHTML = state.history.map(entry => `
        <div class="history-entry">
            <div class="history-icon">
                <i data-lucide="edit" class="w-3 h-3"></i>
            </div>
            <div class="history-content">
                <div class="history-title">
                    ${entry.field_changed}: <span class="text-red-500">${entry.old_value}</span> → <span class="text-green-500">${entry.new_value}</span>
                </div>
                <div class="history-meta">
                    ${entry.changed_by} • ${formatDateTime(entry.changed_at)}
                </div>
            </div>
        </div>
    `).join('');
}

// === FUNCIONES DE EVENTOS ===
function setupEventListeners() {
    if (elements.timerBtn) {
        elements.timerBtn.addEventListener('click', toggleTimer);
    }
}

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('📋 Configurando navegación de pestañas...');
    console.log('🔍 Botones encontrados:', tabButtons.length);
    console.log('🔍 Contenidos encontrados:', tabContents.length);
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            console.log('🖱️ Clic en pestaña:', targetTab);
            
            // Actualizar botones
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Actualizar contenido
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${targetTab}`) {
                    content.classList.add('active');
                    console.log('✅ Pestaña activada:', content.id);
                }
            });
        });
    });
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
    
    state.timerInterval = setInterval(updateTimerDisplay, 1000);
    
    // Actualizar botón
    elements.timerBtn.innerHTML = `
        <i data-lucide="pause" class="w-4 h-4"></i>
        Pausar
    `;
    elements.timerBtn.className = 'timer-btn timer-stop';
    lucide.createIcons();
    
    console.log('⏱️ Timer iniciado');
}

async function stopTimer() {
    if (!state.isTimerRunning || !state.startTime) return;
    
    state.isTimerRunning = false;
    clearInterval(state.timerInterval);
    
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - state.startTime) / 1000);
    
    // Guardar entrada de tiempo
    await saveTimeEntry(durationSeconds);
    
    // Resetear timer
    state.startTime = null;
    state.currentElapsedSeconds = 0;
    
    // Actualizar botón
    elements.timerBtn.innerHTML = `
        <i data-lucide="play" class="w-4 h-4"></i>
        Iniciar
    `;
    elements.timerBtn.className = 'timer-btn timer-start';
    lucide.createIcons();
    
    console.log('⏱️ Timer detenido, duración:', durationSeconds, 'segundos');
}

function updateTimerDisplay() {
    let seconds = 0;
    
    if (state.isTimerRunning && state.startTime) {
        const now = new Date();
        seconds = Math.floor((now - state.startTime) / 1000);
        state.currentElapsedSeconds = seconds; // Actualizar el estado
    } else {
        seconds = state.currentElapsedSeconds;
    }
    
    if (elements.timerDisplay) {
        elements.timerDisplay.textContent = formatDuration(seconds);
    }
}

async function saveTimeEntry(durationSeconds) {
    try {
        console.log(`⏰ Guardando entrada de tiempo: ${formatDuration(durationSeconds)}`);
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/time-entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start_time: state.startTime.toISOString(),
                end_time: new Date().toISOString(),
                duration_seconds: durationSeconds,
                description: `Sesión de trabajo de ${formatDuration(durationSeconds)}`
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Entrada de tiempo guardada exitosamente');
            
            // Agregar la nueva entrada al estado local
            if (result.data) {
                state.timeEntries.unshift(result.data); // Agregar al inicio para orden DESC
            } else {
                // Si no viene el objeto completo, crear uno básico
                state.timeEntries.unshift({
                    id: Date.now(), // ID temporal
                    ticket_id: state.currentTicket.id,
                    start_time: state.startTime.toISOString(),
                    end_time: new Date().toISOString(),
                    duration_seconds: durationSeconds,
                    description: `Sesión de trabajo de ${formatDuration(durationSeconds)}`,
                    technician_name: 'Felipe Maturana',
                    created_at: new Date().toISOString()
                });
            }
            
            // Re-renderizar solo las entradas de tiempo y estadísticas
            renderTimeEntries();
            renderTicketStats();
            lucide.createIcons();
            
        } else {
            throw new Error('Error al guardar entrada de tiempo');
        }
    } catch (error) {
        console.error('❌ Error saving time entry:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error al guardar el tiempo trabajado', 'error');
        } else {
            alert('Error al guardar el tiempo trabajado');
        }
    }
}

// === FUNCIONES DE UTILIDAD ===
function calculateSLAStatus(dueDate) {
    if (!dueDate) {
        return { class: 'sla-green', text: 'Sin SLA definido' };
    }
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = (due - now) / (1000 * 60 * 60);
    
    if (diffHours < 0) {
        return { class: 'sla-red', text: `Vencido hace ${Math.abs(Math.floor(diffHours))}h` };
    } else if (diffHours <= 24) {
        return { class: 'sla-yellow', text: `Vence en ${Math.floor(diffHours)}h` };
    } else {
        return { class: 'sla-green', text: `Vence en ${Math.floor(diffHours / 24)}d` };
    }
}

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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// === FUNCIONES DE ESTADO ===
function showLoading() {
    if (elements.loadingState) elements.loadingState.style.display = 'block';
    if (elements.ticketContent) elements.ticketContent.style.display = 'none';
    if (elements.errorState) elements.errorState.style.display = 'none';
}

function showContent() {
    if (elements.loadingState) elements.loadingState.style.display = 'none';
    if (elements.ticketContent) elements.ticketContent.style.display = 'block';
    if (elements.errorState) elements.errorState.style.display = 'none';
}

function showError(message) {
    if (elements.loadingState) elements.loadingState.style.display = 'none';
    if (elements.ticketContent) elements.ticketContent.style.display = 'none';
    if (elements.errorState) elements.errorState.style.display = 'block';
    if (elements.errorMessage) elements.errorMessage.textContent = message;
}

// === FUNCIONES DE ACCIONES ===
function editTicket(ticketId) {
    console.log(`✏️ Abriendo modal de edición para ticket ${ticketId}`);
    
    if (!state.currentTicket) {
        console.error('❌ No hay ticket cargado para editar');
        showNotification('Error: No se pudo cargar el ticket para editar', 'error');
        return;
    }
    
    // Crear y mostrar el modal de edición
    const modal = createEditTicketModal(state.currentTicket);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    lucide.createIcons();
    
    console.log('✅ Modal de edición abierto correctamente');
}

function changeStatus(currentStatus) {
    const modal = createStatusChangeModal(currentStatus);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    lucide.createIcons();
}

function showAddNoteModal() {
    const modal = createAdvancedNoteModal();
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    lucide.createIcons();
}

function showAddChecklistModal() {
    const title = prompt('Título de la tarea:');
    if (title) {
        addChecklistItem(title);
    }
}

async function showAddSparePartModal() {
    // Obtener lista de repuestos disponibles
    try {
        const response = await fetch(`${API_URL}/spare-parts`);
        const result = await response.json();
        const spareParts = result.data || [];
        
        if (spareParts.length === 0) {
            alert('No hay repuestos disponibles en el inventario');
            return;
        }
        
        // Crear modal dinámico
        const modal = createSparePartModal(spareParts);
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        lucide.createIcons();
        
    } catch (error) {
        console.error('Error loading spare parts:', error);
        alert('Error al cargar repuestos disponibles');
    }
}

function showAddPhotoModal() {
    const modal = createPhotoModal();
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    lucide.createIcons();
}

function printTicket() {
    window.print();
}

function viewPhoto(photoId) {
    const photo = state.photos.find(p => p.id === photoId);
    if (!photo) return;
    
    const modal = createPhotoViewerModal(photo);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    lucide.createIcons();
}

// === FUNCIONES DE API ===
async function addNote(noteText) {
    try {
        console.log(`📝 Agregando nueva nota: ${noteText.substring(0, 50)}...`);
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                note: noteText,
                note_type: 'Comentario',
                author: 'Felipe Maturana'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Nota agregada exitosamente');
            
            // Agregar la nueva nota al estado local
            if (result.data) {
                state.notes.unshift(result.data); // Agregar al inicio para orden DESC
            } else {
                // Si no viene el objeto completo, crear uno básico
                state.notes.unshift({
                    id: Date.now(), // ID temporal
                    note: noteText,
                    note_type: 'Comentario',
                    author: 'Felipe Maturana',
                    is_internal: false,
                    created_at: new Date().toISOString()
                });
            }
            
            // Re-renderizar solo las notas
            renderNotes();
            lucide.createIcons();
            
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('❌ Error adding note:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error al agregar la nota', 'error');
        } else {
            alert('Error al agregar la nota');
        }
    }
}

async function addChecklistItem(title) {
    try {
        console.log(`➕ Agregando nueva tarea: ${title}`);
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/checklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Tarea agregada exitosamente');
            
            // Agregar la nueva tarea al estado local
            if (result.data) {
                state.checklist.push(result.data);
            } else {
                // Si no viene el objeto completo, crear uno básico
                state.checklist.push({
                    id: Date.now(), // ID temporal
                    title: title,
                    is_completed: false,
                    completed_by: null,
                    completed_at: null,
                    created_at: new Date().toISOString()
                });
            }
            
            // Re-renderizar solo el checklist
            renderChecklist();
            renderTicketStats();
            lucide.createIcons();
            
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('❌ Error adding checklist item:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error al agregar la tarea', 'error');
        } else {
            alert('Error al agregar la tarea');
        }
    }
}

async function toggleChecklistItem(itemId, isCompleted) {
    try {
        console.log(`🔄 Actualizando checklist item ${itemId} a ${isCompleted ? 'completado' : 'pendiente'}`);
        
        const response = await fetch(`${API_URL}/tickets/checklist/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                is_completed: isCompleted,
                completed_by: 'Felipe Maturana'
            })
        });
        
        if (response.ok) {
            console.log('✅ Checklist item actualizado exitosamente');
            
            // Actualizar solo el estado local del checklist
            const checklistItem = state.checklist.find(item => item.id === itemId);
            if (checklistItem) {
                checklistItem.is_completed = isCompleted;
                checklistItem.completed_by = isCompleted ? 'Felipe Maturana' : null;
                checklistItem.completed_at = isCompleted ? new Date().toISOString() : null;
            }
            
            // Re-renderizar solo el checklist sin recargar toda la página
            renderChecklist();
            
            // Actualizar estadísticas sin scroll
            renderTicketStats();
            
            // Reinicializar iconos
            lucide.createIcons();
            
        } else {
            throw new Error('Error en la respuesta del servidor');
        }
    } catch (error) {
        console.error('❌ Error updating checklist item:', error);
        
        // Revertir el checkbox en caso de error
        const checkbox = document.querySelector(`input[onchange*="${itemId}"]`);
        if (checkbox) {
            checkbox.checked = !isCompleted;
        }
        
        // Mostrar notificación de error
        if (typeof showNotification === 'function') {
            showNotification('Error al actualizar la tarea', 'error');
        } else {
            alert('Error al actualizar la tarea');
        }
    }
}

async function deleteTimeEntry(entryId) {
    if (confirm('¿Eliminar esta entrada de tiempo?')) {
        try {
            console.log(`🗑️ Eliminando entrada de tiempo ${entryId}`);
            
            const response = await fetch(`${API_URL}/tickets/time-entries/${entryId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ Entrada de tiempo eliminada exitosamente');
                
                // Remover la entrada del estado local
                state.timeEntries = state.timeEntries.filter(entry => entry.id !== entryId);
                
                // Re-renderizar solo las entradas de tiempo y estadísticas
                renderTimeEntries();
                renderTicketStats();
                lucide.createIcons();
                
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('❌ Error deleting time entry:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error al eliminar la entrada de tiempo', 'error');
            } else {
                alert('Error al eliminar la entrada de tiempo');
            }
        }
    }
}

async function deleteNote(noteId) {
    if (confirm('¿Eliminar esta nota?')) {
        try {
            console.log(`🗑️ Eliminando nota ${noteId}`);
            
            const response = await fetch(`${API_URL}/tickets/notes/${noteId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ Nota eliminada exitosamente');
                
                // Remover la nota del estado local
                state.notes = state.notes.filter(note => note.id !== noteId);
                
                // Re-renderizar solo las notas
                renderNotes();
                lucide.createIcons();
                
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('❌ Error deleting note:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error al eliminar la nota', 'error');
            } else {
                alert('Error al eliminar la nota');
            }
        }
    }
}

async function deleteChecklistItem(itemId) {
    if (confirm('¿Eliminar esta tarea?')) {
        try {
            console.log(`🗑️ Eliminando tarea ${itemId}`);
            
            const response = await fetch(`${API_URL}/tickets/checklist/${itemId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log('✅ Tarea eliminada exitosamente');
                
                // Remover la tarea del estado local
                state.checklist = state.checklist.filter(item => item.id !== itemId);
                
                // Re-renderizar solo el checklist
                renderChecklist();
                renderTicketStats();
                lucide.createIcons();
                
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            console.error('❌ Error deleting checklist item:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error al eliminar la tarea', 'error');
            } else {
                alert('Error al eliminar la tarea');
            }
        }
    }
}

async function deleteSparePartUsage(usageId) {
    if (!confirm('¿Eliminar este repuesto del ticket?')) return;
    
    try {
        console.log(`🗑️ Eliminando uso de repuesto ${usageId}`);
        
        const response = await fetch(`${API_URL}/tickets/spare-parts/${usageId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            console.log('✅ Uso de repuesto eliminado exitosamente');
            
            // Remover el repuesto del estado local
            state.spareParts = state.spareParts.filter(part => part.id !== usageId);
            
            // Re-renderizar solo los repuestos
            renderSpareParts();
            lucide.createIcons();
            
            // Mostrar notificación de éxito
            if (typeof showNotification === 'function') {
                showNotification('Repuesto eliminado exitosamente', 'success');
            } else {
                alert('Repuesto eliminado exitosamente');
            }
            
        } else {
            throw new Error('Error al eliminar repuesto');
        }
    } catch (error) {
        console.error('❌ Error deleting spare part:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error al eliminar el repuesto', 'error');
        } else {
            alert('Error al eliminar el repuesto');
        }
    }
} 