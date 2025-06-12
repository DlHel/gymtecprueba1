const API_URL = 'http://localhost:3000/api';

let state = {
    currentTicket: null,
    timeEntries: [],
    isTimerRunning: false,
    startTime: null,
    timerInterval: null
};

// --- DOM Elements ---
const mainContent = document.getElementById('main-content');
const pageTitle = document.getElementById('page-title');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    
    if (ticketId) {
        loadTicketDetail(ticketId);
    } else {
        showError('No se especificó ID de ticket');
    }
});

// --- Main Functions ---
async function loadTicketDetail(ticketId) {
    try {
        showLoading();
        
        // Cargar datos del ticket y entradas de tiempo en paralelo
        const [ticketResponse, timeResponse] = await Promise.all([
            fetch(`${API_URL}/tickets/${ticketId}`),
            fetch(`${API_URL}/tickets/${ticketId}/time-entries`)
        ]);

        if (!ticketResponse.ok) {
            throw new Error(`Error al cargar ticket: ${ticketResponse.statusText}`);
        }

        const ticketResult = await ticketResponse.json();
        state.currentTicket = ticketResult.data;
        
        // Las entradas de tiempo pueden no existir aún
        if (timeResponse.ok) {
            const timeResult = await timeResponse.json();
            state.timeEntries = timeResult.data || [];
        }

        renderTicketDetail();
        
    } catch (error) {
        console.error('Error loading ticket detail:', error);
        showError(`Error al cargar el ticket: ${error.message}`);
    }
}

function renderTicketDetail() {
    const ticket = state.currentTicket;
    
    // Actualizar título de la página
    pageTitle.textContent = `Ticket: ${ticket.title}`;
    
    // Calcular estado SLA
    const slaStatus = calculateSLAStatus(ticket.due_date);
    
    // Calcular tiempo total trabajado
    const totalTime = calculateTotalTime();
    
    mainContent.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-6">
            <!-- Información Principal -->
            <div class="detail-section">
                <h2 class="detail-title">Información del Ticket</h2>
                <div class="detail-grid">
                    <dl class="detail-item">
                        <dt class="text-sm font-medium text-slate-600">ID</dt>
                        <dd class="mt-1 text-sm text-slate-900">#${ticket.id}</dd>
                    </dl>
                    <dl class="detail-item">
                        <dt class="text-sm font-medium text-slate-600">Título</dt>
                        <dd class="mt-1 text-sm text-slate-900 font-medium">${ticket.title}</dd>
                    </dl>
                    <dl class="detail-item">
                        <dt class="text-sm font-medium text-slate-600">Estado</dt>
                        <dd class="mt-1">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(ticket.status)}">
                                ${ticket.status}
                            </span>
                        </dd>
                    </dl>
                    <dl class="detail-item">
                        <dt class="text-sm font-medium text-slate-600">Prioridad</dt>
                        <dd class="mt-1">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityClass(ticket.priority)}">
                                ${ticket.priority}
                            </span>
                        </dd>
                    </dl>
                    <dl class="detail-item">
                        <dt class="text-sm font-medium text-slate-600">Cliente</dt>
                        <dd class="mt-1 text-sm text-slate-900">${ticket.client_name || 'N/A'}</dd>
                    </dl>
                    <dl class="detail-item">
                        <dt class="text-sm font-medium text-slate-600">Sede</dt>
                        <dd class="mt-1 text-sm text-slate-900">${ticket.location_name || 'N/A'}</dd>
                    </dl>
                    <dl class="detail-item">
                        <dt class="text-sm font-medium text-slate-600">Equipo</dt>
                        <dd class="mt-1 text-sm text-slate-900">${ticket.equipment_name || 'N/A'}</dd>
                    </dl>
                    <dl class="detail-item">
                        <dt class="text-sm font-medium text-slate-600">SLA</dt>
                        <dd class="mt-1">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${slaStatus.class}">
                                ${slaStatus.text}
                            </span>
                        </dd>
                    </dl>
                </div>
            </div>

            <!-- Descripción -->
            <div class="detail-section">
                <h2 class="detail-title">Descripción del Problema</h2>
                <p class="text-sm text-slate-700 whitespace-pre-wrap">${ticket.description || 'Sin descripción'}</p>
            </div>

            <!-- Control de Tiempo -->
            <div class="detail-section">
                <h2 class="detail-title">Control de Tiempo</h2>
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-4">
                        <div class="text-lg font-mono font-semibold" id="timer-display">00:00:00</div>
                        <button id="timer-btn" 
                                class="px-4 py-2 rounded-md font-medium flex items-center space-x-2 ${state.isTimerRunning ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}">
                            <i data-lucide="${state.isTimerRunning ? 'pause' : 'play'}" class="w-4 h-4"></i>
                            <span>${state.isTimerRunning ? 'Pausar' : 'Iniciar'}</span>
                        </button>
                    </div>
                    <div class="text-sm text-slate-600">
                        <strong>Tiempo Total:</strong> ${formatDuration(totalTime)}
                    </div>
                </div>
                
                <!-- Historial de Tiempo -->
                <div class="mt-4">
                    <h3 class="text-sm font-medium text-slate-600 mb-2">Historial de Tiempo</h3>
                    <div class="space-y-2" id="time-entries-list">
                        ${renderTimeEntries()}
                    </div>
                </div>
            </div>

            <!-- Acciones -->
            <div class="detail-section">
                <h2 class="detail-title">Acciones</h2>
                <div class="flex flex-wrap gap-3">
                    <button id="edit-ticket-btn" class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md flex items-center space-x-2">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                        <span>Editar Ticket</span>
                    </button>
                    
                    <button id="change-status-btn" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md flex items-center space-x-2">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                        <span>Cambiar Estado</span>
                    </button>
                    
                    <button id="add-note-btn" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center space-x-2">
                        <i data-lucide="message-square" class="w-4 h-4"></i>
                        <span>Agregar Nota</span>
                    </button>
                    
                    <button id="print-ticket-btn" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md flex items-center space-x-2">
                        <i data-lucide="printer" class="w-4 h-4"></i>
                        <span>Imprimir</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Agregar event listeners
    setupEventListeners();
    
    // Inicializar timer display
    updateTimerDisplay();
    
    // Actualizar iconos
    lucide.createIcons();
}

function setupEventListeners() {
    // Timer
    const timerBtn = document.getElementById('timer-btn');
    if (timerBtn) {
        timerBtn.addEventListener('click', toggleTimer);
    }

    // Botones de acción
    const editBtn = document.getElementById('edit-ticket-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => editTicket(state.currentTicket.id));
    }

    const statusBtn = document.getElementById('change-status-btn');
    if (statusBtn) {
        statusBtn.addEventListener('click', showStatusModal);
    }

    const noteBtn = document.getElementById('add-note-btn');
    if (noteBtn) {
        noteBtn.addEventListener('click', showNoteModal);
    }

    const printBtn = document.getElementById('print-ticket-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printTicket);
    }
}

// --- Timer Functions ---
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
    const timerBtn = document.getElementById('timer-btn');
    if (timerBtn) {
        timerBtn.innerHTML = `
            <i data-lucide="pause" class="w-4 h-4"></i>
            <span>Pausar</span>
        `;
        timerBtn.className = 'px-4 py-2 rounded-md font-medium flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white';
        lucide.createIcons();
    }
}

async function stopTimer() {
    if (!state.isTimerRunning || !state.startTime) return;
    
    state.isTimerRunning = false;
    clearInterval(state.timerInterval);
    
    const endTime = new Date();
    const duration = Math.floor((endTime - state.startTime) / 1000); // duración en segundos
    
    try {
        // Guardar entrada de tiempo
        await saveTimeEntry(duration);
        
        // Actualizar lista de entradas
        await loadTimeEntries();
        
    } catch (error) {
        console.error('Error saving time entry:', error);
        alert('Error al guardar el tiempo trabajado');
    }
    
    state.startTime = null;
    
    // Actualizar botón
    const timerBtn = document.getElementById('timer-btn');
    if (timerBtn) {
        timerBtn.innerHTML = `
            <i data-lucide="play" class="w-4 h-4"></i>
            <span>Iniciar</span>
        `;
        timerBtn.className = 'px-4 py-2 rounded-md font-medium flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white';
        lucide.createIcons();
    }
    
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (!display) return;
    
    if (state.isTimerRunning && state.startTime) {
        const now = new Date();
        const elapsed = Math.floor((now - state.startTime) / 1000);
        display.textContent = formatDuration(elapsed);
    } else {
        display.textContent = '00:00:00';
    }
}

async function saveTimeEntry(duration) {
    const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/time-entries`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            duration: duration,
            description: 'Tiempo trabajado'
        })
    });
    
    if (!response.ok) {
        throw new Error('Error al guardar tiempo trabajado');
    }
}

async function loadTimeEntries() {
    try {
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/time-entries`);
        if (response.ok) {
            const result = await response.json();
            state.timeEntries = result.data || [];
            
            // Actualizar display de entradas de tiempo
            const timeEntriesList = document.getElementById('time-entries-list');
            if (timeEntriesList) {
                timeEntriesList.innerHTML = renderTimeEntries();
            }
        }
    } catch (error) {
        console.error('Error loading time entries:', error);
    }
}

// --- Helper Functions ---
function calculateSLAStatus(dueDate) {
    if (!dueDate) {
        return { text: 'Sin SLA', class: 'bg-gray-100 text-gray-800' };
    }
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { 
            text: `Vencido hace ${Math.abs(diffDays)} días`, 
            class: 'bg-red-100 text-red-800' 
        };
    } else if (diffDays === 0) {
        return { 
            text: 'Vence hoy', 
            class: 'bg-yellow-100 text-yellow-800' 
        };
    } else if (diffDays <= 3) {
        return { 
            text: `${diffDays} días restantes`, 
            class: 'bg-yellow-100 text-yellow-800' 
        };
    } else {
        return { 
            text: `${diffDays} días restantes`, 
            class: 'bg-green-100 text-green-800' 
        };
    }
}

function getStatusClass(status) {
    const statusClasses = {
        'Abierto': 'bg-blue-100 text-blue-800',
        'En Progreso': 'bg-yellow-100 text-yellow-800',
        'Esperando': 'bg-orange-100 text-orange-800',
        'Resuelto': 'bg-green-100 text-green-800',
        'Cerrado': 'bg-gray-100 text-gray-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

function getPriorityClass(priority) {
    const priorityClasses = {
        'Baja': 'bg-green-100 text-green-800',
        'Media': 'bg-yellow-100 text-yellow-800',
        'Alta': 'bg-red-100 text-red-800'
    };
    return priorityClasses[priority] || 'bg-gray-100 text-gray-800';
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function calculateTotalTime() {
    return state.timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
}

function renderTimeEntries() {
    if (!state.timeEntries || state.timeEntries.length === 0) {
        return '<p class="text-sm text-slate-500">No hay entradas de tiempo registradas</p>';
    }
    
    return state.timeEntries.map(entry => `
        <div class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
            <div class="flex-1">
                <div class="text-sm font-medium">${entry.description || 'Tiempo trabajado'}</div>
                <div class="text-xs text-slate-500">${new Date(entry.created_at).toLocaleString()}</div>
            </div>
            <div class="text-sm font-mono font-medium">${formatDuration(entry.duration)}</div>
        </div>
    `).join('');
}

// --- Action Functions ---
function editTicket(ticketId) {
    // Redirigir a la página de tickets con el modal de edición
    window.location.href = `tickets.html?edit=${ticketId}`;
}

function showStatusModal() {
    // Implementar modal para cambiar estado
    const newStatus = prompt('Nuevo estado:', state.currentTicket.status);
    if (newStatus && newStatus !== state.currentTicket.status) {
        updateTicketStatus(newStatus);
    }
}

async function updateTicketStatus(newStatus) {
    try {
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...state.currentTicket,
                status: newStatus
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar estado');
        }
        
        state.currentTicket.status = newStatus;
        renderTicketDetail();
        
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error al actualizar el estado del ticket');
    }
}

function showNoteModal() {
    const note = prompt('Agregar nota:');
    if (note) {
        // Implementar funcionalidad de notas
        console.log('Nota agregada:', note);
    }
}

function printTicket() {
    window.print();
}

// --- Utility Functions ---
function showLoading() {
    mainContent.innerHTML = `
        <div class="text-center py-10">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            <p class="mt-2 text-gray-500">Cargando detalles del ticket...</p>
        </div>
    `;
}

function showError(message) {
    mainContent.innerHTML = `
        <div class="text-center py-10">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <i data-lucide="alert-circle" class="h-6 w-6 text-red-600"></i>
            </div>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p class="mt-1 text-sm text-gray-500">${message}</p>
            <div class="mt-6">
                <a href="tickets.html" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700">
                    <i data-lucide="arrow-left" class="mr-2 h-4 w-4"></i>
                    Volver a Tickets
                </a>
            </div>
        </div>
    `;
    lucide.createIcons();
} 