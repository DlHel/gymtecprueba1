// === DETALLE DE TICKETS - ARCHIVO PRINCIPAL REDISEÑADO ===

// Estado global de la aplicación
window.state = {
    currentTicket: null,
    timeEntries: [],
    notes: [],
    checklist: [],
    spareParts: [],
    sparePartRequests: [], // 🆕 Solicitudes de repuestos (pendientes/aprobadas/rechazadas)
    photos: [],
    history: [],
    isTimerRunning: false,
    startTime: null,
    currentElapsedSeconds: 0,
    timerInterval: null,
    activeTab: 'overview',
    // pendingStatusChange: null  // DEPRECADO - Ya no se usa el sistema de estado pendiente
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
    // 🔐 CRÍTICO: Protección de autenticación PRIMERO
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.warn('❌ Usuario no autenticado en ticket-detail, redirigiendo a login...');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }
    
    console.log('✅ Usuario autenticado, cargando detalle de ticket...');
    
    console.log('🎫 Iniciando detalle de ticket mejorado...');
    console.log('🔗 API URL:', API_URL);
    console.log('👤 Usuario autenticado:', authManager.getUser()?.username || 'N/A');
    
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
        
        // 🔍 DEBUGGING: Verificar estado de autenticación antes de hacer la llamada
        console.log('🔐 Verificando autenticación...');
        console.log('📋 authManager disponible:', typeof authManager !== 'undefined');
        
        if (!authManager) {
            console.error('❌ AuthManager no disponible - Redirigiendo a login...');
            window.location.href = '/login.html';
            return;
        }
        
        // Verificar que el token sea válido (no solo que exista)
        console.log('🔐 Verificando validez del token...');
        const isTokenValid = await authManager.verifyToken();
        
        if (!isTokenValid) {
            console.error('❌ Token inválido o expirado - Redirigiendo a login...');
            window.location.href = '/login.html';
            return;
        }
        
        console.log('✅ Token válido, continuando...');
        
        // Resetear sistema de fotos para evitar event listeners duplicados
        resetPhotoSystem();
        
        console.log('📤 Enviando petición autenticada...');
        
        // ✅ USAR authenticatedFetch según @bitacora
        const response = await authenticatedFetch(`${API_URL}/tickets/${ticketId}/detail`);
        
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
            ticket_type: data.ticket_type || 'individual', // ✅ NUEVO: Tipo de ticket
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
        
        // 🆕 Cargar solicitudes de repuestos (pendientes, aprobadas, rechazadas)
        await loadSparePartsRequests(ticketId);
        
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
    
    // ✅ NUEVO: Renderizar equipos si es gimnación (ANTES de stats para mantener orden)
    if (state.currentTicket.ticket_type === 'gimnacion') {
        renderGimnacionEquipment();
    }
    
    renderTicketStats();
    renderStatusControls(state.currentTicket);  // ✅ Agregar controles de estado
    renderStatusActions(state.currentTicket);
    renderSpareParts(); // ✅ Renderizar repuestos
    renderChecklist();  // ✅ Agregar llamada a renderChecklist
    updateChecklistCounter();  // ✅ Agregar llamada a updateChecklistCounter
    renderNotes();      // ✅ Renderizar notas/comentarios unificados
    renderPhotos();     // ✅ Renderizar mensaje informativo de fotos
    
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
    
    // Botón para agregar checklist
    const addChecklistBtn = document.getElementById('add-checklist-btn');
    if (addChecklistBtn) {
        addChecklistBtn.addEventListener('click', showAddChecklistModal);
    }
    
    // === CONFIGURACIÓN DE SUBIDA DE FOTOS MÚLTIPLES ===
    setupPhotoUpload();
    
    // === CONFIGURACIÓN DE BOTONES DE BARRA DE HERRAMIENTAS ===
    setupToolbarButtons();
    
    // === CONFIGURACIÓN DE INTERFAZ UNIFICADA ===
    initUnifiedInterface();
    
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

// === CONFIGURACIÓN DE BOTONES DE BARRA DE HERRAMIENTAS ===
function setupToolbarButtons() {
    console.log('🔧 Configurando botones de barra de herramientas...');
    
    // Botón "Adjuntar" - Toggle de zona de drop
    const attachFilesBtn = document.getElementById('attach-files-btn');
    if (attachFilesBtn) {
        attachFilesBtn.addEventListener('click', toggleDropZone);
        console.log('📎 Botón "Adjuntar" configurado');
    } else {
        console.warn('⚠️ No se encontró el botón "Adjuntar"');
    }
    
    // Botón "Fotos" - Abrir selector de archivos directamente
    const attachPhotosBtn = document.getElementById('attach-photos-btn');
    if (attachPhotosBtn) {
        attachPhotosBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('unified-file-input');
            if (fileInput) {
                fileInput.click();
            }
        });
        console.log('📷 Botón "Fotos" configurado');
    } else {
        console.warn('⚠️ No se encontró el botón "Fotos"');
    }
    
    // === BOTONES DE FORMATO ===
    setupFormatButtons();
    
    // === ATAJOS DE TECLADO ===
    setupKeyboardShortcuts();
}

// === CONFIGURACIÓN DE BOTONES DE FORMATO ===
function setupFormatButtons() {
    console.log('✨ Configurando botones de formato...');
    
    const formatButtons = [
        { id: 'format-bold-btn', action: 'bold', wrapper: '**', display: 'negrita' },
        { id: 'format-italic-btn', action: 'italic', wrapper: '*', display: 'cursiva' },
        { id: 'format-underline-btn', action: 'underline', wrapper: '_', display: 'subrayado' },
        { id: 'format-strikethrough-btn', action: 'strikethrough', wrapper: '~~', display: 'tachado' },
        { id: 'format-code-btn', action: 'code', wrapper: '`', display: 'código' },
        { id: 'format-quote-btn', action: 'quote', prefix: '> ', display: 'cita' },
        { id: 'format-list-btn', action: 'list', prefix: '• ', display: 'lista' },
        { id: 'format-numbered-list-btn', action: 'numbered-list', prefix: '1. ', display: 'lista numerada' }
    ];
    
    formatButtons.forEach(button => {
        const btn = document.getElementById(button.id);
        if (btn) {
            btn.addEventListener('click', () => applyTextFormat(button));
            console.log(`📝 Botón ${button.display} configurado`);
        }
    });
}

// === APLICAR FORMATO DE TEXTO ===
function applyTextFormat(formatConfig) {
    const textarea = document.getElementById('unified-comment-textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textBefore = textarea.value.substring(0, start);
    const textAfter = textarea.value.substring(end);
    
    let newText = '';
    let newCursorPos = start;
    
    if (formatConfig.wrapper) {
        // Formato de envoltura (negrita, cursiva, etc.)
        if (selectedText) {
            // Si hay texto seleccionado, envolver
            newText = `${formatConfig.wrapper}${selectedText}${formatConfig.wrapper}`;
            newCursorPos = start + formatConfig.wrapper.length + selectedText.length + formatConfig.wrapper.length;
        } else {
            // Si no hay selección, insertar marcadores
            newText = `${formatConfig.wrapper}${formatConfig.wrapper}`;
            newCursorPos = start + formatConfig.wrapper.length;
        }
    } else if (formatConfig.prefix) {
        // Formato de prefijo (listas, citas)
        if (formatConfig.action === 'quote' || formatConfig.action === 'list' || formatConfig.action === 'numbered-list') {
            // Para listas y citas, aplicar al inicio de línea
            const lines = selectedText ? selectedText.split('\n') : [''];
            const formattedLines = lines.map((line, index) => {
                if (formatConfig.action === 'numbered-list') {
                    return `${index + 1}. ${line}`;
                }
                return `${formatConfig.prefix}${line}`;
            });
            newText = formattedLines.join('\n');
            newCursorPos = start + newText.length;
        }
    }
    
    // Aplicar el cambio
    textarea.value = textBefore + newText + textAfter;
    
    // Restaurar focus y posición del cursor
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    // Actualizar interfaz
    handleUnifiedTextChange();
    
    // Mostrar feedback visual
    const btn = document.getElementById(formatConfig.id);
    if (btn) {
        btn.classList.add('applied');
        setTimeout(() => btn.classList.remove('applied'), 200);
    }
    
    console.log(`✨ Formato ${formatConfig.display} aplicado`);
}

// === ATAJOS DE TECLADO ===
function setupKeyboardShortcuts() {
    const textarea = document.getElementById('unified-comment-textarea');
    if (!textarea) return;
    
    textarea.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + B = Negrita
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            applyTextFormat({ id: 'format-bold-btn', action: 'bold', wrapper: '**', display: 'negrita' });
        }
        
        // Ctrl/Cmd + I = Cursiva
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            applyTextFormat({ id: 'format-italic-btn', action: 'italic', wrapper: '*', display: 'cursiva' });
        }
        
        // Ctrl/Cmd + U = Subrayado
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            applyTextFormat({ id: 'format-underline-btn', action: 'underline', wrapper: '_', display: 'subrayado' });
        }
        
        // Ctrl/Cmd + Enter = Enviar
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const submitBtn = document.getElementById('send-comment-btn');
            if (submitBtn && !submitBtn.disabled) {
                handleUnifiedSubmit();
            }
        }
    });
    
    console.log('⌨️ Atajos de teclado configurados');
}

// === RENDERIZADO DE MARKDOWN SIMPLE ===
function renderMarkdown(text) {
    if (!text) return '';
    
    // Escapar HTML primero
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Aplicar formatos de Markdown
    html = html
        // Negrita **texto**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Cursiva *texto*
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Subrayado _texto_
        .replace(/_(.*?)_/g, '<u>$1</u>')
        // Tachado ~~texto~~
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        // Código `texto`
        .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
        // Saltos de línea
        .replace(/\n/g, '<br>');
    
    // Procesar líneas especiales (citas, listas)
    const lines = html.split('<br>');
    const processedLines = lines.map(line => {
        // Citas > texto
        if (line.trim().startsWith('&gt; ')) {
            return `<blockquote class="markdown-quote">${line.trim().substring(5)}</blockquote>`;
        }
        // Lista con viñetas • texto
        if (line.trim().startsWith('• ')) {
            return `<li class="markdown-bullet">${line.trim().substring(2)}</li>`;
        }
        // Lista numerada 1. texto
        if (/^\d+\.\s/.test(line.trim())) {
            return `<li class="markdown-numbered">${line.trim().replace(/^\d+\.\s/, '')}</li>`;
        }
        return line;
    });
    
    return processedLines.join('<br>');
}

// === FUNCIÓN PARA TOGGLE DE ZONA DE DROP ===
function toggleDropZone() {
    const dropZone = document.getElementById('unified-drop-zone');
    const attachBtn = document.getElementById('attach-files-btn');
    if (!dropZone) return;
    
    const isExpanded = dropZone.classList.contains('expanded');
    
    if (isExpanded) {
        // Contraer
        dropZone.classList.remove('expanded');
        if (attachBtn) attachBtn.classList.remove('active');
        console.log('📁 Zona de drop contraída');
    } else {
        // Expandir
        dropZone.classList.add('expanded');
        if (attachBtn) attachBtn.classList.add('active');
        console.log('📁 Zona de drop expandida');
        
        // Auto-focus al expandir para mejor UX
        setTimeout(() => {
            dropZone.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 300);
    }
}

// === FUNCIÓN PARA SUBIR FOTO ===
async function uploadPhoto(file) {
    try {
        const formData = new FormData();
        formData.append('photo', file);
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/photos`, {
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

// Función para agrupar notas y fotos relacionadas
function groupUnifiedActivity() {
    const activities = [];
    
    // Crear un mapa de todas las actividades (notas y fotos) por timestamp
    const allItems = [];
    
    // Agregar todas las notas
    state.notes.forEach(note => {
        console.log('📝 Nota encontrada:', {
            id: note.id,
            author: note.author,
            created_at: note.created_at,
            note: note.note?.substring(0, 20)
        });
        
        allItems.push({
            type: 'note',
            id: note.id,
            data: note,
            timestamp: new Date(note.created_at).getTime(),
            created_at: note.created_at,
            author: note.author || 'Usuario'
        });
    });
    
    // Agregar todas las fotos
    state.photos.forEach(photo => {
        console.log('📸 Foto encontrada:', {
            id: photo.id,
            author: photo.author,
            created_at: photo.created_at,
            file_name: photo.file_name,
            note_id: photo.note_id
        });
        
        allItems.push({
            type: 'photo',
            id: photo.id,
            data: photo,
            timestamp: new Date(photo.created_at).getTime(),
            created_at: photo.created_at,
            author: photo.author || 'Usuario',
            note_id: photo.note_id
        });
    });
    
    console.log('🔄 Items antes de agrupar:', allItems.length);
    
    // Ordenar por timestamp
    allItems.sort((a, b) => b.timestamp - a.timestamp);
    
    // Agrupar items que están dentro de 1 minuto de diferencia y del mismo autor
    const groupedActivities = [];
    let currentGroup = null;
    
    allItems.forEach(item => {
        // Criterios de agrupación más flexibles
        const shouldGroup = currentGroup && (
            // Mismo autor dentro de 1 minuto
            (Math.abs(item.timestamp - currentGroup.timestamp) <= 60000 && item.author === currentGroup.author) ||
            // O si hay note_id que vincula foto con nota (backup)
            (item.type === 'photo' && item.note_id && currentGroup.notes.some(n => n.id === item.note_id)) ||
            // O si es dentro de 30 segundos (más estricto para diferentes autores)
            (Math.abs(item.timestamp - currentGroup.timestamp) <= 30000)
        );
        
        console.log('🤔 Evaluando agrupación:', {
            item_id: item.id,
            item_type: item.type,
            item_author: item.author,
            current_group_author: currentGroup?.author,
            time_diff: currentGroup ? Math.abs(item.timestamp - currentGroup.timestamp) : 'No hay grupo',
            has_note_id: item.note_id,
            should_group: shouldGroup
        });
        
        if (shouldGroup) {
            // Agregar al grupo actual
            if (item.type === 'note') {
                currentGroup.notes.push(item.data);
            } else {
                currentGroup.photos.push(item.data);
            }
            console.log('✅ Item agregado al grupo existente');
        } else {
            // Crear nuevo grupo
            currentGroup = {
                timestamp: item.timestamp,
                created_at: item.created_at,
                author: item.author,
                notes: item.type === 'note' ? [item.data] : [],
                photos: item.type === 'photo' ? [item.data] : []
            };
            groupedActivities.push(currentGroup);
            console.log('🆕 Nuevo grupo creado:', {
                author: currentGroup.author,
                notes_count: currentGroup.notes.length,
                photos_count: currentGroup.photos.length
            });
        }
    });
    
    console.log('📊 Grupos finales:', groupedActivities.length);
    
    // Convertir grupos a formato de actividades
    return groupedActivities.map((group, index) => {
        let type = 'unknown';
        let mainNote = null;
        
        if (group.notes.length > 0 && group.photos.length > 0) {
            type = 'unified';
            mainNote = group.notes[0]; // Usar la primera nota como principal
        } else if (group.notes.length > 0) {
            type = 'note';
            mainNote = group.notes[0];
        } else if (group.photos.length > 0) {
            type = 'photo';
        }
        
        console.log(`🎯 Actividad ${index + 1}:`, {
            type: type,
            author: group.author,
            notes_count: group.notes.length,
            photos_count: group.photos.length
        });
        
        return {
            type: type,
            id: `activity-${index}`,
            note: mainNote,
            notes: group.notes,
            photos: group.photos,
            created_at: group.created_at,
            author: group.author
        };
    });
}

// === UTILIDADES PARA TIPOS DE COMENTARIO ===

// Obtener información del tipo de comentario
function getCommentTypeInfo(noteType) {
    const types = {
        'General': {
            icon: 'message-circle',
            emoji: '💬',
            color: '#6b7280'
        },
        'Diagnóstico': {
            icon: 'search',
            emoji: '🔍',
            color: '#f59e0b'
        },
        'Solución': {
            icon: 'check-circle',
            emoji: '✅',
            color: '#10b981'
        },
        'Seguimiento': {
            icon: 'clock',
            emoji: '⏰',
            color: '#3b82f6'
        },
        'Comunicación Cliente': {
            icon: 'phone',
            emoji: '📞',
            color: '#ec4899'
        }
    };
    
    return types[noteType] || types['General'];
}

function renderNotes() {
    const notesList = document.getElementById('notes-list');
    if (!notesList) return;
    
    const activities = groupUnifiedActivity();
    
    if (activities.length === 0) {
        notesList.innerHTML = `
            <div class="ticket-empty-state">
                <i data-lucide="sticky-note" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <h3>No hay actividad</h3>
                <p>Agrega comentarios y fotos para documentar el progreso del ticket</p>
            </div>
        `;
    } else {
        notesList.innerHTML = activities.map(activity => {
            if (activity.type === 'unified') {
                // Actividad unificada: nota(s) + foto(s) del mismo momento
                const mainNote = activity.note;
                const allNotes = activity.notes || [mainNote];
                const photos = activity.photos || [];
                const isSystemComment = activity.author === 'Sistema';
                const commentTypeInfo = getCommentTypeInfo(mainNote?.note_type || 'General');
                
                return `
                    <div class="ticket-unified-activity unified-email-style ${isSystemComment ? 'system-comment' : ''}">
                        <div class="unified-activity-header">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div class="unified-activity-author">
                                    <i data-lucide="${isSystemComment ? 'settings' : commentTypeInfo.icon}" class="w-4 h-4" style="color: ${commentTypeInfo.color}"></i>
                                    ${activity.author}
                                </div>
                                <div class="unified-activity-type" style="color: ${commentTypeInfo.color}">
                                    ${commentTypeInfo.emoji} ${mainNote?.note_type || 'Actividad'}
                                </div>
                            </div>
                            <div class="unified-activity-meta">
                                <div class="unified-activity-date">${formatDateTime(activity.created_at)}</div>
                                ${!isSystemComment ? `
                                    <div class="unified-activity-actions-inline">
                                        <button class="ticket-action-btn edit" data-note-ids="${allNotes.map(n => n.id).join(',')}" data-photo-ids="${photos.map(p => p.id).join(',')}" title="Editar actividad">
                                            <i data-lucide="edit-3" class="w-3 h-3"></i>
                                            Editar
                                        </button>
                                        <button class="ticket-action-btn danger" data-note-ids="${allNotes.map(n => n.id).join(',')}" data-photo-ids="${photos.map(p => p.id).join(',')}" title="Eliminar actividad">
                                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                                            Eliminar
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Contenido del mensaje tipo email -->
                        <div class="unified-email-content">
                            ${allNotes.map(note => `
                                <div class="email-text-content">
                                    ${renderMarkdown(note.note || note.content || '')}
                                </div>
                            `).join('')}
                            
                            ${photos.length > 0 ? `
                                <div class="email-attachments">
                                    <div class="attachments-header" onclick="toggleAttachments('activity-${activity.id || Date.now()}')">
                                        <div class="attachments-header-left">
                                            <i data-lucide="paperclip" class="w-4 h-4"></i>
                                            ${photos.length} adjunto(s)
                                        </div>
                                        <div class="attachments-toggle" id="toggle-activity-${activity.id || Date.now()}">
                                            <span>Ver adjuntos</span>
                                            <i data-lucide="chevron-down" class="w-3 h-3"></i>
                                        </div>
                                    </div>
                                    <div class="unified-activity-photos collapsed" id="photos-activity-${activity.id || Date.now()}">
                                        ${photos.map(photo => `
                                            <div class="unified-photo-item" onclick="viewPhoto(${photo.id})">
                                                <img src="${photo.file_path || photo.photo_data}" 
                                                     alt="${photo.description || photo.file_name || 'Foto del ticket'}" 
                                                     loading="lazy">
                                                <div class="unified-photo-overlay">
                                                    <div class="photo-filename">${photo.file_name || 'foto.jpg'}</div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            } else if (activity.type === 'note') {
                // Solo comentario (sin adjuntos)
                const mainNote = activity.note;
                const allNotes = activity.notes || [mainNote];
                const isSystemComment = activity.author === 'Sistema';
                const commentTypeInfo = getCommentTypeInfo(mainNote?.note_type || 'General');
                
                return `
                    <div class="ticket-unified-activity note-only-email-style ${isSystemComment ? 'system-comment' : ''}">
                        <div class="unified-activity-header">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div class="unified-activity-author">
                                    <i data-lucide="${isSystemComment ? 'settings' : commentTypeInfo.icon}" class="w-4 h-4" style="color: ${commentTypeInfo.color}"></i>
                                    ${activity.author}
                                </div>
                                <div class="unified-activity-type" style="color: ${commentTypeInfo.color}">
                                    ${commentTypeInfo.emoji} ${mainNote?.note_type || 'Comentario'}
                                </div>
                            </div>
                            <div class="unified-activity-meta">
                                <div class="unified-activity-date">${formatDateTime(activity.created_at)}</div>
                                ${!isSystemComment ? `
                                    <div class="unified-activity-actions-inline">
                                        <button class="ticket-action-btn edit" data-note-ids="${allNotes.map(n => n.id).join(',')}" data-photo-ids="" title="Editar comentario">
                                            <i data-lucide="edit-3" class="w-3 h-3"></i>
                                            Editar
                                        </button>
                                        <button class="ticket-action-btn danger" data-note-ids="${allNotes.map(n => n.id).join(',')}" data-photo-ids="" title="Eliminar comentario">
                                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                                            Eliminar
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="unified-email-content">
                            ${allNotes.map(note => `
                                <div class="email-text-content">
                                    ${renderMarkdown(note.note || note.content || 'Sin contenido')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (activity.type === 'photo') {
                // Solo adjuntos (sin texto)
                const photos = activity.photos || [];
                
                return `
                    <div class="ticket-unified-activity photo-only-email-style">
                        <div class="unified-activity-header">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <div class="unified-activity-author">
                                    <i data-lucide="camera" class="w-4 h-4"></i>
                                    ${activity.author} compartió ${photos.length} archivo(s)
                                </div>
                                <div class="unified-activity-type">Adjuntos</div>
                            </div>
                            <div class="unified-activity-meta">
                                <div class="unified-activity-date">${formatDateTime(activity.created_at)}</div>
                                <div class="unified-activity-actions-inline">
                                    <button class="ticket-action-btn edit" data-note-ids="" data-photo-ids="${photos.map(p => p.id).join(',')}" title="Editar fotos">
                                        <i data-lucide="edit-3" class="w-3 h-3"></i>
                                        Editar
                                    </button>
                                    <button class="ticket-action-btn danger" data-note-ids="" data-photo-ids="${photos.map(p => p.id).join(',')}" title="Eliminar fotos">
                                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="unified-email-content">
                            <div class="email-attachments">
                                <div class="attachments-header" onclick="toggleAttachments('photo-activity-${activity.id || Date.now()}')">
                                    <div class="attachments-header-left">
                                        <i data-lucide="paperclip" class="w-4 h-4"></i>
                                        ${photos.length} archivo(s) adjunto(s)
                                    </div>
                                    <div class="attachments-toggle" id="toggle-photo-activity-${activity.id || Date.now()}">
                                        <span>Ver archivos</span>
                                        <i data-lucide="chevron-down" class="w-3 h-3"></i>
                                    </div>
                                </div>
                                <div class="unified-activity-photos collapsed" id="photos-photo-activity-${activity.id || Date.now()}">
                                    ${photos.map(photo => `
                                        <div class="unified-photo-item" onclick="viewPhoto(${photo.id})">
                                            <img src="${photo.file_path || photo.photo_data}" 
                                                 alt="${photo.description || photo.file_name || 'Foto del ticket'}" 
                                                 loading="lazy">
                                            <div class="unified-photo-overlay">
                                                <div class="photo-filename">${photo.file_name || 'foto.jpg'}</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }
    
    // Actualizar contador de notas (total de actividades)
    if (elements.notesCounter) {
        elements.notesCounter.textContent = activities.length;
    }
    
    // Inicializar event listeners para botones de acción
    initializeActionButtons();
    
    setTimeout(() => lucide.createIcons(), 10);
}

function renderSpareParts() {
    console.log('🔧 Renderizando repuestos...');
    const sparePartsList = document.getElementById('spare-parts-list');
    const sparePartsAlerts = document.getElementById('spare-parts-alerts');
    
    if (!sparePartsList) {
        console.warn('❌ Elemento spare-parts-list no encontrado');
        return;
    }
    
    const usedParts = state.spareParts || [];
    const requests = state.sparePartRequests || [];
    const totalItems = usedParts.length + requests.length;
    
    // Si no hay nada, mostrar estado vacío
    if (totalItems === 0) {
        sparePartsList.innerHTML = `
            <div class="spare-parts-empty">
                <i data-lucide="wrench" class="mx-auto"></i>
                <h4>No hay repuestos utilizados</h4>
                <p>Registra los repuestos utilizados en este ticket para mantener un control del inventario</p>
                <button id="add-first-spare-part" class="ticket-action-btn primary">
                    <i data-lucide="check-circle" class="w-4 h-4"></i>
                    Registrar primer repuesto
                </button>
            </div>
        `;
    } else {
        let html = '';
        
        // 1. SOLICITUDES (pendientes primero, luego aprobadas, luego rechazadas)
        if (requests.length > 0) {
            const pendingRequests = requests.filter(r => r.status === 'pendiente');
            const approvedRequests = requests.filter(r => r.status === 'aprobada');
            const rejectedRequests = requests.filter(r => r.status === 'rechazada');
            
            // Solicitudes pendientes (destacadas en amarillo)
            if (pendingRequests.length > 0) {
                html += `<div class="spare-parts-section">
                    <h4 class="spare-parts-section-title">
                        <i data-lucide="clock"></i>
                        Solicitudes Pendientes (${pendingRequests.length})
                    </h4>`;
                
                pendingRequests.forEach(request => {
                    const createdDate = new Date(request.created_at).toLocaleDateString('es-CL');
                    const priorityClass = `priority-${request.priority || 'media'}`;
                    
                    html += `
                        <div class="spare-part-item request-item pending" data-request-id="${request.id}">
                            <div class="spare-part-info">
                                <div class="spare-part-name">
                                    <i data-lucide="package"></i>
                                    ${request.spare_part_name}
                                    <span class="badge ${priorityClass}">${request.priority || 'media'}</span>
                                    <span class="badge badge-warning">Pendiente</span>
                                </div>
                                <div class="spare-part-quantity">
                                    <i data-lucide="hash"></i>
                                    Cantidad solicitada: ${request.quantity_needed} unidades
                                </div>
                                ${request.justification ? `
                                    <div class="spare-part-notes">
                                        <i data-lucide="file-text"></i>
                                        ${request.justification}
                                    </div>
                                ` : ''}
                                <div class="spare-part-date">
                                    <i data-lucide="calendar"></i>
                                    Solicitado el ${createdDate} por ${request.requested_by || 'N/A'}
                                </div>
                            </div>
                            <div class="spare-part-actions">
                                <span class="request-status-icon" title="Esperando aprobación en Inventario">⏳</span>
                            </div>
                        </div>
                    `;
                });
                
                html += `</div>`;
            }
            
            // Solicitudes aprobadas
            if (approvedRequests.length > 0) {
                html += `<div class="spare-parts-section">
                    <h4 class="spare-parts-section-title">
                        <i data-lucide="check-circle"></i>
                        Solicitudes Aprobadas (${approvedRequests.length})
                    </h4>`;
                
                approvedRequests.forEach(request => {
                    const approvedDate = new Date(request.approved_at).toLocaleDateString('es-CL');
                    
                    html += `
                        <div class="spare-part-item request-item approved" data-request-id="${request.id}">
                            <div class="spare-part-info">
                                <div class="spare-part-name">
                                    <i data-lucide="package"></i>
                                    ${request.spare_part_name}
                                    <span class="badge badge-success">Aprobada</span>
                                </div>
                                <div class="spare-part-quantity">
                                    <i data-lucide="hash"></i>
                                    ${request.quantity_needed} unidades
                                </div>
                                <div class="spare-part-date">
                                    <i data-lucide="check"></i>
                                    Aprobado el ${approvedDate}
                                </div>
                            </div>
                            <div class="spare-part-actions">
                                <span class="request-status-icon" title="Aprobada">✅</span>
                            </div>
                        </div>
                    `;
                });
                
                html += `</div>`;
            }
            
            // Solicitudes rechazadas
            if (rejectedRequests.length > 0) {
                html += `<div class="spare-parts-section">
                    <h4 class="spare-parts-section-title">
                        <i data-lucide="x-circle"></i>
                        Solicitudes Rechazadas (${rejectedRequests.length})
                    </h4>`;
                
                rejectedRequests.forEach(request => {
                    const rejectedDate = new Date(request.approved_at).toLocaleDateString('es-CL');
                    
                    html += `
                        <div class="spare-part-item request-item rejected" data-request-id="${request.id}">
                            <div class="spare-part-info">
                                <div class="spare-part-name">
                                    <i data-lucide="package"></i>
                                    ${request.spare_part_name}
                                    <span class="badge badge-danger">Rechazada</span>
                                </div>
                                <div class="spare-part-quantity">
                                    <i data-lucide="hash"></i>
                                    ${request.quantity_needed} unidades
                                </div>
                                ${request.notes ? `
                                    <div class="spare-part-notes rejection-reason">
                                        <i data-lucide="alert-circle"></i>
                                        <strong>Motivo:</strong> ${request.notes}
                                    </div>
                                ` : ''}
                                <div class="spare-part-date">
                                    <i data-lucide="x"></i>
                                    Rechazado el ${rejectedDate}
                                </div>
                            </div>
                            <div class="spare-part-actions">
                                <span class="request-status-icon" title="Rechazada">❌</span>
                            </div>
                        </div>
                    `;
                });
                
                html += `</div>`;
            }
        }
        
        // 2. REPUESTOS USADOS (ya descontados del inventario)
        if (usedParts.length > 0) {
            html += `<div class="spare-parts-section">
                <h4 class="spare-parts-section-title">
                    <i data-lucide="check-square"></i>
                    Repuestos Utilizados (${usedParts.length})
                </h4>`;
            
            usedParts.forEach(part => {
                const totalCost = part.quantity_used * (part.unit_cost || 0);
                const usedDate = new Date(part.used_at).toLocaleDateString('es-CL');
                
                html += `
                    <div class="spare-part-item used-item" data-part-id="${part.id}">
                        <div class="spare-part-info">
                            <div class="spare-part-name">
                                <i data-lucide="wrench"></i>
                                ${part.spare_part_name || part.name || 'Repuesto sin nombre'}
                                <span class="badge badge-info">Usado</span>
                            </div>
                            <div class="spare-part-quantity">
                                <i data-lucide="package"></i>
                                ${part.quantity_used} unidades
                            </div>
                            <div class="spare-part-cost">
                                ${part.unit_cost ? `$${totalCost.toLocaleString('es-CL')}` : 'Sin costo'}
                            </div>
                            <div class="spare-part-date">
                                <i data-lucide="calendar"></i>
                                Usado el ${usedDate}
                            </div>
                        </div>
                        <div class="spare-part-actions">
                            <button class="spare-part-edit-btn" onclick="editSparePartUsage(${part.id})" title="Editar repuesto">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="spare-part-delete-btn" onclick="deleteSparePartUsage(${part.id})" title="Eliminar repuesto">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        sparePartsList.innerHTML = html;
    }
    
    // Alertas de stock bajo NO se muestran en tickets (pertenecen al módulo de inventario)
    // renderStockAlerts(); // DESHABILITADO - solo relevante en módulo de inventario
    
    setTimeout(() => lucide.createIcons(), 10);
    console.log('✅ Repuestos renderizados');
}

/**
 * Cargar solicitudes de repuestos del ticket (pendientes, aprobadas, rechazadas)
 */
async function loadSparePartsRequests(ticketId) {
    try {
        console.log(`📋 Cargando solicitudes de repuestos para ticket ${ticketId}...`);
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${ticketId}/spare-parts/requests`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.data) {
            // Agregar solicitudes al estado (separadas de los repuestos usados)
            state.sparePartRequests = result.data.requests || [];
            // Los repuestos usados ya vienen en state.spareParts desde loadTicketDetail
            
            console.log(`✅ Solicitudes cargadas:`, {
                requests: state.sparePartRequests.length,
                pending: result.summary.pending_count,
                approved: result.summary.approved_count,
                rejected: result.summary.rejected_count
            });
        }
        
    } catch (error) {
        console.error('❌ Error cargando solicitudes:', error);
        state.sparePartRequests = [];
    }
}

// Nueva función para mostrar alertas de stock
async function renderStockAlerts() {
    const sparePartsAlerts = document.getElementById('spare-parts-alerts');
    if (!sparePartsAlerts) return;
    
    try {
        // Obtener alertas de stock bajo del backend
        const response = await authenticatedFetch(`${API_URL}/inventory/low-stock`);
        if (!response.ok) {
            throw new Error('Error al cargar alertas de stock');
        }
        
        const result = await response.json();
        const lowStockItems = result.data || [];
        
        if (lowStockItems.length > 0) {
            const alertsHtml = lowStockItems.map(item => `
                <div class="stock-alert">
                    <i data-lucide="alert-triangle" class="stock-alert-icon"></i>
                    <div class="stock-alert-info">
                        <div class="stock-alert-title">Stock bajo: ${item.name}</div>
                        <div class="stock-alert-description">
                            Quedan ${item.current_stock} unidades (mínimo: ${item.minimum_stock})
                            ${item.sku ? ` • SKU: ${item.sku}` : ''}
                        </div>
                    </div>
                    <div class="stock-alert-actions">
                        <button class="stock-alert-btn" onclick="requestSparePartOrder('${item.id}')">
                            Solicitar Orden
                        </button>
                    </div>
                </div>
            `).join('');
            
            sparePartsAlerts.innerHTML = alertsHtml;
            sparePartsAlerts.classList.remove('hidden');
            
            console.log(`⚠️ Mostrando ${lowStockItems.length} alertas de stock bajo`);
        } else {
            sparePartsAlerts.classList.add('hidden');
            console.log('✅ No hay alertas de stock bajo');
        }
        
        setTimeout(() => lucide.createIcons(), 10);
        
    } catch (error) {
        console.error('❌ Error al cargar alertas de stock:', error);
        sparePartsAlerts.classList.add('hidden');
    }
}

// Configurar event listeners específicos para repuestos (ya no necesario - usando delegación)
function setupSparePartsEventListeners() {
    // Esta función ya no es necesaria porque usamos delegación de eventos
    // Mantenida por compatibilidad
    console.log('🔧 Event listeners de repuestos configurados via delegación');
}

function renderPhotos() {
    const photosGrid = document.getElementById('photos-grid');
    if (!photosGrid) return;
    
    // Mostrar mensaje explicativo en lugar de duplicar fotos
    photosGrid.innerHTML = `
        <div class="ticket-empty-state">
            <i data-lucide="info" class="w-12 h-12 mx-auto mb-4 text-blue-400"></i>
            <h3>Fotos integradas en comentarios</h3>
            <p>Las fotos ahora se muestran junto con los comentarios en la sección de actividad.</p>
            <p class="text-sm text-gray-500 mt-2">Esta mejora permite ver el contexto completo de cada foto.</p>
        </div>
    `;
    
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
    
    // Delegación de eventos para botones de repuestos (se crean dinámicamente)
    document.addEventListener('click', (e) => {
        // Botón "Solicitar Repuesto" - Modal Unificado con Flujo Inteligente
        if (e.target.id === 'request-spare-part-btn' || e.target.closest('#request-spare-part-btn')) {
            e.preventDefault();
            console.log('🔧 Click en botón solicitar repuesto (modal unificado)');
            if (typeof showUnifiedSparePartModal === 'function') {
                showUnifiedSparePartModal();
            } else {
                console.error('❌ showUnifiedSparePartModal no está definida');
            }
        }
        
        // Botón "Agregar Primer Repuesto" (cuando lista está vacía)
        if (e.target.id === 'add-first-spare-part' || e.target.closest('#add-first-spare-part')) {
            e.preventDefault();
            console.log('➕ Click en agregar primer repuesto');
            if (typeof showUnifiedSparePartModal === 'function') {
                showUnifiedSparePartModal();
            } else {
                console.error('❌ showUnifiedSparePartModal no está definida');
            }
        }
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
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/time-entries`, {
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
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/checklist`, {
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
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/checklist/items/${itemId}`, {
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
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/checklist/items/${itemId}`, {
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
window.executeDirectStatusChange = executeDirectStatusChange;
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
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
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
        renderNotes(); // Re-renderizar la lista de actividad
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
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/photos`, {
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

// === NUEVA FUNCIONALIDAD DE FOTOS MÚLTIPLES ===

// Variable global para almacenar archivos seleccionados
let selectedFiles = [];
let photoSystemInitialized = false; // Bandera para evitar inicializaciones múltiples

function setupPhotoUpload() {
    // Evitar múltiples inicializaciones
    if (photoSystemInitialized) {
        console.log('📸 Sistema de fotos ya inicializado, omitiendo...');
        return;
    }
    
    const dropZone = document.getElementById('photo-drop-zone');
    const photoInput = document.getElementById('photo-input');
    const uploadBtn = document.getElementById('upload-photos-btn');
    const clearBtn = document.getElementById('clear-photos-btn');
    
    if (!dropZone || !photoInput) {
        console.warn('⚠️ Elementos de foto no encontrados en ticket-detail');
        return;
    }

    console.log('📸 Inicializando sistema de fotos en ticket-detail...');
    
    // Limpiar event listeners existentes clonando elementos
    const newDropZone = dropZone.cloneNode(true);
    dropZone.parentNode.replaceChild(newDropZone, dropZone);
    
    const newPhotoInput = photoInput.cloneNode(true);
    photoInput.parentNode.replaceChild(newPhotoInput, photoInput);
    
    // Configurar event listeners en elementos nuevos
    newDropZone.addEventListener('click', () => newPhotoInput.click());
    newDropZone.addEventListener('dragover', handleDragOver);
    newDropZone.addEventListener('dragleave', handleDragLeave);
    newDropZone.addEventListener('drop', handleDrop);
    
    // Event listener para selección de archivos
    newPhotoInput.addEventListener('change', handleMultiplePhotoSelection);
    
    // Event listeners para botones (si existen)
    if (uploadBtn) {
        const newUploadBtn = uploadBtn.cloneNode(true);
        uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
        newUploadBtn.addEventListener('click', handleMultiplePhotoUpload);
    }
    
    if (clearBtn) {
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        newClearBtn.addEventListener('click', clearSelectedPhotos);
    }
    
    photoSystemInitialized = true;
    console.log('✅ Sistema de fotos inicializado en ticket-detail');
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    processSelectedFiles(files);
}

function handleMultiplePhotoSelection(e) {
    const files = Array.from(e.target.files);
    processSelectedFiles(files);
}

function processSelectedFiles(files) {
    // Filtrar solo archivos de imagen
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        alert('Por favor selecciona solo archivos de imagen');
        return;
    }
    
    // Validar tamaño máximo (5MB por archivo - mismo límite que backend)
    const maxSize = FILE_LIMITS.IMAGE_MAX_SIZE; // 5MB
    const oversizedFiles = imageFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
        alert(`Algunos archivos son demasiado grandes. Máximo ${FILE_LIMITS.IMAGE_MAX_SIZE_TEXT} por foto.\nArchivos problemáticos: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
    }
    
    // Agregar archivos al array (evitar duplicados por nombre)
    imageFiles.forEach(file => {
        const existingIndex = selectedFiles.findIndex(f => f.name === file.name);
        if (existingIndex === -1) {
            selectedFiles.push(file);
        } else {
            selectedFiles[existingIndex] = file; // Reemplazar si ya existe
        }
    });
    
    updatePhotosPreview();
}

function updatePhotosPreview() {
    const previewContainer = document.getElementById('photos-preview-container');
    const previewGrid = document.getElementById('photos-preview-grid');
    const photosCount = document.querySelector('.photos-count');
    
    if (!previewContainer || !previewGrid) return;
    
    if (selectedFiles.length === 0) {
        previewContainer.classList.add('hidden');
        return;
    }
    
    previewContainer.classList.remove('hidden');
    photosCount.textContent = `${selectedFiles.length} foto${selectedFiles.length !== 1 ? 's' : ''} seleccionada${selectedFiles.length !== 1 ? 's' : ''}`;
    
    // Generar preview para cada archivo
    previewGrid.innerHTML = selectedFiles.map((file, index) => {
        const url = URL.createObjectURL(file);
        return `
            <div class="photo-preview-item" data-index="${index}">
                <img src="${url}" alt="${file.name}" onload="this.onload=null;">
                <button type="button" class="photo-preview-remove" onclick="removeSelectedPhoto(${index})">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
                <div class="photo-preview-name" title="${file.name}">${file.name}</div>
            </div>
        `;
    }).join('');
    
    // Recrear iconos de Lucide
    setTimeout(() => lucide.createIcons(), 10);
}

function removeSelectedPhoto(index) {
    // Liberar el objeto URL antes de eliminar
    const previewItem = document.querySelector(`[data-index="${index}"] img`);
    if (previewItem && previewItem.src.startsWith('blob:')) {
        URL.revokeObjectURL(previewItem.src);
    }
    
    selectedFiles.splice(index, 1);
    updatePhotosPreview();
}

// Hacer la función disponible globalmente
window.removeSelectedPhoto = removeSelectedPhoto;

function clearSelectedPhotos() {
    console.log('🧹 Limpiando fotos seleccionadas en ticket-detail...');
    
    // Liberar todas las URLs de objeto
    const previewImages = document.querySelectorAll('#photos-preview-grid img');
    previewImages.forEach(img => {
        if (img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    });
    
    selectedFiles = [];
    updatePhotosPreview();
    
    const photoInput = document.getElementById('photo-input');
    if (photoInput) photoInput.value = '';
    
    const photoComment = document.getElementById('photo-comment');
    if (photoComment) photoComment.value = '';
    
    console.log('✅ Fotos seleccionadas limpiadas');
}

function resetPhotoSystem() {
    console.log('🧹 Reseteando sistema de fotos en ticket-detail...');
    
    // Limpiar fotos seleccionadas
    clearSelectedPhotos();
    
    // Resetear bandera de inicialización
    photoSystemInitialized = false;
    
    console.log('✅ Sistema de fotos reseteado en ticket-detail');
}

async function handleMultiplePhotoUpload() {
    if (selectedFiles.length === 0) {
        alert('No hay fotos seleccionadas');
        return;
    }
    
    const comment = document.getElementById('photo-comment').value.trim();
    const uploadBtn = document.getElementById('upload-photos-btn');
    
    try {
        // Deshabilitar botón y mostrar progreso
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Subiendo fotos...';
        
        console.log(`📸 Iniciando subida de ${selectedFiles.length} fotos...`);
        
        // Subir cada foto individualmente
        const uploadPromises = selectedFiles.map(async (file, index) => {
            try {
                console.log(`📤 Procesando archivo ${index + 1}:`, {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
                
                // Convertir a base64
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
                
                console.log(`📝 Base64 generado para ${file.name}:`, {
                    length: base64.length,
                    starts: base64.substring(0, 50) + '...'
                });
                
                const description = comment || `Foto ${index + 1} del ticket ${state.currentTicket.id}`;
                
                const payload = {
                    photo_data: base64,
                    file_name: file.name,
                    mime_type: file.type,
                    file_size: file.size,
                    description: description,
                    photo_type: 'Evidencia'
                };
                
                console.log(`📋 Payload para ${file.name}:`, {
                    ...payload,
                    photo_data: payload.photo_data.substring(0, 100) + '...'
                });
                
                const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                console.log(`📡 Respuesta del servidor para ${file.name}:`, {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Error del servidor para ${file.name}:`, errorText);
                    throw new Error(`Error al subir ${file.name}: HTTP ${response.status} - ${errorText}`);
                }
                
                const result = await response.json();
                console.log(`✅ Foto ${file.name} subida exitosamente:`, result);
                
                return {
                    id: result.data.id,
                    photo_data: base64,
                    description: description,
                    file_name: file.name,
                    category: 'general',
                    uploaded_at: new Date().toISOString()
                };
                
            } catch (error) {
                console.error(`❌ Error al subir ${file.name}:`, error);
                throw error;
            }
        });
        
        // Esperar a que todas las fotos se suban
        const uploadedPhotos = await Promise.all(uploadPromises);
        
        // Agregar fotos al estado local
        state.photos.push(...uploadedPhotos);
        
        // Limpiar formulario
        clearSelectedPhotos();
        
        // Actualizar interfaz
        renderPhotos();
        renderTicketStats();
        
        console.log(`🎉 ${uploadedPhotos.length} fotos subidas exitosamente`);
        alert(`${uploadedPhotos.length} foto${uploadedPhotos.length !== 1 ? 's' : ''} subida${uploadedPhotos.length !== 1 ? 's' : ''} exitosamente`);
        
    } catch (error) {
        console.error('❌ Error al subir fotos:', error);
        alert('Error al subir las fotos. Inténtalo de nuevo.');
    } finally {
        // Restaurar botón
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i data-lucide="upload" class="w-4 h-4"></i> Subir Fotos';
    }
}

// === FUNCIONES PARA MANEJAR FOTOS EXISTENTES ===

// Función para ver foto en modal
function viewPhoto(photoId) {
    const photo = state.photos.find(p => p.id === photoId);
    if (!photo) return;
    
    // Crear modal simple para ver la foto
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-full p-4">
            <button onclick="this.parentElement.parentElement.remove()" class="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
            <img src="${photo.photo_data}" alt="${photo.description || 'Foto del ticket'}" class="max-w-full max-h-full object-contain rounded-lg">
            <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 rounded-b-lg">
                <h3 class="font-semibold">${photo.file_name || 'Foto del ticket'}</h3>
                ${photo.description ? `<p class="text-sm text-gray-200">${photo.description}</p>` : ''}
                <p class="text-xs text-gray-300">Subida: ${formatDateTime(photo.created_at)}</p>
            </div>
        </div>
    `;
    
    // Cerrar modal al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
    setTimeout(() => lucide.createIcons(), 10);
}

// Función para eliminar foto
async function deletePhoto(photoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta foto? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        console.log(`🗑️ Eliminando foto ${photoId}...`);
        
        const response = await authenticatedFetch(`${API_URL}/tickets/photos/${photoId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al eliminar foto: HTTP ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Foto eliminada exitosamente:', result);
        
        // Remover foto del estado local
        state.photos = state.photos.filter(photo => photo.id !== photoId);
        
        // Actualizar interfaz
        renderNotes(); // Usar nuevo sistema de renderizado
        renderTicketStats();
        
        console.log('🔄 Foto eliminada y interfaz actualizada');
        
    } catch (error) {
        console.error('❌ Error al eliminar foto:', error);
        alert('Error al eliminar la foto. Inténtalo de nuevo.');
    }
}

// === INTERFAZ UNIFICADA DE COMENTARIOS MODERNA ===
// Variables para la interfaz unificada
let unifiedAttachments = [];
let unifiedDropZone = null;
let unifiedTextarea = null;
let unifiedSubmitBtn = null;

// Inicializar interfaz unificada moderna
function initUnifiedInterface() {
    console.log('📝 Inicializando interfaz unificada moderna...');
    
    unifiedTextarea = document.getElementById('unified-comment-textarea');
    unifiedSubmitBtn = document.getElementById('send-comment-btn');
    unifiedDropZone = document.getElementById('unified-drop-zone');
    
    if (!unifiedTextarea || !unifiedSubmitBtn || !unifiedDropZone) {
        console.warn('⚠️ Elementos de interfaz unificada no encontrados');
        return;
    }
    
    // Event listeners para el textarea
    unifiedTextarea.addEventListener('input', handleUnifiedTextChange);
    unifiedTextarea.addEventListener('paste', handleUnifiedPaste);
    unifiedTextarea.addEventListener('keydown', handleUnifiedKeydown);
    
    // Auto-resize del textarea
    unifiedTextarea.addEventListener('input', autoResizeTextarea);
    
    // Event listeners para drag & drop
    unifiedDropZone.addEventListener('click', () => {
        const fileInput = document.getElementById('unified-file-input');
        if (fileInput) fileInput.click();
    });
    
    unifiedDropZone.addEventListener('dragover', handleUnifiedDragOver);
    unifiedDropZone.addEventListener('dragleave', handleUnifiedDragLeave);
    unifiedDropZone.addEventListener('drop', handleUnifiedDrop);
    
    // Event listener para selección de archivos
    const fileInput = document.getElementById('unified-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleUnifiedFileSelect);
    }
    
    // Event listener para botón de envío
    unifiedSubmitBtn.addEventListener('click', handleUnifiedSubmit);
    
    // Event listeners para botones de toolbar
    const attachPhotosBtn = document.getElementById('attach-photos-btn');
    if (attachPhotosBtn) {
        attachPhotosBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('unified-file-input');
            if (fileInput) fileInput.click();
        });
    }
    
    // Contador de caracteres
    setupCharacterCounter();
    
    // Configurar botones de formato para la interfaz unificada
    setupUnifiedFormatButtons();
    
    console.log('✅ Interfaz unificada moderna inicializada');
}

// Auto-resize del textarea
function autoResizeTextarea() {
    // Para contenteditable, el auto-resize se maneja con CSS max-height y overflow
    // No necesitamos cambiar height manualmente
}

// Configurar contador de caracteres
function setupCharacterCounter() {
    const charCount = document.getElementById('char-count');
    if (!charCount) return;
    
    unifiedTextarea.addEventListener('input', () => {
        const count = unifiedTextarea.textContent.length;
        charCount.textContent = count;
        
        // Cambiar color según la longitud
        if (count > 500) {
            charCount.style.color = '#dc2626';
        } else if (count > 300) {
            charCount.style.color = '#f59e0b';
        } else {
            charCount.style.color = '#6b7280';
        }
    });
}

// === CONFIGURAR BOTONES DE FORMATO PARA INTERFAZ UNIFICADA ===
function setupUnifiedFormatButtons() {
    const formatButtons = [
        { id: 'format-bold-btn', format: 'bold', key: 'b' },
        { id: 'format-italic-btn', format: 'italic', key: 'i' },
        { id: 'format-underline-btn', format: 'underline', key: 'u' },
        { id: 'format-strikethrough-btn', format: 'strikethrough', key: null },
        { id: 'format-code-btn', format: 'code', key: null },
        { id: 'format-quote-btn', format: 'quote', key: null },
        { id: 'format-list-btn', format: 'list', key: null },
        { id: 'format-numbered-list-btn', format: 'numbered-list', key: null }
    ];

    formatButtons.forEach(({ id, format, key }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                applyUnifiedTextFormat(format);
                button.classList.add('active');
                setTimeout(() => button.classList.remove('active'), 200);
            });
        }
    });

    // Atajos de teclado para formato
    unifiedTextarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    applyUnifiedTextFormat('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    applyUnifiedTextFormat('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    applyUnifiedTextFormat('underline');
                    break;
            }
        }
    });

    console.log('🎨 Botones de formato unificados configurados');
}

// === APLICAR FORMATO DE TEXTO EN INTERFAZ UNIFICADA ===
function applyUnifiedTextFormat(format) {
    const editor = unifiedTextarea;
    
    // Asegurar que el editor tenga foco
    editor.focus();
    
    try {
        switch (format) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
                
            case 'italic':
                document.execCommand('italic', false, null);
                break;
                
            case 'underline':
                document.execCommand('underline', false, null);
                break;
                
            case 'strikethrough':
                document.execCommand('strikeThrough', false, null);
                break;
                
            case 'code':
                // Para código, envolvemos en <code>
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const selectedText = range.toString();
                    
                    if (selectedText) {
                        const codeElement = document.createElement('code');
                        codeElement.textContent = selectedText;
                        range.deleteContents();
                        range.insertNode(codeElement);
                    } else {
                        const codeElement = document.createElement('code');
                        codeElement.textContent = 'código';
                        range.insertNode(codeElement);
                        
                        // Seleccionar el texto insertado
                        const newRange = document.createRange();
                        newRange.selectNodeContents(codeElement);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                }
                break;
                
            case 'quote':
                // Para citas, envolvemos en <blockquote>
                const quoteSelection = window.getSelection();
                if (quoteSelection.rangeCount > 0) {
                    const range = quoteSelection.getRangeAt(0);
                    const selectedText = range.toString();
                    
                    const blockquote = document.createElement('blockquote');
                    if (selectedText) {
                        blockquote.textContent = selectedText;
                        range.deleteContents();
                    } else {
                        blockquote.textContent = 'Cita...';
                    }
                    range.insertNode(blockquote);
                }
                break;
                
            case 'list':
                document.execCommand('insertUnorderedList', false, null);
                break;
                
            case 'numbered-list':
                document.execCommand('insertOrderedList', false, null);
                break;
        }
        
        // Trigger input event para contador de caracteres
        editor.dispatchEvent(new Event('input'));
        
        console.log(`✨ Formato aplicado: ${format}`);
        
    } catch (error) {
        console.error('Error aplicando formato:', error);
    }
}

// Manejar atajos de teclado
function handleUnifiedKeydown(e) {
    // Cmd/Ctrl + Enter para enviar
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!unifiedSubmitBtn.disabled) {
            handleUnifiedSubmit();
        }
    }
}

// Manejar cambios en el textarea
function handleUnifiedTextChange() {
    const hasText = unifiedTextarea.textContent.trim().length > 0;
    const hasAttachments = unifiedAttachments.length > 0;
    
    unifiedSubmitBtn.disabled = !hasText && !hasAttachments;
    
    // Actualizar placeholder del drop zone
    updateDropZonePlaceholder(hasText);
}

// Actualizar placeholder de la zona de drop
function updateDropZonePlaceholder(hasText) {
    const dropPrimary = unifiedDropZone.querySelector('.drop-primary');
    const dropSecondary = unifiedDropZone.querySelector('.drop-secondary');
    
    if (hasText) {
        dropPrimary.textContent = 'Agrega imágenes a tu comentario';
        dropSecondary.textContent = 'Las fotos ayudan a explicar mejor el problema';
    } else {
        dropPrimary.textContent = 'Arrastra imágenes aquí';
        dropSecondary.textContent = 'o haz clic para explorar';
    }
}

// Manejar paste de imágenes
function handleUnifiedPaste(e) {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
        e.preventDefault();
        imageItems.forEach(item => {
            const file = item.getAsFile();
            if (file) {
                addUnifiedAttachment(file);
            }
        });
        
        // Mostrar mensaje de confirmación
        showToast('✅ Imagen pegada desde el portapapeles', 'success');
    }
}

// Manejar drag over
function handleUnifiedDragOver(e) {
    e.preventDefault();
    unifiedDropZone.classList.add('dragover');
    unifiedDropZone.setAttribute('data-active', 'true');
}

// Manejar drag leave
function handleUnifiedDragLeave(e) {
    e.preventDefault();
    unifiedDropZone.classList.remove('dragover');
    unifiedDropZone.setAttribute('data-active', 'false');
}

// Manejar drop
function handleUnifiedDrop(e) {
    e.preventDefault();
    unifiedDropZone.classList.remove('dragover');
    unifiedDropZone.setAttribute('data-active', 'false');
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
        imageFiles.forEach(file => addUnifiedAttachment(file));
        showToast(`✅ ${imageFiles.length} imagen(es) agregada(s)`, 'success');
    } else {
        showToast('⚠️ Solo se permiten archivos de imagen', 'warning');
    }
}

// Manejar selección de archivos
function handleUnifiedFileSelect(e) {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach(file => addUnifiedAttachment(file));
    
    if (imageFiles.length > 0) {
        showToast(`✅ ${imageFiles.length} imagen(es) seleccionada(s)`, 'success');
    }
    
    // Limpiar input
    e.target.value = '';
}

// Agregar archivo adjunto
function addUnifiedAttachment(file) {
    // Validar tamaño (5MB máximo - mismo límite que backend)
    if (file.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
        showToast(`❌ "${file.name}" es demasiado grande (máx. ${FILE_LIMITS.IMAGE_MAX_SIZE_TEXT})`, 'error');
        return;
    }
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
        showToast(`❌ "${file.name}" no es una imagen válida`, 'error');
        return;
    }
    
    // Crear objeto de adjunto
    const attachment = {
        id: Date.now() + Math.random(),
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: null
    };
    
    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
        attachment.preview = e.target.result;
        unifiedAttachments.push(attachment);
        renderUnifiedAttachments();
        handleUnifiedTextChange();
    };
    reader.readAsDataURL(file);
}

// Renderizar adjuntos modernos
function renderUnifiedAttachments() {
    let container = document.getElementById('attachments-preview');
    
    if (unifiedAttachments.length === 0) {
        if (container) {
            container.classList.add('hidden');
        }
        return;
    }
    
    // Mostrar contenedor si está oculto
    if (container) {
        container.classList.remove('hidden');
        container.innerHTML = unifiedAttachments.map(attachment => `
            <div class="attachment-item-modern" data-id="${attachment.id}">
                <img src="${attachment.preview}" alt="${attachment.name}" class="attachment-preview-modern">
                <div class="attachment-info-modern">
                    <div class="attachment-name-modern">${attachment.name}</div>
                    <div class="attachment-size-modern">${(attachment.size / 1024).toFixed(1)} KB</div>
                </div>
                <button type="button" class="attachment-remove-modern" onclick="removeUnifiedAttachment('${attachment.id}')" title="Remover imagen">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
        
        // Re-inicializar iconos de Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Remover adjunto
function removeUnifiedAttachment(attachmentId) {
    const attachment = unifiedAttachments.find(att => att.id == attachmentId);
    if (attachment) {
        showToast(`🗑️ "${attachment.name}" removida`, 'info');
    }
    
    unifiedAttachments = unifiedAttachments.filter(att => att.id != attachmentId);
    renderUnifiedAttachments();
    handleUnifiedTextChange();
}

// Manejar envío del comentario unificado
async function handleUnifiedSubmit() {
    const comment = unifiedTextarea.innerHTML.trim();
    const hasText = unifiedTextarea.textContent.trim().length > 0;
    const hasAttachments = unifiedAttachments.length > 0;
    
    if (!hasText && !hasAttachments) {
        showToast('⚠️ Escribe un comentario o agrega una imagen', 'warning');
        return;
    }
    
    try {
        // Mostrar estado de carga
        const interface = document.querySelector('.unified-comment-interface-modern');
        const statusContainer = document.getElementById('composer-status');
        
        interface.classList.add('loading');
        if (statusContainer) {
            statusContainer.classList.remove('hidden');
            statusContainer.querySelector('.status-text').textContent = 'Enviando comentario...';
        }
        
        // Deshabilitar botón
        unifiedSubmitBtn.disabled = true;
        const sendTextEl = unifiedSubmitBtn.querySelector('.send-text');
        if (sendTextEl) {
            sendTextEl.textContent = 'Enviando...';
        }
        
        // Procesar comentario y adjuntos normalmente
        // Si hay texto, agregar como nota normal
        if (hasText) {
            await addUnifiedNote(comment);
        }
        
        // Si hay adjuntos, subirlos
        if (hasAttachments) {
            await uploadUnifiedAttachments(comment);
        }
        
        // Mostrar éxito
        showToast('✅ Comentario enviado exitosamente', 'success');
        
        // Limpiar interfaz
        clearUnifiedInterface();
        
        // Actualizar interfaz
        renderNotes();
        renderPhotos();
        renderTicketStats();
        
        console.log('✅ Comentario unificado enviado exitosamente');
        
    } catch (error) {
        console.error('❌ Error al enviar comentario unificado:', error);
        showToast('❌ Error al enviar el comentario', 'error');
    } finally {
        // Remover estado de carga
        const interface = document.querySelector('.unified-comment-interface-modern');
        const statusContainer = document.getElementById('composer-status');
        
        interface.classList.remove('loading');
        if (statusContainer) {
            statusContainer.classList.add('hidden');
        }
        
        // Restaurar botón
        unifiedSubmitBtn.disabled = false;
        unifiedSubmitBtn.querySelector('.send-text').textContent = 'Enviar';
    }
}

// Agregar nota mediante interfaz unificada
async function addUnifiedNote(comment) {
    // Convertir HTML a Markdown antes de enviar
    const markdownComment = convertHtmlToMarkdown(comment);
    
    // Obtener el tipo de comentario seleccionado
    const commentTypeSelect = document.getElementById('comment-type-select');
    const commentType = commentTypeSelect ? commentTypeSelect.value : 'General';
    
    const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            note: markdownComment,
            note_type: commentType,
            author: 'Felipe Maturana',
            is_internal: false
        })
    });
    
    if (!response.ok) {
        throw new Error(`Error al agregar nota: HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    // Actualizar estado local con la nueva nota
    if (result.data) {
        const newNote = {
            id: result.data.id,
            note: markdownComment,
            note_type: commentType,
            author: 'Felipe Maturana',
            is_internal: false,
            created_at: new Date().toISOString()
        };
        
        // Agregar al inicio del array para que aparezca primero
        state.notes.unshift(newNote);
        console.log('✅ Nota agregada al estado local:', newNote);
    }
    
    return result;
}

// Subir adjuntos mediante interfaz unificada
async function uploadUnifiedAttachments(comment) {
    const uploadPromises = unifiedAttachments.map(async (attachment) => {
        // Convertir archivo a base64
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(attachment.file);
        });
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/photos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                photo_data: base64,
                file_name: attachment.name,
                mime_type: attachment.type,
                file_size: attachment.size,
                description: comment || `Foto del ticket ${state.currentTicket.id}`,
                photo_type: 'Evidencia'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error al subir ${attachment.name}: HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Actualizar estado local con la nueva foto
        if (result.data) {
            const newPhoto = {
                id: result.data.id,
                photo_data: base64,
                file_name: attachment.name,
                file_path: result.data.file_path || null,
                mime_type: attachment.type,
                file_size: attachment.size,
                description: comment || `Foto del ticket ${state.currentTicket.id}`,
                photo_type: 'Evidencia',
                created_at: new Date().toISOString()
            };
            
            // Agregar al inicio del array para que aparezca primero
            state.photos.unshift(newPhoto);
            console.log('✅ Foto agregada al estado local:', newPhoto.file_name);
        }
        
        return result;
    });
    
    const results = await Promise.all(uploadPromises);
    console.log(`✅ ${results.length} fotos subidas y agregadas al estado local`);
    return results;
}

// Limpiar interfaz unificada
function clearUnifiedInterface() {
    unifiedTextarea.innerHTML = '';
    unifiedAttachments = [];
    renderUnifiedAttachments();
    handleUnifiedTextChange();
    
    // Contraer zona de drop y resetear botón adjuntar
    const dropZone = document.getElementById('unified-drop-zone');
    const attachBtn = document.getElementById('attach-files-btn');
    if (dropZone && dropZone.classList.contains('expanded')) {
        dropZone.classList.remove('expanded');
        if (attachBtn) attachBtn.classList.remove('active');
    }
    
    // Resetear contador de caracteres
    const charCount = document.getElementById('char-count');
    if (charCount) {
        charCount.textContent = '0';
        charCount.style.color = '#6b7280';
    }
    
    // Resetear selector de tipo de comentario
    const commentTypeSelect = document.getElementById('comment-type-select');
    if (commentTypeSelect) {
        commentTypeSelect.value = 'General';
    }
}

// === CONVERTIR HTML A MARKDOWN ===
function convertHtmlToMarkdown(html) {
    if (!html) return '';
    
    // Crear un elemento temporal para parsear el HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Convertir elementos HTML a Markdown
    let markdown = temp.innerHTML;
    
    // Convertir elementos específicos
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');
    markdown = markdown.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~');
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1');
    
    // Listas
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1');
    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1');
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n');
    
    // Limpiar tags restantes
    markdown = markdown.replace(/<[^>]*>/g, '');
    
    // Decodificar entidades HTML
    markdown = markdown.replace(/&nbsp;/g, ' ');
    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&quot;/g, '"');
    
    return markdown.trim();
}

// Sistema de toasts para feedback
function showToast(message, type = 'info') {
    // Crear toast si no existe
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Crear toast
    const toast = document.createElement('div');
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#6366f1'
    };
    
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Animar entrada
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    });
    
    // Remover después de 4 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Hacer funciones disponibles globalmente
window.viewPhoto = viewPhoto;
window.deletePhoto = deletePhoto;

// Función para eliminar nota
async function deleteNote(noteId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        console.log(`🗑️ Eliminando nota ${noteId}...`);
        
        const response = await authenticatedFetch(`${API_URL}/tickets/notes/${noteId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al eliminar nota: HTTP ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Nota eliminada exitosamente:', result);
        
        // Remover nota del estado local
        state.notes = state.notes.filter(note => note.id !== noteId);
        
        // Actualizar interfaz
        renderNotes(); // Usar nuevo sistema de renderizado
        renderTicketStats();
        
        console.log('🔄 Nota eliminada y interfaz actualizada');
        
    } catch (error) {
        console.error('❌ Error al eliminar nota:', error);
        alert('Error al eliminar el comentario. Inténtalo de nuevo.');
    }
}

window.deleteNote = deleteNote;

// Función para eliminar un grupo completo de actividad unificada
async function deleteActivityGroup(noteIds = [], photoIds = []) {
    console.log('🗑️ deleteActivityGroup llamada con:', { noteIds, photoIds });
    
    const totalItems = noteIds.length + photoIds.length;
    if (totalItems === 0) {
        console.log('⚠️ No hay elementos para eliminar');
        return;
    }
    
    console.log('📋 Preparando modal de confirmación...');
    
    // Crear modal de confirmación personalizado más elegante
    const itemsText = [];
    if (noteIds.length > 0) itemsText.push(`${noteIds.length} comentario(s)`);
    if (photoIds.length > 0) itemsText.push(`${photoIds.length} foto(s)`);
    
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.innerHTML = `
        <div class="base-modal-content" style="max-width: 400px;">
            <div class="base-modal-header">
                <h3 class="base-modal-title">
                    <i data-lucide="trash-2" class="w-5 h-5 text-red-500"></i>
                    Confirmar Eliminación
                </h3>
            </div>
            <div class="base-modal-body">
                <p style="margin-bottom: 1rem; color: #64748b;">
                    ¿Estás seguro de que deseas eliminar esta actividad completa?
                </p>
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem;">
                    <p style="color: #dc2626; font-weight: 500; margin: 0;">
                        Se eliminarán: ${itemsText.join(' y ')}
                    </p>
                </div>
                <p style="color: #ef4444; font-size: 0.875rem; margin: 0;">
                    <strong>⚠️ Esta acción no se puede deshacer</strong>
                </p>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="btn-secondary" id="cancel-delete-btn">
                    Cancelar
                </button>
                <button type="button" class="btn-danger" id="confirm-delete-btn">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                    Eliminar Definitivamente
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
    
    // Hacer visible el modal
    setTimeout(() => modal.classList.add('is-open'), 10);
    
    console.log('✅ Modal de confirmación creado y agregado al DOM');
    
    // Manejar confirmación
    const confirmBtn = modal.querySelector('#confirm-delete-btn');
    const cancelBtn = modal.querySelector('#cancel-delete-btn');
    
    // Botón cancelar
    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('is-open');
        setTimeout(() => modal.remove(), 300);
    });
    
    // Botón confirmar
    confirmBtn.addEventListener('click', async () => {
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Eliminando...';
            
            console.log(`🗑️ Eliminando actividad grupal: ${noteIds.length} notas, ${photoIds.length} fotos...`);
            
            // Eliminar comentarios en paralelo
            const notePromises = noteIds.map(noteId => authenticatedFetch(`${API_URL}/tickets/notes/${noteId}`, {
                    method: 'DELETE',
                    headers: { 'Accept': 'application/json' }
                })
            );
            
            // Eliminar fotos en paralelo
            const photoPromises = photoIds.map(photoId => authenticatedFetch(`${API_URL}/tickets/${state.currentTicket?.id}/photos/${photoId}`, {
                    method: 'DELETE',
                    headers: { 'Accept': 'application/json' }
                })
            );
            
            // Ejecutar todas las eliminaciones
            const allPromises = [...notePromises, ...photoPromises];
            const responses = await Promise.all(allPromises);
            
            // Verificar que todas las respuestas sean exitosas
            const failedRequests = responses.filter(response => !response.ok);
            if (failedRequests.length > 0) {
                throw new Error(`${failedRequests.length} elementos no pudieron eliminarse`);
            }
            
            console.log('✅ Actividad grupal eliminada exitosamente');
            
            // Actualizar estado local
            if (noteIds.length > 0) {
                state.notes = state.notes.filter(note => !noteIds.includes(note.id));
            }
            
            if (photoIds.length > 0) {
                state.photos = state.photos.filter(photo => !photoIds.includes(photo.id));
            }
            
            // Cerrar modal
            modal.classList.remove('is-open');
            setTimeout(() => modal.remove(), 300);
            
            // Actualizar interfaz
            renderNotes(); // Usar nuevo sistema de renderizado
            renderTicketStats();
            
            // Mostrar mensaje de éxito
            showToast('✅ Actividad eliminada correctamente', 'success');
            
            console.log('🔄 Actividad eliminada y interfaz actualizada');
            
        } catch (error) {
            console.error('❌ Error al eliminar actividad grupal:', error);
            modal.classList.remove('is-open');
            setTimeout(() => modal.remove(), 300);
            showToast('❌ Error al eliminar la actividad', 'error');
        }
    });
}

// Función para editar un grupo de actividad unificada
async function editActivityGroup(noteIds = [], photoIds = []) {
    console.log('✏️ Editando grupo de actividad:', { noteIds, photoIds });
    
    if (noteIds.length > 0) {
        // Si hay notas, abrir modal de edición de nota
        const firstNote = state.notes.find(note => note.id === noteIds[0]);
        console.log('🔍 Buscando nota con ID:', noteIds[0], 'Encontrada:', firstNote);
        console.log('📝 Estado de notas disponibles:', state.notes.map(n => ({ id: n.id, note: n.note?.substring(0, 50) })));
        
        if (!firstNote) {
            showToast('❌ No se encontró la nota para editar', 'error');
            return;
        }
        
        // Crear modal de edición usando el modal base existente
        const modal = document.createElement('div');
        modal.className = 'base-modal';
        modal.innerHTML = `
            <div class="base-modal-content edit-note-modal" style="max-width: 650px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                <div class="base-modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px 12px 0 0; padding: 1.5rem; border-bottom: none;">
                    <h3 class="base-modal-title" style="margin: 0; font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.75rem;">
                        <div style="background: rgba(255,255,255,0.2); padding: 0.5rem; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="edit-3" class="w-5 h-5"></i>
                        </div>
                        Editar Comentario
                    </h3>
                    <button type="button" class="base-modal-close" onclick="this.closest('.base-modal').remove()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.5rem; border-radius: 6px; transition: all 0.2s ease;">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="base-modal-body" style="padding: 2rem; background: #fafbfc;">
                            <div style="background: white; border-radius: 8px; padding: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                        <form id="edit-note-form">
                            <!-- Pestañas de Editar/Vista Previa -->
                            <div class="edit-modal-tabs" style="display: flex; margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
                                <button type="button" class="edit-tab-btn active" data-tab="edit" style="padding: 0.5rem 1rem; border: none; background: transparent; color: #6366f1; border-bottom: 2px solid #6366f1; cursor: pointer; font-weight: 600;">
                                    Editar
                                </button>
                                <button type="button" class="edit-tab-btn" data-tab="preview" style="padding: 0.5rem 1rem; border: none; background: transparent; color: #6b7280; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 600;">
                                    Vista Previa
                                </button>
                            </div>
                            
                            <!-- Panel de Edición -->
                            <div id="edit-panel" class="edit-panel">
                                <div class="form-group" style="margin-bottom: 1.5rem;">
                                    <label for="edit-note-text" class="form-label" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; font-size: 0.9rem;">
                                        <div style="background: #dbeafe; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                            <i data-lucide="message-circle" class="w-4 h-4 text-blue-600"></i>
                                        </div>
                                        Comentario
                                    </label>
                                    <textarea 
                                        id="edit-note-text" 
                                        name="note" 
                                        class="form-control" 
                                        rows="4" 
                                        placeholder="Escribe tu comentario aquí..."
                                        required
                                        style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; font-size: 0.9rem; transition: all 0.2s ease; resize: vertical; min-height: 100px;"
                                    >${firstNote.note || ''}</textarea>
                                </div>
                            </div>
                            
                            <!-- Panel de Vista Previa -->
                            <div id="preview-panel" class="edit-panel" style="display: none;">
                                <div class="form-group" style="margin-bottom: 1.5rem;">
                                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; font-size: 0.9rem;">
                                        <div style="background: #dcfce7; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                            <i data-lucide="eye" class="w-4 h-4 text-green-600"></i>
                                        </div>
                                        Vista Previa
                                    </label>
                                    <div id="edit-preview-content" style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; min-height: 100px; background: #f9fafb; color: #374151; line-height: 1.5;">
                                        ${renderMarkdown(firstNote.note || '')}
                                    </div>
                                </div>
                            </div>                            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                                <div class="form-group">
                                    <label for="edit-note-type" class="form-label" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; font-size: 0.9rem;">
                                        <div style="background: #dcfce7; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                            <i data-lucide="tag" class="w-4 h-4 text-green-600"></i>
                                        </div>
                                        Tipo de Nota
                                    </label>
                                    <select id="edit-note-type" name="note_type" class="form-control" required style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; font-size: 0.9rem; transition: all 0.2s ease; background: white;">
                                        <option value="">Seleccionar tipo</option>
                                        <option value="general" ${firstNote.note_type === 'general' ? 'selected' : ''}>💬 General</option>
                                        <option value="diagnostico" ${firstNote.note_type === 'diagnostico' ? 'selected' : ''}>🔍 Diagnóstico</option>
                                        <option value="solucion" ${firstNote.note_type === 'solucion' ? 'selected' : ''}>✅ Solución</option>
                                        <option value="seguimiento" ${firstNote.note_type === 'seguimiento' ? 'selected' : ''}>📋 Seguimiento</option>
                                        <option value="cliente" ${firstNote.note_type === 'cliente' ? 'selected' : ''}>👤 Comunicación Cliente</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; font-size: 0.9rem;">
                                        <div style="background: #fef3c7; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                            <i data-lucide="shield" class="w-4 h-4 text-yellow-600"></i>
                                        </div>
                                        Visibilidad
                                    </label>
                                    <label class="checkbox-label" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;">
                                        <input 
                                            type="checkbox" 
                                            id="edit-is-internal" 
                                            name="is_internal" 
                                            ${firstNote.is_internal ? 'checked' : ''}
                                            style="width: 18px; height: 18px; accent-color: #667eea;"
                                        >
                                        <span class="checkbox-text" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #64748b;">
                                            <i data-lucide="eye-off" class="w-4 h-4"></i>
                                            Nota interna (solo técnicos)
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                <div class="base-modal-footer" style="padding: 1.5rem 2rem; background: #f8fafc; border-radius: 0 0 12px 12px; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid #e2e8f0;">
                    <button type="button" class="btn-secondary" onclick="this.closest('.base-modal').remove()" style="padding: 0.75rem 1.5rem; font-weight: 500; border-radius: 8px; transition: all 0.2s ease; border: 2px solid #e5e7eb;">
                        <i data-lucide="x" class="w-4 h-4" style="margin-right: 0.5rem;"></i>
                        Cancelar
                    </button>
                    <button type="button" class="btn-primary" id="update-note-btn" style="padding: 0.75rem 1.5rem; font-weight: 500; border-radius: 8px; transition: all 0.2s ease; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; box-shadow: 0 4px 6px -1px rgba(102, 126, 234, 0.3);">
                        <i data-lucide="save" class="w-4 h-4" style="margin-right: 0.5rem;"></i>
                        Actualizar Comentario
                    </button>
                </div>
            </div>
        `;
        
        // Agregar modal al DOM
        document.body.appendChild(modal);
        
        // Mostrar modal con animación
        setTimeout(() => {
            modal.classList.add('is-open');
        }, 10);
        
        // Inicializar iconos de Lucide
        lucide.createIcons();
        
        // === CONFIGURAR PESTAÑAS DE EDICIÓN/VISTA PREVIA ===
        setupEditModalTabs(modal, firstNote.note || '');
        
        console.log('✅ Modal de edición creado y mostrado');
        
        // Manejar actualización
        const updateBtn = modal.querySelector('#update-note-btn');
        updateBtn.addEventListener('click', () => updateAdvancedNote(updateBtn, noteIds[0], modal));
        
    } else if (photoIds.length > 0) {
        // Si solo hay fotos, permitir cambiar la descripción o eliminar fotos individuales
        const photos = state.photos.filter(photo => photoIds.includes(photo.id));
        if (photos.length === 0) {
            showToast('❌ No se encontraron las fotos para editar', 'error');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'base-modal';
        modal.innerHTML = `
            <div class="base-modal-content" style="max-width: 700px;">
                <div class="base-modal-header">
                    <h3 class="base-modal-title">
                        <i data-lucide="image" class="w-5 h-5 text-green-500"></i>
                        Gestionar Fotos (${photos.length})
                    </h3>
                    <button type="button" class="base-modal-close" onclick="this.closest('.base-modal').remove()">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="base-modal-body">
                    <p style="color: #64748b; margin-bottom: 1rem;">
                        Puedes eliminar fotos individuales o toda la actividad completa.
                    </p>
                    <div class="photos-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 1rem;">
                        ${photos.map(photo => `
                            <div class="photo-item" style="position: relative; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                                <img src="data:image/jpeg;base64,${photo.photo}" alt="Foto" style="width: 100%; height: 100px; object-fit: cover;">
                                <div style="padding: 0.5rem; background: white;">
                                    <p style="font-size: 0.75rem; color: #64748b; margin: 0;">
                                        ${new Date(photo.uploaded_at).toLocaleDateString()}
                                    </p>
                                    <button type="button" class="btn-danger" style="width: 100%; margin-top: 0.5rem; font-size: 0.75rem; padding: 0.25rem;" onclick="deleteIndividualPhoto(${photo.id}, this)">
                                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="base-modal-footer">
                    <button type="button" class="btn-secondary" onclick="this.closest('.base-modal').remove()">
                        Cerrar
                    </button>
                    <button type="button" class="btn-danger" onclick="deleteActivityGroup([], [${photoIds.join(',')}]); this.closest('.base-modal').remove();">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                        Eliminar Todas
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        lucide.createIcons();
        
    } else {
        showToast('❌ No hay elementos para editar en esta actividad', 'error');
    }
}

// Función para actualizar una nota existente
async function updateAdvancedNote(button, noteId, modal) {
    const form = modal.querySelector('#edit-note-form');
    const formData = new FormData(form);
    
    const noteText = formData.get('note').trim();
    const noteType = formData.get('note_type');
    const isInternal = formData.get('is_internal') === 'on';
    
    if (!noteText) {
        showToast('❌ El comentario no puede estar vacío', 'error');
        return;
    }
    
    if (!noteType) {
        showToast('❌ Selecciona el tipo de nota', 'error');
        return;
    }
    
    try {
        button.disabled = true;
        button.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Actualizando...';
        
        const updateData = {
            note: noteText,
            note_type: noteType,
            is_internal: isInternal
        };
        
        const response = await authenticatedFetch(`${API_URL}/tickets/notes/${noteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Actualizar el estado local
        const noteIndex = state.notes.findIndex(note => note.id === noteId);
        if (noteIndex !== -1) {
            state.notes[noteIndex] = { 
                ...state.notes[noteIndex], 
                ...updateData,
                updated_at: new Date().toISOString()
            };
        }
        
        // Cerrar modal
        modal.remove();
        
        // Actualizar interfaz
        renderNotes();
        renderTicketStats();
        lucide.createIcons();
        
        // Mostrar mensaje de éxito
        showToast('✅ Comentario actualizado correctamente', 'success');
        
        console.log('✅ Nota actualizada exitosamente');
        
    } catch (error) {
        console.error('❌ Error al actualizar nota:', error);
        showToast(`❌ Error al actualizar: ${error.message}`, 'error');
        
        button.disabled = false;
        button.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Actualizar Comentario';
    }
}

// Función para eliminar foto individual desde el modal de edición
async function deleteIndividualPhoto(photoId, button) {
    if (!confirm('¿Eliminar esta foto?')) {
        return;
    }
    
    try {
        button.disabled = true;
        button.innerHTML = '<i data-lucide="loader" class="w-3 h-3 animate-spin"></i>';
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket?.id}/photos/${photoId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }
        
        // Actualizar estado local
        state.photos = state.photos.filter(photo => photo.id !== photoId);
        
        // Remover elemento visual
        button.closest('.photo-item').remove();
        
        // Actualizar interfaz principal
        renderNotes();
        
        showToast('✅ Foto eliminada correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error al eliminar foto:', error);
        showToast('❌ Error al eliminar la foto', 'error');
        
        button.disabled = false;
        button.innerHTML = '<i data-lucide="trash-2" class="w-3 h-3"></i> Eliminar';
    }
}

window.editActivityGroup = editActivityGroup;
window.updateAdvancedNote = updateAdvancedNote;
window.deleteIndividualPhoto = deleteIndividualPhoto;

// Función para alternar la visibilidad de los adjuntos
function toggleAttachments(activityId) {
    const photosContainer = document.getElementById(`photos-${activityId}`);
    const toggleButton = document.getElementById(`toggle-${activityId}`);
    const attachmentsContainer = photosContainer?.closest('.email-attachments');
    
    if (!photosContainer || !toggleButton) {
        console.error('❌ No se encontraron elementos para:', activityId);
        return;
    }
    
    const isExpanded = photosContainer.classList.contains('expanded');
    const toggleIcon = toggleButton.querySelector('i[data-lucide]');
    const toggleText = toggleButton.querySelector('span');
    
    if (isExpanded) {
        // Colapsar
        photosContainer.classList.remove('expanded');
        photosContainer.classList.add('collapsed');
        toggleButton.classList.remove('expanded');
        attachmentsContainer?.classList.remove('expanded');
        
        // Detectar tipo de contenido para el texto
        const isPhotoOnly = activityId.includes('photo-activity');
        if (toggleText) {
            toggleText.textContent = isPhotoOnly ? 'Ver archivos' : 'Ver adjuntos';
        }
        
        if (toggleIcon) {
            toggleIcon.setAttribute('data-lucide', 'chevron-down');
        }
    } else {
        // Expandir
        photosContainer.classList.remove('collapsed');
        photosContainer.classList.add('expanded');
        toggleButton.classList.add('expanded');
        attachmentsContainer?.classList.add('expanded');
        
        // Detectar tipo de contenido para el texto
        const isPhotoOnly = activityId.includes('photo-activity');
        if (toggleText) {
            toggleText.textContent = isPhotoOnly ? 'Ocultar archivos' : 'Ocultar adjuntos';
        }
        
        if (toggleIcon) {
            toggleIcon.setAttribute('data-lucide', 'chevron-up');
        }
    }
    
    // Actualizar íconos de Lucide
    setTimeout(() => lucide.createIcons(), 10);
    
    console.log(`📸 ${isExpanded ? 'Colapsados' : 'Expandidos'} adjuntos para:`, activityId);
}

// Función para inicializar event listeners de botones de acción
function initializeActionButtons() {
    console.log('🔧 Inicializando event listeners de botones de acción...');
    
    // Remover event listeners previos para evitar duplicados
    document.querySelectorAll('.ticket-action-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Agregar event listeners para botones de editar
    document.querySelectorAll('.ticket-action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const noteIds = btn.dataset.noteIds ? btn.dataset.noteIds.split(',').filter(id => id).map(id => parseInt(id, 10)) : [];
            const photoIds = btn.dataset.photoIds ? btn.dataset.photoIds.split(',').filter(id => id).map(id => parseInt(id, 10)) : [];
            
            console.log('✏️ Botón editar clickeado:', { noteIds, photoIds });
            editActivityGroup(noteIds, photoIds);
        });
    });
    
    // Agregar event listeners para botones de eliminar
    document.querySelectorAll('.ticket-action-btn.danger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const noteIds = btn.dataset.noteIds ? btn.dataset.noteIds.split(',').filter(id => id).map(id => parseInt(id, 10)) : [];
            const photoIds = btn.dataset.photoIds ? btn.dataset.photoIds.split(',').filter(id => id).map(id => parseInt(id, 10)) : [];
            
            console.log('🗑️ Botón eliminar clickeado:', { noteIds, photoIds });
            deleteActivityGroup(noteIds, photoIds);
        });
    });
    
    console.log('✅ Event listeners inicializados correctamente');
}

// === CONFIGURACIÓN DE PESTAÑAS DEL MODAL DE EDICIÓN ===
function setupEditModalTabs(modal, initialText) {
    const tabButtons = modal.querySelectorAll('.edit-tab-btn');
    const editPanel = modal.querySelector('#edit-panel');
    const previewPanel = modal.querySelector('#preview-panel');
    const textarea = modal.querySelector('#edit-note-text');
    const previewContent = modal.querySelector('#edit-preview-content');
    
    // Manejar clic en pestañas
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Actualizar pestañas activas
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.style.color = '#6b7280';
                b.style.borderBottomColor = 'transparent';
            });
            
            btn.classList.add('active');
            btn.style.color = '#6366f1';
            btn.style.borderBottomColor = '#6366f1';
            
            // Mostrar/ocultar paneles
            if (tab === 'edit') {
                editPanel.style.display = 'block';
                previewPanel.style.display = 'none';
            } else if (tab === 'preview') {
                editPanel.style.display = 'none';
                previewPanel.style.display = 'block';
                // Actualizar vista previa
                updatePreview();
            }
        });
    });
    
    // Función para actualizar vista previa
    function updatePreview() {
        const text = textarea.value;
        previewContent.innerHTML = renderMarkdown(text) || '<em style="color: #9ca3af;">Escribe algo para ver la vista previa...</em>';
    }
    
    // Actualizar vista previa en tiempo real mientras escribes
    textarea.addEventListener('input', () => {
        // Solo actualizar si la pestaña de vista previa está visible
        if (previewPanel.style.display !== 'none') {
            updatePreview();
        }
    });
    
    // Inicializar vista previa
    updatePreview();
    
    console.log('👁️ Pestañas de edición/vista previa configuradas');
}

// =============================================================================
// DECLARACIONES GLOBALES PARA EL NAVEGADOR
// =============================================================================
window.toggleAttachments = toggleAttachments;
window.removeUnifiedAttachment = removeUnifiedAttachment;
window.initUnifiedInterface = initUnifiedInterface;
window.editActivityGroup = editActivityGroup;
window.updateAdvancedNote = updateAdvancedNote;
window.deleteActivityGroup = deleteActivityGroup;
window.deleteIndividualPhoto = deleteIndividualPhoto;
window.initializeActionButtons = initializeActionButtons;

// === SISTEMA DE CONTROL DE ESTADO DEL TICKET ===

function renderStatusControls(ticket) {
    if (!ticket) return;
    
    const container = document.getElementById('ticket-status-controls');
    if (!container) return;
    
    const currentStatus = ticket.status;
    const statusOptions = [
        { value: 'En Progreso', label: 'En Progreso', icon: 'play-circle', class: 'status-en-progreso' },
        { value: 'En Espera', label: 'En Espera', icon: 'pause-circle', class: 'status-en-espera' },
        { value: 'Resuelto', label: 'Resuelto', icon: 'check-circle', class: 'status-resuelto' },
        { value: 'Cerrado', label: 'Cerrar', icon: 'x-circle', class: 'status-cerrado' }
    ];
    
    // Filtrar opciones según el estado actual
    const availableOptions = statusOptions.filter(option => option.value !== currentStatus);
    
    if (availableOptions.length === 0) {
        container.innerHTML = `
            <div class="current-status-indicator status-${currentStatus.toLowerCase().replace(/ /g, '-')}">
                <i data-lucide="info" class="w-3 h-3"></i>
                Estado: ${currentStatus}
            </div>
        `;
        return;
    }
    
    const buttonsHtml = availableOptions.map(option => `
        <button type="button" 
                class="status-action-btn ${option.class}" 
                onclick="changeTicketStatus('${option.value}')"
                title="Cambiar estado a ${option.label}">
            <i data-lucide="${option.icon}" class="w-3 h-3"></i>
            ${option.label}
        </button>
    `).join('<div class="status-separator"></div>');
    
    container.innerHTML = `
        <div class="current-status-indicator status-${currentStatus.toLowerCase().replace(/ /g, '-')}">
            <i data-lucide="info" class="w-3 h-3"></i>
            ${currentStatus}
        </div>
        <div class="status-separator"></div>
        ${buttonsHtml}
    `;
    
    // Recrear iconos de Lucide
    lucide.createIcons();
}

async function changeTicketStatus(newStatus) {
    if (!state.currentTicket) return;
    
    const currentStatus = state.currentTicket.status;
    
    // Si es un cierre, mostrar opciones rápidas
    if (newStatus === 'Cerrado' || newStatus === 'Resuelto') {
        showQuickCloseOptions(newStatus);
        return;
    }
    
    // Para otros cambios de estado (En Progreso, En Espera), ejecutar directamente
    try {
        // 1. Obtener comentario del usuario (si existe)
        const textarea = document.getElementById('unified-comment-textarea');
        const userComment = textarea ? textarea.innerHTML.trim() : '';
        
        // 2. Ejecutar cambio de estado
        await executeDirectStatusChange(newStatus, userComment);
        
        // 3. Limpiar el área de comentarios después del envío
        if (textarea && userComment) {
            textarea.innerHTML = '';
            textarea.dispatchEvent(new Event('input')); // Trigger para actualizar contador
        }
        
        console.log(`✅ Estado cambiado directamente: ${currentStatus} → ${newStatus}`);
        
    } catch (error) {
        console.error('❌ Error al cambiar estado:', error);
        alert('Error al cambiar el estado del ticket');
    }
}

// FUNCIÓN DEPRECADA - Ya no se usa el sistema de estado pendiente
// function prepareStatusChangeComment(newStatus) {
//     const currentStatus = state.currentTicket.status;
//     const textarea = document.getElementById('unified-comment-textarea');
//     
//     if (!textarea) return;
//     
//     // Preparar el comentario con el cambio de estado
//     const statusChangeMessage = `Cambiando estado del ticket de "${currentStatus}" a "${newStatus}"`;
//     
//     // Si ya hay contenido, agregar el mensaje al final
//     const currentContent = textarea.innerHTML.trim();
//     if (currentContent && currentContent !== '') {
//         textarea.innerHTML = currentContent + '<br><br>' + statusChangeMessage;
//     } else {
//         textarea.innerHTML = statusChangeMessage;
//     }
//     
//     // Almacenar el cambio de estado pendiente
//     state.pendingStatusChange = {
//         from: currentStatus,
//         to: newStatus
//     };
//     
//     // Actualizar el botón de enviar para indicar que hay un cambio pendiente
//     updateSendButtonForStatusChange(newStatus);
//     
//     // Enfocar el textarea
//     textarea.focus();
//     
//     // Mover cursor al final
//     const range = document.createRange();
//     const selection = window.getSelection();
//     range.selectNodeContents(textarea);
//     range.collapse(false);
//     selection.removeAllRanges();
//     selection.addRange(range);
//     
//     console.log(`📝 Preparando cambio de estado: ${currentStatus} → ${newStatus}`);
// }

async function executeDirectStatusChange(newStatus, userComment) {
    if (!state.currentTicket) return;
    
    const currentStatus = state.currentTicket.status;
    
    try {
        // 1. Actualizar estado del ticket en el servidor
        await updateTicketStatus(state.currentTicket.id, newStatus);
        
        // 2. Actualizar estado local
        state.currentTicket.status = newStatus;
        
        // 3. Si el usuario escribió un comentario, agregarlo primero
        if (userComment && userComment !== '') {
            const markdownComment = convertHtmlToMarkdown(userComment);
            
            const noteData = {
                note: markdownComment,
                note_type: 'Seguimiento',
                author: 'Felipe Maturana'
            };
            
            const noteResponse = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });
            
            if (noteResponse.ok) {
                const noteResult = await noteResponse.json();
                const userNote = {
                    id: noteResult.data.id,
                    note: markdownComment,
                    note_type: noteData.note_type,
                    author: noteData.author,
                    is_internal: false,
                    created_at: new Date().toISOString()
                };
                
                state.notes.unshift(userNote);
            }
        }
        
        // 4. Agregar nota automática del sistema para el cambio de estado
        await addStatusChangeNote(currentStatus, newStatus);
        
        // 5. Re-renderizar interfaz
        renderStatusControls(state.currentTicket);
        renderStatusActions(state.currentTicket);
        renderTicketHeader(state.currentTicket);
        renderTicketStats();
        renderNotes();
        
        console.log(`✅ Cambio directo completado: "${currentStatus}" → "${newStatus}"`);
        
    } catch (error) {
        console.error('❌ Error en cambio directo de estado:', error);
        throw error;
    }
}

// FUNCIÓN DEPRECADA - Ya no se usa el sistema de estado pendiente
// function updateSendButtonForStatusChange(newStatus) {
//     const sendBtn = document.getElementById('send-comment-btn');
//     if (!sendBtn) return;
//     
//     // Habilitar el botón
//     sendBtn.disabled = false;
//     
//     // Cambiar el texto y estilo para indicar el cambio pendiente
//     const sendText = sendBtn.querySelector('.send-text');
//     if (sendText) {
//         sendText.textContent = `Cambiar a ${newStatus}`;
//     }
//     
//     // Agregar clase visual para indicar cambio pendiente
//     sendBtn.classList.add('status-change-pending');
//     
//     // Cambiar el color del botón según el estado
//     sendBtn.classList.remove('status-en-progreso', 'status-en-espera', 'status-resuelto', 'status-cerrado');
//     sendBtn.classList.add(`status-${newStatus.toLowerCase().replace(/ /g, '-')}`);
// }

function showQuickCloseOptions(statusType) {
    const container = document.getElementById('ticket-status-controls');
    if (!container) return;
    
    const existingOptions = container.querySelector('.quick-close-options');
    if (existingOptions) {
        existingOptions.remove();
    }
    
    const templates = statusType === 'Cerrado' ? [
        'Ticket cerrado - Problema resuelto completamente',
        'Ticket cerrado - Cliente satisfecho con la solución',
        'Ticket cerrado - Mantenimiento preventivo completado',
        'Ticket cerrado - Equipo reparado y funcionando correctamente',
        'Ticket cerrado - Sin respuesta del cliente por 48 horas'
    ] : [
        'Problema resuelto - Equipo funcionando correctamente',
        'Mantenimiento completado - Revisión realizada exitosamente',
        'Reparación finalizada - Componente reemplazado',
        'Diagnóstico completado - Solución implementada',
        'Servicio técnico finalizado - Cliente notificado'
    ];
    
    const optionsHtml = `
        <div class="quick-close-options show">
            <div class="quick-close-header">
                <i data-lucide="${statusType === 'Cerrado' ? 'x-circle' : 'check-circle'}" class="w-3 h-3"></i>
                ${statusType === 'Cerrado' ? 'Cerrar Ticket' : 'Marcar como Resuelto'}
                <span class="status-change-indicator">
                    <i data-lucide="arrow-right" class="w-3 h-3"></i>
                    ${statusType}
                </span>
            </div>
            <div class="quick-close-templates">
                ${templates.map(template => `
                    <button type="button" 
                            class="quick-template-btn" 
                            onclick="applyQuickClose('${statusType}', '${template.replace(/'/g, "\\'")}')">
                        ${template}
                    </button>
                `).join('')}
                <button type="button" 
                        class="quick-template-btn cancel-btn" 
                        onclick="hideQuickCloseOptions()">
                    <i data-lucide="x" class="w-3 h-3" style="display: inline-block; margin-right: 0.25rem;"></i>
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', optionsHtml);
    lucide.createIcons();
}

function hideQuickCloseOptions() {
    const options = document.querySelector('.quick-close-options');
    if (options) {
        options.remove();
    }
}

async function applyQuickClose(statusType, template) {
    if (!state.currentTicket) return;
    
    try {
        // 1. Actualizar estado del ticket
        await updateTicketStatus(state.currentTicket.id, statusType);
        
        // 2. Agregar nota con el template
        const noteData = {
            note: template,
            note_type: statusType === 'Cerrado' ? 'Solución' : 'Diagnóstico',
            author: 'Felipe Maturana'
        };
        
        const noteResponse = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });
        
        if (!noteResponse.ok) {
            throw new Error(`Error al agregar nota: ${noteResponse.status}`);
        }
        
        // 3. Actualizar estado local
        const currentStatus = state.currentTicket.status;
        state.currentTicket.status = statusType;
        
        // 4. Agregar la nueva nota al estado local
        const noteResult = await noteResponse.json();
        const newNote = {
            id: noteResult.data.id,
            note: template,
            note_type: noteData.note_type,
            author: noteData.author,
            is_internal: false,
            created_at: new Date().toISOString()
        };
        
        state.notes.unshift(newNote);
        
        // 5. Re-renderizar interfaz
        hideQuickCloseOptions();
        renderStatusControls(state.currentTicket);
        renderStatusActions(state.currentTicket);  // ✅ Actualizar sidebar de estado
        renderTicketHeader(state.currentTicket);
        renderTicketStats();  // ✅ Actualizar estadísticas
        renderNotes();
        
        console.log(`✅ Ticket ${statusType.toLowerCase()} exitosamente con nota: "${template}"`);
        
    } catch (error) {
        console.error('❌ Error al aplicar cierre rápido:', error);
        alert('Error al procesar el cambio de estado');
    }
}

async function updateTicketStatus(ticketId, newStatus) {
    const response = await authenticatedFetch(`${API_URL}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...state.currentTicket,
            status: newStatus
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}

// FUNCIÓN DEPRECADA - Reemplazada por executeDirectStatusChange
// async function executeStatusChange(newStatus, comment) {
//     if (!state.currentTicket) return;
//     
//     const currentStatus = state.currentTicket.status;
//     
//     try {
//         // 1. Actualizar estado del ticket en el servidor
//         await updateTicketStatus(state.currentTicket.id, newStatus);
//         
//         // 2. Actualizar estado local
//         state.currentTicket.status = newStatus;
//         
//         // 3. Agregar comentario con el cambio de estado
//         const markdownComment = convertHtmlToMarkdown(comment);
//         
//         const noteData = {
//             note: markdownComment,
//             note_type: 'Seguimiento',
//             author: 'Felipe Maturana'
//         };
//         
//         const noteResponse = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(noteData)
//         });
//         
//         if (!noteResponse.ok) {
//             throw new Error(`Error al agregar nota: ${noteResponse.status}`);
//         }
//         
//         // 4. Agregar la nueva nota al estado local
//         const noteResult = await noteResponse.json();
//         const newNote = {
//             id: noteResult.data.id,
//             note: markdownComment,
//             note_type: noteData.note_type,
//             author: noteData.author,
//             is_internal: false,
//             created_at: new Date().toISOString()
//         };
//         
//         state.notes.unshift(newNote);
//         
//         // 5. Agregar nota automática del sistema
//         await addStatusChangeNote(currentStatus, newStatus);
//         
//         // 6. Re-renderizar interfaz
//         renderStatusControls(state.currentTicket);
//         renderStatusActions(state.currentTicket);  // ✅ Actualizar sidebar de estado
//         renderTicketHeader(state.currentTicket);
//         renderTicketStats();  // ✅ Actualizar estadísticas
//         renderNotes();
//         
//         console.log(`✅ Estado cambiado de "${currentStatus}" a "${newStatus}" con comentario`);
//         
//     } catch (error) {
//         console.error('❌ Error al ejecutar cambio de estado:', error);
//         throw error;
//     }
// }

// FUNCIÓN DEPRECADA - Ya no se usa el sistema de estado pendiente
// function clearPendingStatusChange() {
//     // Limpiar estado pendiente
//     state.pendingStatusChange = null;
//     
//     // Restaurar botón de enviar
//     const sendBtn = document.getElementById('send-comment-btn');
//     if (sendBtn) {
//         sendBtn.classList.remove('status-change-pending');
//         sendBtn.classList.remove('status-en-progreso', 'status-en-espera', 'status-resuelto', 'status-cerrado');
//         
//         const sendText = sendBtn.querySelector('.send-text');
//         if (sendText) {
//             sendText.textContent = 'Enviar';
//         }
//     }
//     
//     console.log('🧹 Estado pendiente limpiado');
// }

async function addStatusChangeNote(oldStatus, newStatus) {
    const noteText = `Estado del ticket cambiado de "${oldStatus}" a "${newStatus}"`;
    
    try {
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                note: noteText,
                note_type: 'Seguimiento',
                author: 'Sistema',
                is_internal: true
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            const newNote = {
                id: result.data.id,
                note: noteText,
                note_type: 'Seguimiento',
                author: 'Sistema',
                is_internal: true,
                created_at: new Date().toISOString()
            };
            
            state.notes.unshift(newNote);
            renderNotes();
        }
    } catch (error) {
        console.error('❌ Error al agregar nota de cambio de estado:', error);
    }
}

// Exponer funciones al scope global
window.changeTicketStatus = changeTicketStatus;
window.showQuickCloseOptions = showQuickCloseOptions;
window.hideQuickCloseOptions = hideQuickCloseOptions;
window.applyQuickClose = applyQuickClose;

// Debug: Verificar que las funciones están disponibles
console.log('🔧 Funciones cargadas:', {
    editActivityGroup: typeof window.editActivityGroup,
    deleteActivityGroup: typeof window.deleteActivityGroup,
    toggleAttachments: typeof window.toggleAttachments,
    changeTicketStatus: typeof window.changeTicketStatus
});

// =============================================================================
// MODAL UNIFICADO DE REPUESTOS (Sistema Inteligente con Flujo A/B)
// =============================================================================

/**
 * Modal unificado para solicitar repuestos con flujo inteligente:
 * - Flujo A: Si el repuesto está disponible → Registra uso directo + crea gasto
 * - Flujo B: Si no está disponible → Crea solicitud de compra (requiere aprobación)
 */
async function showUnifiedSparePartModal() {
    console.log('📦 Abriendo modal unificado de repuestos...');
    
    try {
        // Cargar repuestos disponibles
        const response = await authenticatedFetch(`${API_URL}/inventory/spare-parts`);
        if (!response.ok) {
            throw new Error('Error al cargar repuestos');
        }
        
        const result = await response.json();
        const spareParts = result.data || [];
        
        // Crear modal directamente
        const modal = document.createElement('div');
        modal.className = 'base-modal';
        modal.innerHTML = `
            <div class="base-modal-content" style="max-width: 600px;">
                <div class="base-modal-header">
                    <h3 class="base-modal-title">
                        <i data-lucide="package-plus" class="inline w-5 h-5 mr-2"></i>
                        Solicitar Repuesto
                    </h3>
                    <button class="base-modal-close" onclick="closeModal(this)">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="base-modal-body">
                    <!-- Selector de repuesto -->
                    <div class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div class="flex items-start gap-2">
                            <i data-lucide="info" class="w-5 h-5 text-blue-600 mt-0.5"></i>
                            <p class="text-sm text-blue-800">
                                <strong>Flujo inteligente:</strong> Selecciona un repuesto de la lista si está disponible, 
                                o solicita uno nuevo si no lo encuentras.
                            </p>
                        </div>
                    </div>
                    
                    <form id="unified-spare-part-form">
                        <!-- Paso 1: Seleccionar o buscar repuesto -->
                        <div id="step-1-select" class="space-y-4">
                            <div class="base-form-group">
                                <label class="base-form-label">Repuesto</label>
                                <select id="spare-part-selector" name="spare_part_id" class="base-form-input">
                                    <option value="">Seleccionar repuesto disponible...</option>
                                    ${spareParts.filter(part => part.current_stock > 0).map(part => `
                                        <option value="${part.id}" 
                                                data-stock="${part.current_stock}" 
                                                data-cost="${part.unit_cost || 0}"
                                                data-name="${part.name}">
                                            ${part.name} (${part.sku}) - Stock: ${part.current_stock}
                                        </option>
                                    `).join('')}
                                    <option value="NOT_FOUND" style="background: #FEF3C7; font-weight: bold;">
                                        ⚠️ No encuentro el repuesto - Solicitar compra
                                    </option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Paso 2A: Si selecciona repuesto disponible → Registrar uso -->
                        <div id="step-2-use" class="space-y-4 hidden">
                            <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                <div class="flex items-start gap-2">
                                    <i data-lucide="check-circle" class="w-5 h-5 text-green-600 mt-0.5"></i>
                                    <div>
                                        <p class="text-sm text-green-800 font-medium">Repuesto disponible en inventario</p>
                                        <p class="text-xs text-green-700 mt-1">Se registrará el uso y se reducirá el stock automáticamente.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="base-form-group">
                                <label class="base-form-label">Cantidad a Utilizar <span class="required">*</span></label>
                                <input type="number" id="quantity-use" name="quantity_used" class="base-form-input" min="1" value="1">
                                <small class="text-gray-500 text-xs" id="stock-info"></small>
                            </div>
                            
                            <div class="base-form-group">
                                <label class="base-form-label">Notas de Uso</label>
                                <textarea name="notes" class="base-form-input" rows="2" placeholder="Descripción del uso del repuesto..."></textarea>
                            </div>
                            
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div class="flex items-start gap-3">
                                    <input type="checkbox" id="bill_to_client" name="bill_to_client" class="mt-1" checked>
                                    <div class="flex-1">
                                        <label for="bill_to_client" class="font-medium text-gray-900 cursor-pointer text-sm">
                                            <i data-lucide="dollar-sign" class="w-4 h-4 inline mr-1"></i>
                                            Facturar al cliente
                                        </label>
                                        <p class="text-xs text-gray-600 mt-1">Se creará un gasto automáticamente vinculado al ticket.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Paso 2B: Si no encuentra repuesto → Solicitar orden de compra -->
                        <div id="step-2-request" class="space-y-4 hidden">
                            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                <div class="flex items-start gap-2">
                                    <i data-lucide="alert-circle" class="w-5 h-5 text-yellow-600 mt-0.5"></i>
                                    <div>
                                        <p class="text-sm text-yellow-800 font-medium">Repuesto no disponible en inventario</p>
                                        <p class="text-xs text-yellow-700 mt-1">Se creará una solicitud de compra que debe ser aprobada por gerencia.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="base-form-group">
                                <label class="base-form-label">Nombre del Repuesto <span class="required">*</span></label>
                                <input type="text" id="new-spare-name" name="spare_part_name" class="base-form-input" 
                                       placeholder="Ej: Correa de transmisión para trotadora">
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div class="base-form-group">
                                    <label class="base-form-label">Cantidad Necesaria <span class="required">*</span></label>
                                    <input type="number" id="quantity-request" name="quantity_needed" class="base-form-input" min="1" value="1">
                                </div>
                                <div class="base-form-group">
                                    <label class="base-form-label">Prioridad <span class="required">*</span></label>
                                    <select name="priority" class="base-form-input">
                                        <option value="baja">Baja</option>
                                        <option value="media" selected>Media</option>
                                        <option value="alta">Alta</option>
                                        <option value="urgente">Urgente</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="base-form-group">
                                <label class="base-form-label">Especificaciones Técnicas</label>
                                <textarea name="description" class="base-form-input" rows="2" 
                                          placeholder="Marca, modelo, especificaciones..."></textarea>
                            </div>
                            
                            <div class="base-form-group">
                                <label class="base-form-label">Justificación (¿Por qué es necesario?)</label>
                                <textarea name="justification" class="base-form-input" rows="2" 
                                          placeholder="Explica por qué este repuesto es necesario para resolver el ticket..."></textarea>
                            </div>
                            
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div class="flex items-start gap-2">
                                    <i data-lucide="shield" class="w-5 h-5 text-blue-600 mt-0.5"></i>
                                    <div>
                                        <p class="text-xs text-blue-800">
                                            <strong>Confidencial:</strong> La información de costos y cotizaciones 
                                            se maneja internamente. Esta solicitud no aparecerá en el ticket público.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="base-modal-footer">
                    <button type="button" class="base-btn-cancel" onclick="closeModal(this)">Cancelar</button>
                    <button type="button" id="submit-unified-btn" class="base-btn-primary" disabled>
                        <i data-lucide="package-plus" class="w-4 h-4 inline mr-1"></i>
                        <span id="submit-btn-text">Selecciona una opción</span>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar lógica de cambio de flujo
        const selector = modal.querySelector('#spare-part-selector');
        const step2Use = modal.querySelector('#step-2-use');
        const step2Request = modal.querySelector('#step-2-request');
        const submitBtn = modal.querySelector('#submit-unified-btn');
        const submitBtnText = modal.querySelector('#submit-btn-text');
        const quantityUseInput = modal.querySelector('#quantity-use');
        const unitCostInput = modal.querySelector('#unit-cost');
        const stockInfo = modal.querySelector('#stock-info');
        
        // Estado del modal
        let modalMode = null; // 'USE' o 'REQUEST'
        
        selector.addEventListener('change', () => {
            const selectedValue = selector.value;
            
            if (selectedValue === '') {
                // No ha seleccionado nada
                step2Use.classList.add('hidden');
                step2Request.classList.add('hidden');
                submitBtn.disabled = true;
                submitBtnText.textContent = 'Selecciona una opción';
                modalMode = null;
                
            } else if (selectedValue === 'NOT_FOUND') {
                // No encuentra el repuesto → Solicitar compra
                step2Use.classList.add('hidden');
                step2Request.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.className = 'base-btn-primary bg-yellow-600 hover:bg-yellow-700';
                submitBtnText.textContent = 'Enviar Solicitud de Compra';
                modalMode = 'REQUEST';
                
                // Limpiar validaciones
                const quantityRequestInput = modal.querySelector('#quantity-request');
                const newSpareNameInput = modal.querySelector('#new-spare-name');
                if (quantityRequestInput) quantityRequestInput.required = true;
                if (newSpareNameInput) newSpareNameInput.required = true;
                
            } else {
                // Repuesto disponible → Registrar uso
                const selectedOption = selector.selectedOptions[0];
                const stock = parseInt(selectedOption.dataset.stock, 10);
                const cost = parseFloat(selectedOption.dataset.cost) || 0;
                const name = selectedOption.dataset.name;
                
                step2Use.classList.remove('hidden');
                step2Request.classList.add('hidden');
                submitBtn.disabled = false;
                submitBtn.className = 'base-btn-primary bg-green-600 hover:bg-green-700';
                submitBtnText.textContent = 'Registrar Uso';
                modalMode = 'USE';
                
                // Auto-completar datos
                if (unitCostInput) unitCostInput.value = cost.toFixed(2);
                if (stockInfo) stockInfo.textContent = `Stock disponible: ${stock} unidades`;
                if (quantityUseInput) {
                    quantityUseInput.max = stock;
                    quantityUseInput.required = true;
                }
            }
            
            lucide.createIcons();
        });
        
        // Validación de stock en tiempo real
        if (quantityUseInput) {
            quantityUseInput.addEventListener('input', () => {
                const selectedOption = selector.selectedOptions[0];
                if (selectedOption && selectedOption.value !== '' && selectedOption.value !== 'NOT_FOUND') {
                    const stock = parseInt(selectedOption.dataset.stock, 10);
                    const quantity = parseInt(quantityUseInput.value, 10);
                    
                    if (quantity > stock) {
                        quantityUseInput.setCustomValidity(`Stock insuficiente. Disponible: ${stock}`);
                        stockInfo.textContent = `⚠️ Stock insuficiente (disponible: ${stock})`;
                        stockInfo.className = 'text-red-500 text-xs font-medium';
                    } else {
                        quantityUseInput.setCustomValidity('');
                        stockInfo.textContent = `Stock disponible: ${stock} unidades`;
                        stockInfo.className = 'text-gray-500 text-xs';
                    }
                }
            });
        }
        
        // Configurar evento de submit
        submitBtn.addEventListener('click', async () => {
            if (modalMode === 'USE') {
                await submitUnifiedUseSpare(modal);
            } else if (modalMode === 'REQUEST') {
                await submitUnifiedRequestSpare(modal);
            }
        });
        
        // Mostrar modal
        setTimeout(() => {
            modal.style.display = 'flex';
            modal.classList.add('is-open');
            lucide.createIcons();
        }, 10);
        
    } catch (error) {
        console.error('❌ Error al abrir modal unificado:', error);
        showNotification('Error al cargar la lista de repuestos', 'error');
    }
}

/**
 * Procesar uso directo de repuesto (flujo A)
 */
async function submitUnifiedUseSpare(modal) {
    const form = modal.querySelector('#unified-spare-part-form');
    const formData = new FormData(form);
    
    const sparePartId = formData.get('spare_part_id');
    const quantityUsed = parseInt(formData.get('quantity_used', 10));
    const notes = formData.get('notes');
    const billToClient = formData.get('bill_to_client') === 'on';
    
    // Validaciones
    if (!sparePartId || sparePartId === 'NOT_FOUND') {
        showNotification('Debes seleccionar un repuesto válido', 'error');
        return;
    }
    
    if (!quantityUsed || quantityUsed < 1) {
        showNotification('La cantidad debe ser mayor a 0', 'error');
        return;
    }
    
    // Deshabilitar botón
    const submitBtn = modal.querySelector('#submit-unified-btn');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="animate-spin h-4 w-4 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Registrando...
    `;
    
    try {
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/spare-parts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                spare_part_id: parseInt(sparePartId, 10),
                quantity_used: quantityUsed,
                notes: notes || '',
                bill_to_client: billToClient
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al registrar uso de repuesto');
        }
        
        const result = await response.json();
        
        // Cerrar modal
        closeModal(modal);
        
        // Mostrar confirmación
        let message = '✅ Repuesto registrado exitosamente';
        if (result.expense_created) {
            message += ' y gasto creado para facturación';
        }
        showNotification(message, 'success');
        
        // Recargar sección de repuestos
        if (typeof loadSpareParts === 'function') {
            await loadSpareParts();
        }
        
    } catch (error) {
        console.error('❌ Error al registrar uso:', error);
        showNotification(error.message || 'Error al registrar el repuesto', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        lucide.createIcons();
    }
}

/**
 * Procesar solicitud de orden de compra (flujo B)
 */
async function submitUnifiedRequestSpare(modal) {
    const form = modal.querySelector('#unified-spare-part-form');
    const formData = new FormData(form);
    
    const sparePartName = formData.get('spare_part_name');
    const quantityNeeded = parseInt(formData.get('quantity_needed', 10));
    const priority = formData.get('priority');
    const description = formData.get('description');
    const justification = formData.get('justification');
    
    // Validaciones
    if (!sparePartName || sparePartName.trim() === '') {
        showNotification('El nombre del repuesto es requerido', 'error');
        return;
    }
    
    if (!quantityNeeded || quantityNeeded < 1) {
        showNotification('La cantidad debe ser mayor a 0', 'error');
        return;
    }
    
    // Deshabilitar botón
    const submitBtn = modal.querySelector('#submit-unified-btn');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="animate-spin h-4 w-4 inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Enviando solicitud...
    `;
    
    try {
        const requestData = {
            ticket_id: state.currentTicket.id,
            spare_part_name: sparePartName.trim(),
            quantity_needed: quantityNeeded,
            priority: priority,
            description: description || '',
            justification: justification || '',
            requested_by: 'Usuario Actual', // Se puede mejorar obteniendo del contexto
            status: 'pendiente'
        };
        
        const response = await authenticatedFetch(`${API_URL}/inventory/spare-part-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al enviar solicitud');
        }
        
        const result = await response.json();
        
        // Cerrar modal
        closeModal(modal);
        
        // Mostrar confirmación
        showNotification('✅ Solicitud de compra enviada al departamento de inventario. Será evaluada para aprobación.', 'success');
        
        console.log('📦 Solicitud de repuesto enviada (INTERNA - no visible en ticket):', {
            id: result.id,
            spare_part: sparePartName,
            quantity: quantityNeeded,
            priority: priority,
            ticket_id: state.currentTicket.id,
            status: 'pendiente_aprobacion'
        });
        
    } catch (error) {
        console.error('❌ Error al enviar solicitud:', error);
        showNotification(error.message || 'Error al enviar la solicitud de compra', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        lucide.createIcons();
    }
}

// Exponer función globalmente
window.showUnifiedSparePartModal = showUnifiedSparePartModal;

// =============================================================================
// GESTIÓN DE REPUESTOS MEJORADA (Funciones Legacy - Deprecated)
// =============================================================================

// Mostrar modal para agregar repuesto
async function showAddSparePartModal() {
    console.log('🔧 Abriendo modal de repuestos...');
    
    try {
        // Cargar repuestos disponibles
        const response = await authenticatedFetch(`${API_URL}/inventory/spare-parts`);
        if (!response.ok) {
            throw new Error('Error al cargar repuestos');
        }
        
        const result = await response.json();
        const spareParts = result.data || [];
        
        // Crear modal directamente (patrón consistente con otros modales)
        const modal = document.createElement('div');
        modal.className = 'base-modal';
        modal.innerHTML = `
            <div class="base-modal-content">
                <div class="base-modal-header">
                    <h3 class="base-modal-title">
                        <i data-lucide="check-circle" class="inline w-5 h-5 mr-2"></i>
                        Registrar Uso de Repuesto
                    </h3>
                    <button class="base-modal-close" onclick="closeModal(this)">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="base-modal-body">
                    <form id="spare-part-form">
                        <div class="base-form-group">
                            <label class="base-form-label">Repuesto <span class="required">*</span></label>
                            <select name="spare_part_id" class="base-form-input" required>
                                <option value="">Seleccionar repuesto</option>
                                ${spareParts.map(part => `
                                    <option value="${part.id}" data-stock="${part.current_stock}">
                                        ${part.name} (${part.sku}) - Stock: ${part.current_stock}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="base-form-group">
                                <label class="base-form-label">Cantidad Utilizada <span class="required">*</span></label>
                                <input type="number" name="quantity_used" class="base-form-input" required min="1" value="1">
                            </div>
                        </div>
                        <div class="base-form-group">
                            <label class="base-form-label">Notas</label>
                            <textarea name="notes" class="base-form-input" rows="2" placeholder="Descripción del uso del repuesto..."></textarea>
                        </div>
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <div class="flex items-start gap-3">
                                <input type="checkbox" id="bill_to_client" name="bill_to_client" class="mt-1" checked>
                                <div class="flex-1">
                                    <label for="bill_to_client" class="font-medium text-gray-900 cursor-pointer">
                                        <i data-lucide="dollar-sign" class="w-4 h-4 inline mr-1"></i>
                                        Facturar al cliente
                                    </label>
                                    <p class="text-sm text-gray-600 mt-1">Se creará un gasto automáticamente y se vinculará al ticket para facturación.</p>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="base-modal-footer">
                    <button type="button" class="base-btn-cancel" onclick="closeModal(this)">Cancelar</button>
                    <button type="button" class="base-btn-primary" onclick="submitSparePartForm(this)">
                        <i data-lucide="check-circle" class="w-4 h-4 inline mr-1"></i>
                        Registrar Uso
                    </button>
                </div>
            </div>
        `;
        
        // Configurar validación de stock en tiempo real
        const select = modal.querySelector('select[name="spare_part_id"]');
        const quantityInput = modal.querySelector('input[name="quantity_used"]');
        
        quantityInput.addEventListener('input', () => {
            const selectedOption = select.selectedOptions[0];
            if (selectedOption) {
                const stock = parseInt(selectedOption.dataset.stock, 10);
                const quantity = parseInt(quantityInput.value, 10);
                
                if (quantity > stock) {
                    quantityInput.setCustomValidity(`Stock insuficiente. Disponible: ${stock}`);
                } else {
                    quantityInput.setCustomValidity('');
                }
            }
        });
        
        document.body.appendChild(modal);
        
        // Mostrar modal
        setTimeout(() => {
            modal.style.display = 'flex';
            modal.classList.add('is-open');
            lucide.createIcons();
        }, 10);
        
    } catch (error) {
        console.error('❌ Error al abrir modal de repuestos:', error);
        showNotification('Error al cargar la lista de repuestos', 'error');
    }
}

// Mostrar modal para solicitar repuesto
async function showRequestSparePartModal() {
    console.log('🛒 Abriendo modal de solicitud de repuestos...');
    
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.innerHTML = `
        <div class="base-modal-content">
            <div class="base-modal-header">
                <h3 class="base-modal-title">
                    <i data-lucide="shopping-cart" class="inline w-5 h-5 mr-2"></i>
                    Solicitar Compra de Repuesto
                </h3>
                <button type="button" class="base-modal-close" onclick="closeModal(this)">
                    <i data-lucide="x" class="h-5 w-5"></i>
                </button>
            </div>
            <div class="base-modal-body">
                <div class="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div class="flex items-start gap-2">
                        <i data-lucide="info" class="w-5 h-5 text-yellow-600 mt-0.5"></i>
                        <p class="text-sm text-yellow-800">
                            Usa esta opción cuando necesites repuestos que <strong>no están disponibles</strong> en el inventario actual. 
                            La solicitud será enviada al departamento de inventario para su evaluación.
                        </p>
                    </div>
                </div>
                
                <div class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div class="flex items-start gap-2">
                        <i data-lucide="shield" class="w-5 h-5 text-blue-600 mt-0.5"></i>
                        <p class="text-sm text-blue-800">
                            <strong>Confidencial:</strong> La información de costos y cotizaciones se maneja internamente. 
                            Esta solicitud no aparecerá en el ticket público.
                        </p>
                    </div>
                </div>
                
                <form id="request-spare-part-form" class="space-y-4">
                    <div class="base-form-group">
                        <label class="base-form-label">Nombre del Repuesto <span class="required">*</span></label>
                        <input type="text" name="spare_part_name" class="base-form-input" required 
                               placeholder="Ej: Correa de transmisión para trotadora">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="base-form-group">
                            <label class="base-form-label">Cantidad Necesaria <span class="required">*</span></label>
                            <input type="number" name="quantity_needed" class="base-form-input" min="1" required>
                        </div>
                        <div class="base-form-group">
                            <label class="base-form-label">Prioridad <span class="required">*</span></label>
                            <select name="priority" class="base-form-input" required>
                                <option value="baja">Baja</option>
                                <option value="media" selected>Media</option>
                                <option value="alta">Alta</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="base-form-group">
                        <label class="base-form-label">Descripción/Especificaciones</label>
                        <textarea name="description" rows="3" class="base-form-input" 
                                  placeholder="Describe las especificaciones técnicas, modelo, marca, etc."></textarea>
                    </div>
                    
                    <div class="base-form-group">
                        <label class="base-form-label">Justificación (¿Por qué es necesario?)</label>
                        <textarea name="justification" rows="2" class="base-form-input" 
                                  placeholder="¿Por qué es necesario este repuesto para resolver el ticket?"></textarea>
                    </div>
                </form>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="base-btn-cancel" onclick="closeModal(this)">Cancelar</button>
                <button type="submit" form="request-spare-part-form" class="base-btn-primary">
                    <i data-lucide="send" class="w-4 h-4 mr-2"></i>
                    Enviar Solicitud
                </button>
            </div>
        </div>
    `;
    
    // Configurar evento de envío
    const form = modal.querySelector('#request-spare-part-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitSparePartRequest(form, modal);
    });
    
    document.body.appendChild(modal);
    
    // Mostrar modal
    setTimeout(() => {
        modal.style.display = 'flex';
        modal.classList.add('is-open');
        lucide.createIcons();
    }, 10);
}

// Enviar solicitud de repuesto
async function submitSparePartRequest(form, modal) {
    const formData = new FormData(form);
    const requestData = {
        ticket_id: state.currentTicket.id,
        spare_part_name: formData.get('spare_part_name'),
        quantity_needed: parseInt(formData.get('quantity_needed', 10)),
        priority: formData.get('priority'),
        description: formData.get('description'),
        justification: formData.get('justification'),
        requested_by: 'Usuario Actual', // Se puede obtener del contexto de usuario
        status: 'pendiente'
    };
    
    try {
        const response = await authenticatedFetch(`${API_URL}/inventory/spare-part-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error('Error al enviar solicitud');
        }
        
        const result = await response.json();
        
        // Cerrar modal
        closeModal(modal);
        
        // Mostrar confirmación (SIN información interna en el ticket)
        showNotification('✅ Solicitud de compra enviada al departamento de inventario', 'success');
        
        console.log('📦 Solicitud de repuesto enviada (INTERNA - no visible en ticket):', {
            id: result.id,
            spare_part: requestData.spare_part_name,
            quantity: requestData.quantity_needed,
            priority: requestData.priority,
            ticket_id: state.currentTicket.id
        });
        
        // NO agregar notas al ticket - la solicitud es completamente interna
        // Los técnicos no verán información de costos ni solicitudes en el ticket
        
    } catch (error) {
        console.error('❌ Error al enviar solicitud:', error);
        showNotification('Error al enviar la solicitud de repuesto', 'error');
    }
}

// NOTA: Esta función ha sido removida intencionalmente
// Las solicitudes de repuestos son completamente internas (inventario/finanzas)
// y NO deben aparecer como notas visibles en el ticket público
async function addSparePartRequestNote_REMOVED_FOR_PRIVACY(requestData) {
    // Esta función ya NO se usa - las solicitudes son internas
    // Ver módulos de inventario y finanzas para gestión de cotizaciones
    const noteText = `📦 **Solicitud de Repuesto INTERNA**\n\n` +
                    `**Repuesto:** ${requestData.spare_part_name}\n` +
                    `**Cantidad:** ${requestData.quantity_needed} unidades\n` +
                    `**Prioridad:** ${requestData.priority}\n` +
                    `**Estado:** Pendiente de aprobación\n\n` +
                    `${requestData.justification ? `**Justificación:** ${requestData.justification}` : ''}`;
    
    try {
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                note: noteText,
                note_type: 'Sistema',
                author: 'Sistema de Inventario'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            // Agregar nota al estado local
            state.notes.unshift({
                id: result.data.id,
                note: noteText,
                note_type: 'Sistema',
                author: 'Sistema de Inventario',
                created_at: new Date().toISOString()
            });
            
            // Re-renderizar notas
            renderNotes();
            updateTabCounters();
        }
    } catch (error) {
        console.error('❌ Error al agregar nota de solicitud:', error);
    }
}

// Solicitar orden de compra para repuesto específico
async function requestSparePartOrder(sparePartId) {
    try {
        const response = await authenticatedFetch(`${API_URL}/inventory/spare-parts/${sparePartId}/request-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_id: state.currentTicket.id,
                requested_by: 'Usuario Actual'
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al solicitar orden');
        }
        
        showNotification('Solicitud de orden de compra enviada', 'success');
        
        // Actualizar alertas
        renderStockAlerts();
        
    } catch (error) {
        console.error('❌ Error al solicitar orden:', error);
        showNotification('Error al solicitar orden de compra', 'error');
    }
}

// Editar uso de repuesto
async function editSparePartUsage(usageId) {
    console.log('✏️ Editando uso de repuesto:', usageId);
    // Por implementar: modal de edición
    showNotification('Función de edición en desarrollo', 'info');
}

// Enviar formulario de repuesto
async function submitSparePartForm(button) {
    console.log('📝 Enviando formulario de repuesto...');
    
    const modal = button.closest('.base-modal');
    const form = modal.querySelector('#spare-part-form');
    const formData = new FormData(form);
    
    const data = {
        spare_part_id: parseInt(formData.get('spare_part_id', 10)),
        quantity_used: parseInt(formData.get('quantity_used', 10)),
        notes: formData.get('notes') || null,
        bill_to_client: formData.get('bill_to_client') === 'on'
    };
    
    try {
        button.disabled = true;
        button.innerHTML = '<i data-lucide="loader" class="w-4 h-4 inline mr-1 animate-spin"></i> Registrando...';
        
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/spare-parts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al agregar repuesto');
        }
        
        const result = await response.json();
        
        // Cerrar modal
        modal.remove();
        
        // Agregar el repuesto al estado local
        if (result.data) {
            state.spareParts.unshift(result.data);
        }
        
        // Re-renderizar solo los repuestos
        renderSpareParts();
        lucide.createIcons();
        
        const billMsg = data.bill_to_client ? ' y gasto registrado para facturación' : '';
        showNotification(`Uso de repuesto registrado exitosamente${billMsg}`, 'success');
        console.log('✅ Repuesto registrado:', result.data);
        
    } catch (error) {
        console.error('❌ Error agregando repuesto:', error);
        showNotification(error.message || 'Error al registrar el uso del repuesto', 'error');
        button.disabled = false;
        button.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 inline mr-1"></i> Registrar Uso';
    }
}

// Cerrar modal genérico
function closeModal(button) {
    const modal = button.closest('.base-modal');
    if (modal) {
        modal.classList.remove('is-open');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Función de notificación
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}" class="w-5 h-5"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Estilos básicos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Crear íconos
    setTimeout(() => lucide.createIcons(), 10);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Exponer funciones al scope global
window.showAddSparePartModal = showAddSparePartModal;
window.showRequestSparePartModal = showRequestSparePartModal;
window.requestSparePartOrder = requestSparePartOrder;
window.editSparePartUsage = editSparePartUsage;
window.submitSparePartForm = submitSparePartForm;
window.closeModal = closeModal;

// ===========================================
// FUNCIONES ESPECÍFICAS PARA GIMNACIÓN
// ===========================================

/**
 * Renderizar lista de equipos para tickets de gimnación
 * Muestra equipos organizados por categoría de forma compacta
 */
async function renderGimnacionEquipment() {
    console.log('🏋️ Renderizando equipos de gimnación en formato compacto...');
    
    // Buscar o crear contenedor después de la descripción
    const descriptionSection = document.getElementById('ticket-description');
    if (!descriptionSection) {
        console.warn('⚠️ No se encontró sección de descripción');
        return;
    }
    
    // Verificar si ya existe el contenedor
    let equipmentSection = document.getElementById('gimnacion-equipment-section');
    
    if (!equipmentSection) {
        // Crear nuevo contenedor
        equipmentSection = document.createElement('div');
        equipmentSection.id = 'gimnacion-equipment-section';
        equipmentSection.className = 'ticket-section';
        
        // Insertar después de la descripción
        descriptionSection.parentNode.insertBefore(equipmentSection, descriptionSection.nextSibling);
    }
    
    // Mostrar loading
    equipmentSection.innerHTML = `
        <div class="flex items-center justify-center py-4">
            <i data-lucide="loader" class="w-5 h-5 animate-spin text-blue-500"></i>
            <span class="ml-2 text-gray-600">Cargando equipos...</span>
        </div>
    `;
    
    if (window.lucide) lucide.createIcons();
    
    try {
        // Obtener equipos del ticket de gimnación desde el backend
        const response = await authenticatedFetch(`${API_URL}/tickets/${state.currentTicket.id}/equipment-scope`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        const equipment = result.data || [];
        
        console.log('📦 Equipos obtenidos:', equipment.length);
        
        if (equipment.length === 0) {
            equipmentSection.innerHTML = `
                <div class="section-header">
                    <h3>
                        <i data-lucide="cpu" class="w-5 h-5"></i>
                        Equipos del Servicio
                    </h3>
                </div>
                <div class="section-content">
                    <p class="text-gray-500 text-sm">No hay equipos asociados a este ticket</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }
        
        // Agrupar por modelo (model_name + brand) y contar cantidades
        const modelCounts = equipment.reduce((acc, equip) => {
            const modelName = equip.model_name || 'Sin modelo';
            const brand = equip.brand || '';
            const category = equip.category || 'Sin categoría';
            const isIncluded = equip.is_included;
            
            // Clave única: modelo + marca + categoría + estado
            const key = `${modelName}|${brand}|${category}|${isIncluded}`;
            
            if (!acc[key]) {
                acc[key] = {
                    model: modelName,
                    brand: brand,
                    category: category,
                    count: 0,
                    isIncluded: isIncluded,
                    items: []
                };
            }
            
            acc[key].count++;
            acc[key].items.push(equip);
            return acc;
        }, {});
        
        // Convertir a array y ordenar por categoría, luego por cantidad (mayor a menor)
        const modelGroups = Object.values(modelCounts).sort((a, b) => {
            // Primero por categoría
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            // Dentro de la misma categoría, por cantidad (mayor primero)
            if (a.count !== b.count) {
                return b.count - a.count;
            }
            // Finalmente por nombre de modelo
            return a.model.localeCompare(b.model);
        });
        
        // Agrupar modelos por categoría para visualización
        const categorizedGroups = modelGroups.reduce((acc, group) => {
            if (!acc[group.category]) {
                acc[group.category] = [];
            }
            acc[group.category].push(group);
            return acc;
        }, {});
        
        // Contar totales incluidos/excluidos
        const totalIncluded = equipment.filter(e => e.is_included).length;
        const totalExcluded = equipment.filter(e => !e.is_included).length;
        
        // Renderizar en formato compacto ejecutivo con agrupación por categorías
        let equipmentHTML = `
            <div class="section-header cursor-pointer bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 transition-all" onclick="toggleGimnacionEquipment()">
                <div class="flex items-center justify-between w-full">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i data-lucide="package" class="w-4 h-4 text-blue-600"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900 text-base">Equipos del Servicio</h3>
                            <p class="text-xs text-gray-500">
                                ${totalIncluded} en alcance${totalExcluded > 0 ? ` • ${totalExcluded} excluidos` : ''}
                            </p>
                        </div>
                    </div>
                    <i data-lucide="chevron-down" id="gimnacion-chevron" class="w-5 h-5 text-gray-400 transition-transform duration-200"></i>
                </div>
            </div>
            <div id="gimnacion-equipment-content" class="section-content p-3">
        `;
        
        // Renderizar por categorías de forma compacta
        Object.keys(categorizedGroups).sort().forEach(category => {
            const categoryItems = categorizedGroups[category];
            const categoryColor = getCategoryColorClass(category);
            const categoryTotal = categoryItems.reduce((sum, item) => sum + item.count, 0);
            const categoryId = `category-${category.replace(/\s+/g, '-').toLowerCase()}`;
            
            equipmentHTML += `
                <div class="mb-3 bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div class="px-3 py-2 ${categoryColor} cursor-pointer flex items-center justify-between" onclick="toggleCategory('${categoryId}')">
                        <div class="flex items-center gap-2">
                            <i data-lucide="grid-3x3" class="w-3.5 h-3.5"></i>
                            <h4 class="font-semibold text-sm">${category}</h4>
                            <span class="text-xs px-2 py-0.5 bg-white bg-opacity-60 rounded-full font-medium">
                                ${categoryTotal}
                            </span>
                        </div>
                        <i data-lucide="chevron-down" id="${categoryId}-chevron" class="w-4 h-4 transition-transform duration-200"></i>
                    </div>
                    <div id="${categoryId}" class="p-2">
                        <div class="flex flex-wrap gap-1.5">
            `;
            
            // Renderizar badges compactos de cada modelo en la categoría
            categoryItems.forEach(group => {
                const statusIcon = group.isIncluded ? '✓' : '✗';
                const statusColorBg = group.isIncluded 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' 
                    : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100';
                
                // Marca más discreta
                const brandText = group.brand ? `<span class="text-[10px] opacity-50">${group.brand}</span>` : '';
                
                equipmentHTML += `
                    <div 
                        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${statusColorBg} transition-all"
                        title="IDs: ${group.items.map(i => i.custom_id || 'Sin ID').join(', ')}"
                    >
                        <span class="flex items-center justify-center min-w-[18px] h-[18px] bg-white bg-opacity-60 rounded text-[10px] font-bold">
                            ${group.count}
                        </span>
                        <span class="leading-tight">
                            ${group.model} ${brandText}
                        </span>
                        <span class="text-xs">${statusIcon}</span>
                    </div>
                `;
            });
            
            equipmentHTML += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Leyenda compacta
        equipmentHTML += `
                <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div class="flex flex-wrap items-center gap-3 text-xs">
                        <div class="flex items-center gap-1.5">
                            <div class="w-5 h-5 bg-emerald-50 border border-emerald-300 rounded flex items-center justify-center">
                                <span class="text-emerald-700 text-xs font-bold">✓</span>
                            </div>
                            <span class="text-gray-700">Incluido</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <div class="w-5 h-5 bg-rose-50 border border-rose-300 rounded flex items-center justify-center">
                                <span class="text-rose-700 text-xs font-bold">✗</span>
                            </div>
                            <span class="text-gray-700">Excluido</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        equipmentSection.innerHTML = equipmentHTML;
        
        // Crear iconos de Lucide
        if (window.lucide) {
            lucide.createIcons();
        }
        
        console.log('✅ Equipos de gimnación renderizados en formato compacto');
        
    } catch (error) {
        console.error('❌ Error cargando equipos de gimnación:', error);
        equipmentSection.innerHTML = `
            <div class="section-header">
                <h3>
                    <i data-lucide="cpu" class="w-5 h-5"></i>
                    Equipos del Servicio
                </h3>
            </div>
            <div class="section-content">
                <p class="text-red-500 text-sm">Error al cargar equipos: ${error.message}</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

/**
 * Toggle para colapsar/expandir sección de equipos
 */
function toggleGimnacionEquipment() {
    const content = document.getElementById('gimnacion-equipment-content');
    const chevron = document.getElementById('gimnacion-chevron');
    
    if (content && chevron) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
}

/**
 * Toggle para colapsar/expandir categorías individuales
 */
function toggleCategory(categoryId) {
    const content = document.getElementById(categoryId);
    const chevron = document.getElementById(`${categoryId}-chevron`);
    
    if (content && chevron) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
}

// Hacer disponibles globalmente
window.toggleGimnacionEquipment = toggleGimnacionEquipment;
window.toggleCategory = toggleCategory;

/**
 * Obtener clase de color para categoría
 */
function getCategoryColorClass(category) {
    const colorMap = {
        'Cardio': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200',
        'Fuerza': 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border-orange-200',
        'Funcional': 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-800 border-teal-200',
        'Accesorios': 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-200',
        'Sin categoría': 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[category] || 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200';
}
