// === MODALES Y FUNCIONALIDADES ADICIONALES PARA DETALLE DE TICKETS ===

// === FUNCIONES PARA CREAR MODALES DINÁMICOS ===

function createSparePartModal(spareParts) {
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.innerHTML = `
        <div class="base-modal-content">
            <div class="base-modal-header">
                <h3 class="base-modal-title">Agregar Repuesto al Ticket</h3>
                <button class="base-modal-close" onclick="this.closest('.base-modal').remove()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="base-modal-body">
                <form id="spare-part-form">
                    <div class="form-group">
                        <label class="form-label">Repuesto</label>
                        <select name="spare_part_id" class="form-input" required>
                            <option value="">Seleccionar repuesto</option>
                            ${spareParts.map(part => `
                                <option value="${part.id}" data-stock="${part.current_stock}">
                                    ${part.name} (${part.sku}) - Stock: ${part.current_stock}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cantidad Utilizada</label>
                        <input type="number" name="quantity_used" class="form-input" required min="1" placeholder="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Costo Unitario (opcional)</label>
                        <input type="number" name="unit_cost" class="form-input" step="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notas</label>
                        <textarea name="notes" class="form-textarea" rows="3" placeholder="Descripción del uso del repuesto..."></textarea>
                    </div>
                </form>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="btn-secondary" onclick="this.closest('.base-modal').remove()">Cancelar</button>
                <button type="button" class="btn-primary" onclick="submitSparePartForm(this)">Agregar Repuesto</button>
            </div>
        </div>
    `;
    
    // Validación de stock en tiempo real
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
    
    return modal;
}

function createPhotoModal() {
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.innerHTML = `
        <div class="base-modal-content">
            <div class="base-modal-header">
                <h3 class="base-modal-title">Subir Foto al Ticket</h3>
                <button class="base-modal-close" onclick="this.closest('.base-modal').remove()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="base-modal-body">
                <form id="photo-form">
                    <div class="form-group">
                        <label class="form-label">Seleccionar Foto</label>
                        <input type="file" name="photo_file" class="form-input" accept="image/*" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Foto</label>
                        <select name="photo_type" class="form-input" required>
                            <option value="">Seleccionar tipo</option>
                            <option value="Problema">Problema</option>
                            <option value="Proceso">Proceso</option>
                            <option value="Solución">Solución</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descripción</label>
                        <textarea name="description" class="form-textarea" rows="3" placeholder="Descripción de la foto..."></textarea>
                    </div>
                    <div id="photo-preview-container" class="hidden">
                        <label class="form-label">Vista Previa</label>
                        <img id="photo-preview-img" class="w-full h-48 object-cover border rounded" alt="Vista previa">
                    </div>
                </form>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="btn-secondary" onclick="this.closest('.base-modal').remove()">Cancelar</button>
                <button type="button" class="btn-primary" onclick="submitPhotoForm(this)">Subir Foto</button>
            </div>
        </div>
    `;
    
    // Vista previa de imagen
    const fileInput = modal.querySelector('input[name="photo_file"]');
    const previewContainer = modal.querySelector('#photo-preview-container');
    const previewImg = modal.querySelector('#photo-preview-img');
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
    
    return modal;
}

function createPhotoViewerModal(photo) {
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.innerHTML = `
        <div class="base-modal-content modal-large">
            <div class="base-modal-header">
                <h3 class="base-modal-title">${photo.file_name}</h3>
                <div class="flex gap-2">
                    <button class="btn-secondary" onclick="deleteTicketPhoto(${photo.id}, this)">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                        Eliminar
                    </button>
                    <button class="base-modal-close" onclick="this.closest('.base-modal').remove()">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
            <div class="base-modal-body">
                <div class="text-center">
                    <img src="data:${photo.mime_type};base64,${photo.photo_data}" 
                         alt="${photo.file_name}" 
                         class="max-w-full max-h-96 mx-auto rounded-lg shadow-lg">
                    
                    <div class="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span class="font-medium text-gray-700">Tipo:</span>
                                <span class="ml-2">${photo.photo_type}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700">Fecha:</span>
                                <span class="ml-2">${formatDateTime(photo.created_at)}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700">Tamaño:</span>
                                <span class="ml-2">${formatFileSize(photo.file_size)}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700">Formato:</span>
                                <span class="ml-2">${photo.mime_type}</span>
                            </div>
                        </div>
                        ${photo.description ? `
                            <div class="mt-3">
                                <span class="font-medium text-gray-700">Descripción:</span>
                                <p class="mt-1 text-gray-600">${photo.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

function createStatusChangeModal(currentStatus) {
    const statuses = ['Abierto', 'En Progreso', 'En Espera', 'Resuelto', 'Cerrado'];
    
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.id = 'status-change-modal';
    modal.innerHTML = `
        <div class="base-modal-content modal-small">
            <div class="base-modal-header">
                <h3 class="base-modal-title">
                    <i data-lucide="refresh-cw" class="w-5 h-5 text-blue-600 mr-2"></i>
                    Cambiar Estado del Ticket
                </h3>
                <button class="base-modal-close" onclick="closeStatusModal()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="base-modal-body">
                <form id="status-form">
                    <div class="form-group">
                        <label class="form-label">
                            <i data-lucide="info" class="w-4 h-4 text-gray-500"></i>
                            Estado Actual
                        </label>
                        <input type="text" value="${currentStatus}" class="form-input form-input-modern" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label required">
                            <i data-lucide="arrow-right" class="w-4 h-4 text-blue-500"></i>
                            Nuevo Estado
                        </label>
                        <select name="new_status" class="form-input form-input-modern" required>
                            <option value="">Seleccionar nuevo estado</option>
                            ${statuses.filter(s => s !== currentStatus).map(status => `
                                <option value="${status}">${status}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">
                            <i data-lucide="message-square" class="w-4 h-4 text-green-500"></i>
                            Comentario 
                            <span class="text-sm text-gray-500 font-normal ml-1">(opcional)</span>
                        </label>
                        <textarea name="comment" class="form-textarea form-textarea-modern" rows="3" placeholder="Razón del cambio de estado, observaciones..."></textarea>
                        <p class="form-help-text">Este comentario se agregará como nota al ticket</p>
                    </div>
                </form>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="base-btn base-btn-secondary" onclick="closeStatusModal()">
                    <i data-lucide="x" class="w-4 h-4"></i>
                    Cancelar
                </button>
                <button type="button" class="base-btn base-btn-primary" onclick="submitStatusChange(this)">
                    <i data-lucide="check" class="w-4 h-4"></i>
                    Cambiar Estado
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

function createAdvancedNoteModal() {
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.innerHTML = `
        <div class="base-modal-content modal-medium">
            <div class="base-modal-header">
                <h3 class="base-modal-title">
                    <i data-lucide="message-circle-plus" class="w-5 h-5 text-blue-600 mr-2"></i>
                    Agregar Nota al Ticket
                </h3>
                <button class="base-modal-close" onclick="this.closest('.base-modal').remove()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="base-modal-body">
                <form id="note-form">
                    <!-- Tipo de Nota -->
                    <div class="form-group">
                        <label class="form-label">
                            <i data-lucide="tag" class="w-4 h-4 text-indigo-500"></i>
                            Tipo de Nota
                        </label>
                        <select name="note_type" class="form-input form-input-modern" required>
                            <option value="">Seleccionar tipo</option>
                            <option value="Comentario">💬 Comentario General</option>
                            <option value="Diagnóstico">🔍 Diagnóstico</option>
                            <option value="Solución">✅ Solución Aplicada</option>
                            <option value="Seguimiento">📋 Seguimiento</option>
                            <option value="Problema">⚠️ Problema Encontrado</option>
                        </select>
                    </div>

                    <!-- Texto de la Nota -->
                    <div class="form-group">
                        <label class="form-label">
                            <i data-lucide="message-square" class="w-4 h-4 text-green-500"></i>
                            Descripción
                        </label>
                        <textarea name="note" 
                                  class="form-textarea form-textarea-modern" 
                                  rows="5" 
                                  required 
                                  placeholder="Describe la situación, problema encontrado, solución aplicada, etc..."
                                  maxlength="1000"></textarea>
                        <div class="form-help-text">
                            <span id="note-char-count">0</span>/1000 caracteres
                        </div>
                    </div>

                    <!-- Adjuntar Fotos -->
                    <div class="form-group">
                        <label class="form-label">
                            <i data-lucide="camera" class="w-4 h-4 text-purple-500"></i>
                            Adjuntar Fotos
                            <span class="text-sm text-gray-500 font-normal ml-1">(opcional)</span>
                        </label>
                        <div class="photo-upload-area">
                            <input type="file" 
                                   id="note-photos" 
                                   name="photos" 
                                   accept="image/*" 
                                   multiple 
                                   class="form-file-input">
                            <div class="photo-upload-drop-zone" onclick="document.getElementById('note-photos').click()">
                                <i data-lucide="upload-cloud" class="w-8 h-8 text-gray-400 mb-2"></i>
                                <p class="text-gray-600 font-medium">Haz clic para seleccionar fotos</p>
                                <p class="text-sm text-gray-400">o arrastra archivos aquí</p>
                                <p class="text-xs text-gray-400 mt-2">Máximo 5 fotos, 5MB cada una</p>
                            </div>
                            <div id="note-photo-preview" class="photo-preview-grid"></div>
                        </div>
                    </div>

                    <!-- Nota Interna -->
                    <div class="form-group">
                        <label class="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <input type="checkbox" name="is_internal" class="form-checkbox">
                            <div class="flex items-center gap-2">
                                <i data-lucide="eye-off" class="w-4 h-4 text-orange-500"></i>
                                <span class="form-label mb-0">Nota interna</span>
                            </div>
                            <span class="text-sm text-gray-500">(no visible para cliente)</span>
                        </label>
                    </div>
                </form>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="btn-secondary" onclick="this.closest('.base-modal').remove()">
                    <i data-lucide="x" class="w-4 h-4"></i>
                    Cancelar
                </button>
                <button type="button" class="btn-primary" onclick="submitAdvancedNote(this)">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    Agregar Nota
                </button>
            </div>
        </div>
    `;
    
    // Agregar eventos después de crear el modal
    setTimeout(() => {
        setupNoteModalEvents(modal);
    }, 100);
    
    return modal;
}

function createEditTicketModal(ticket) {
    const modal = document.createElement('div');
    modal.className = 'base-modal';
    modal.innerHTML = `
        <div class="base-modal-content modal-large">
            <div class="base-modal-header">
                <h3 class="base-modal-title">Editar Ticket #${ticket.id}</h3>
                <button class="base-modal-close" onclick="this.closest('.base-modal').remove()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="base-modal-body">
                <form id="edit-ticket-form">
                    <div class="base-form-grid">
                        <div class="base-form-group">
                            <label class="base-form-label">Título del Ticket</label>
                            <input type="text" name="title" class="base-form-input" value="${ticket.title}" required>
                        </div>
                        <div class="base-form-group">
                            <label class="base-form-label">Prioridad</label>
                            <select name="priority" class="base-form-input" required>
                                <option value="Baja" ${ticket.priority === 'Baja' ? 'selected' : ''}>Baja</option>
                                <option value="Media" ${ticket.priority === 'Media' ? 'selected' : ''}>Media</option>
                                <option value="Alta" ${ticket.priority === 'Alta' ? 'selected' : ''}>Alta</option>
                                <option value="Urgente" ${ticket.priority === 'Urgente' ? 'selected' : ''}>Urgente</option>
                            </select>
                        </div>
                        <div class="base-form-group">
                            <label class="base-form-label">Estado</label>
                            <select name="status" class="base-form-input" required>
                                <option value="Abierto" ${ticket.status === 'Abierto' ? 'selected' : ''}>Abierto</option>
                                <option value="En Progreso" ${ticket.status === 'En Progreso' ? 'selected' : ''}>En Progreso</option>
                                <option value="En Espera" ${ticket.status === 'En Espera' ? 'selected' : ''}>En Espera</option>
                                <option value="Resuelto" ${ticket.status === 'Resuelto' ? 'selected' : ''}>Resuelto</option>
                                <option value="Cerrado" ${ticket.status === 'Cerrado' ? 'selected' : ''}>Cerrado</option>
                            </select>
                        </div>
                        <div class="base-form-group">
                            <label class="base-form-label">Fecha de Vencimiento</label>
                            <input type="date" name="due_date" class="base-form-input" 
                                   value="${ticket.due_date ? ticket.due_date.split('T')[0] : ''}">
                        </div>
                    </div>
                    <div class="base-form-group">
                        <label class="base-form-label">Descripción del Problema</label>
                        <textarea name="description" class="base-form-textarea" rows="4" required>${ticket.description}</textarea>
                    </div>
                </form>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="btn-secondary" onclick="this.closest('.base-modal').remove()">Cancelar</button>
                <button type="button" class="btn-primary" onclick="submitEditTicket(this)">Guardar Cambios</button>
            </div>
        </div>
    `;
    
    return modal;
}

// === FUNCIONES PARA ENVIAR FORMULARIOS ===

async function submitSparePartForm(button) {
    const modal = button.closest('.base-modal');
    const form = modal.querySelector('#spare-part-form');
    const formData = new FormData(form);
    
    const data = {
        spare_part_id: parseInt(formData.get('spare_part_id'), 10),
        quantity_used: parseInt(formData.get('quantity_used'), 10),
        unit_cost: formData.get('unit_cost') ? parseFloat(formData.get('unit_cost')) : null,
        notes: formData.get('notes') || null
    };
    
    try {
        button.disabled = true;
        button.textContent = 'Agregando...';
        
        const response = await window.authenticatedFetch(`${window.API_URL}/tickets/${state.currentTicket.id}/spare-parts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            modal.remove();
            
            // Agregar el repuesto al estado local
            if (result.data) {
                state.spareParts.unshift(result.data);
            }
            
            // Re-renderizar solo los repuestos
            renderSpareParts();
            lucide.createIcons();
            
            showNotification('Repuesto agregado exitosamente', 'success');
        } else {
            throw new Error('Error al agregar repuesto');
        }
    } catch (error) {
        console.error('Error adding spare part:', error);
        showNotification('Error al agregar el repuesto', 'error');
        button.disabled = false;
        button.textContent = 'Agregar Repuesto';
    }
}

async function submitPhotoForm(button) {
    const modal = button.closest('.base-modal');
    const form = modal.querySelector('#photo-form');
    const formData = new FormData(form);
    
    const file = formData.get('photo_file');
    if (!file) {
        showNotification('Por favor selecciona una foto', 'warning');
        return;
    }
    
    try {
        button.disabled = true;
        button.textContent = 'Subiendo...';
        
        // Convertir imagen a base64
        const base64 = await fileToBase64(file);
        
        const data = {
            photo_data: base64, // Enviar el base64 completo con prefijo
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            description: formData.get('description') || null,
            photo_type: formData.get('photo_type'),
            author: (window.authManager?.getUser()?.username || 'Usuario')
        };
        
        const response = await window.authenticatedFetch(`${window.API_URL}/tickets/${state.currentTicket.id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            modal.remove();
            
            // Agregar la foto al estado local
            if (result.data) {
                state.photos.unshift(result.data);
            }
            
            // Re-renderizar la actividad completa (incluye fotos y notas)
            renderNotes();
            renderTicketStats();
            lucide.createIcons();
            
            showNotification('Foto subida exitosamente', 'success');
        } else {
            throw new Error('Error al subir foto');
        }
    } catch (error) {
        console.error('Error uploading photo:', error);
        showNotification('Error al subir la foto', 'error');
        button.disabled = false;
        button.textContent = 'Subir Foto';
    }
}

async function submitStatusChange(button) {
    const modal = button.closest('.base-modal');
    const form = modal.querySelector('#status-form');
    const formData = new FormData(form);
    
    const newStatus = formData.get('new_status');
    const comment = formData.get('comment');
    
    console.log('🔄 Iniciando cambio de estado:', { 
        ticketId: state.currentTicket.id, 
        currentStatus: state.currentTicket.status, 
        newStatus, 
        comment 
    });
    
    if (!newStatus) {
        alert('Debe seleccionar un nuevo estado');
        return;
    }
    
    try {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Cambiando...';
        
        console.log('📡 Enviando request de cambio de estado...');
        
        const response = await window.authenticatedFetch(`${window.API_URL}/tickets/${state.currentTicket.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...state.currentTicket,
                status: newStatus
            })
        });
        
        console.log('📨 Respuesta del servidor:', { status: response.status, ok: response.ok });
        
        if (response.ok) {
            // Agregar nota del cambio si hay comentario
            if (comment) {
                await window.authenticatedFetch(`${window.API_URL}/tickets/${state.currentTicket.id}/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        note: `Estado cambiado a "${newStatus}": ${comment}`,
                        note_type: 'Seguimiento',
                        author: (window.authManager?.getUser()?.username || 'Usuario')
                    })
                });
            }
            
            // Cerrar modal con animación
            modal.classList.remove('is-open');
            setTimeout(() => modal.remove(), 300);
            
            console.log('✅ Actualizando estado local del ticket...');
            
            // Actualizar el estado local del ticket
            const oldStatus = state.currentTicket.status;
            state.currentTicket.status = newStatus;
            state.currentTicket.updated_at = new Date().toISOString();
            
            console.log(`🔄 Estado cambiado de "${oldStatus}" a "${newStatus}"`);
            
            // Si hay comentario, agregarlo a las notas localmente
            if (comment && comment.trim()) {
                console.log('📝 Agregando comentario como nota:', comment);
                
                const newNote = {
                    id: Date.now(),
                    note: `Estado cambiado a "${newStatus}": ${comment}`,
                    note_type: 'Seguimiento',
                    author: (window.authManager?.getUser()?.username || 'Usuario'),
                    is_internal: false,
                    created_at: new Date().toISOString()
                };
                
                // Agregar al inicio del array de notas
                state.notes.unshift(newNote);
                console.log('📋 Total de notas después de agregar:', state.notes.length);
                console.log('📋 Nueva nota agregada:', newNote);
            }
            
            console.log('🎨 Re-renderizando componentes...');
            
            // Re-renderizar TODOS los componentes afectados
            renderTicketHeader(state.currentTicket);
            renderStatusActions(state.currentTicket); // ✅ ¡Esta era la llamada faltante!
            renderNotes();
            renderTicketStats();
            
            // Actualizar los iconos
            lucide.createIcons();
            
            console.log('✅ Interfaz actualizada completamente');
            showNotification(`Estado cambiado a "${newStatus}"`, 'success');
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error del servidor:', { status: response.status, error: errorData });
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Error cambiando estado del ticket:', error);
        showNotification(`Error al cambiar el estado: ${error.message}`, 'error');
        
        button.disabled = false;
        button.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Cambiar Estado';
        lucide.createIcons();
    }
}

async function submitAdvancedNote(button) {
    const modal = button.closest('.base-modal');
    const form = modal.querySelector('#note-form');
    const formData = new FormData(form);
    const photoInput = modal.querySelector('#note-photos');
    
    const noteText = formData.get('note').trim();
    const noteType = formData.get('note_type');
    const isInternal = formData.get('is_internal') === 'on';
    const photos = photoInput.files;
    
    // Validar que hay al menos nota o fotos
    if (!noteText && photos.length === 0) {
        alert('Debes escribir una nota o adjuntar al menos una foto');
        return;
    }
    
    if (!noteType) {
        alert('Selecciona el tipo de nota');
        return;
    }
    
    try {
        button.disabled = true;
        button.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Procesando...';
        
        let noteId = null;
        let uploadedPhotos = [];
        
        // 1. Primero crear la nota si hay texto
        if (noteText) {
            const noteData = {
                note: noteText,
                note_type: noteType,
                author: (window.authManager?.getUser()?.username || 'Usuario'),
                is_internal: isInternal
            };
            
            const noteResponse = await window.authenticatedFetch(`${window.API_URL}/tickets/${state.currentTicket.id}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });
            
            if (noteResponse.ok) {
                const noteResult = await noteResponse.json();
                noteId = noteResult.data.id;
                
                // Agregar al estado local
                state.notes.unshift(noteResult.data);
            } else {
                throw new Error('Error al crear la nota');
            }
        }
        
        // 2. Luego subir las fotos si las hay
        if (photos.length > 0) {
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                
                // Convertir foto a base64
                const photoBase64 = await fileToBase64(photo);
                
                const photoData = {
                    photo_data: photoBase64,
                    file_name: photo.name,
                    mime_type: photo.type,
                    file_size: photo.size,
                    description: `Adjunto a nota: ${noteType}`,
                    photo_type: noteType,
                    author: (window.authManager?.getUser()?.username || 'Usuario')
                };
                
                // Si hay una nota asociada, vincularlo
                if (noteId) {
                    photoData.note_id = noteId;
                }
                
                const photoResponse = await window.authenticatedFetch(`${window.API_URL}/tickets/${state.currentTicket.id}/photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(photoData)
                });
                
                if (photoResponse.ok) {
                    const photoResult = await photoResponse.json();
                    uploadedPhotos.push(photoResult.data);
                    
                    // Agregar al estado local
                    state.photos.unshift(photoResult.data);
                } else {
                    console.error(`Error subiendo foto ${i + 1}:`, await photoResponse.text());
                }
            }
        }
        
        modal.remove();
        
        // Re-renderizar actividades unificadas
        renderNotes();
        renderPhotos();
        lucide.createIcons();
        
        // Mensaje de éxito personalizado
        const itemsCount = (noteText ? 1 : 0) + uploadedPhotos.length;
        const message = noteText && uploadedPhotos.length > 0 
            ? `Nota con ${uploadedPhotos.length} foto(s) agregada exitosamente`
            : noteText 
                ? 'Nota agregada exitosamente'
                : `${uploadedPhotos.length} foto(s) agregada(s) exitosamente`;
        
        showNotification(message, 'success');
        
    } catch (error) {
        console.error('Error adding note/photos:', error);
        showNotification('Error al procesar la nota/fotos', 'error');
        button.disabled = false;
        button.innerHTML = '<i data-lucide="plus-circle" class="w-4 h-4"></i> Agregar Nota';
    }
}

async function deleteTicketPhoto(photoId, button) {
    if (!confirm('¿Eliminar esta foto?')) return;
    
    try {
        button.disabled = true;
        
        const response = await window.authenticatedFetch(`${window.API_URL}/tickets/photos/${photoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            button.closest('.base-modal').remove();
            
            // Remover la foto del estado local
            state.photos = state.photos.filter(photo => photo.id !== photoId);
            
            // Re-renderizar solo las fotos
            renderPhotos();
            lucide.createIcons();
            
            showNotification('Foto eliminada exitosamente', 'success');
        } else {
            throw new Error('Error al eliminar foto');
        }
    } catch (error) {
        console.error('Error deleting photo:', error);
        showNotification('Error al eliminar la foto', 'error');
        button.disabled = false;
    }
}

// === FUNCIONES DE UTILIDAD ===

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function submitEditTicket(button) {
    const modal = button.closest('.base-modal');
    const form = modal.querySelector('#edit-ticket-form');
    const formData = new FormData(form);
    
    const data = {
        // Campos editables del formulario
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        status: formData.get('status'),
        due_date: formData.get('due_date') || null,
        // Campos requeridos que no se editan en este modal
        client_id: state.currentTicket.client_id,
        location_id: state.currentTicket.location_id,
        equipment_id: state.currentTicket.equipment_id
    };
    
    try {
        button.disabled = true;
        button.textContent = 'Guardando...';
        
        const response = await window.authenticatedFetch(`${window.API_URL}/tickets/${state.currentTicket.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            modal.remove();
            
            // Actualizar el estado local del ticket
            Object.assign(state.currentTicket, data);
            state.currentTicket.updated_at = new Date().toISOString();
            
            // Re-renderizar header y stats
            renderTicketHeader(state.currentTicket);
            renderTicketStats();
            renderTicketDescription(state.currentTicket);
            lucide.createIcons();
            
            showNotification('Ticket actualizado exitosamente', 'success');
        } else {
            // Obtener el error específico del servidor
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || errorData?.message || 'Error al actualizar ticket');
        }
    } catch (error) {
        console.error('Error updating ticket:', error);
        showNotification('Error al actualizar el ticket', 'error');
        button.disabled = false;
        button.textContent = 'Guardar Cambios';
    }
}

// Función para configurar eventos del modal de notas
function setupNoteModalEvents(modal) {
    const noteTextarea = modal.querySelector('textarea[name="note"]');
    const charCount = modal.querySelector('#note-char-count');
    const photoInput = modal.querySelector('#note-photos');
    const photoPreview = modal.querySelector('#note-photo-preview');
    const dropZone = modal.querySelector('.photo-upload-drop-zone');
    
    // Contador de caracteres
    if (noteTextarea && charCount) {
        noteTextarea.addEventListener('input', () => {
            charCount.textContent = noteTextarea.value.length;
        });
    }
    
    // Preview de fotos
    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', (e) => {
            handleNotePhotoPreview(e.target.files, photoPreview);
        });
    }
    
    // Drag & Drop para fotos
    if (dropZone && photoInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            }, false);
        });
        
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            photoInput.files = files;
            handleNotePhotoPreview(files, photoPreview);
        }, false);
    }
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleNotePhotoPreview(files, previewContainer) {
    previewContainer.innerHTML = '';
    
    if (files.length === 0) return;
    
    Array.from(files).slice(0, 5).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoDiv = document.createElement('div');
                photoDiv.className = 'note-photo-preview-item';
                photoDiv.innerHTML = `
                    <div class="photo-preview-thumbnail">
                        <img src="${e.target.result}" alt="Preview ${index + 1}">
                        <button type="button" class="photo-preview-remove" onclick="removeNotePhotoPreview(this, ${index})">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="photo-preview-info">
                        <span class="photo-name">${file.name}</span>
                        <span class="photo-size">${(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                `;
                previewContainer.appendChild(photoDiv);
                lucide.createIcons();
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeNotePhotoPreview(button, index) {
    const photoItem = button.closest('.note-photo-preview-item');
    const previewContainer = button.closest('#note-photo-preview');
    const fileInput = document.querySelector('#note-photos');
    
    // Remover visualmente
    photoItem.remove();
    
    // Actualizar lista de archivos
    const dt = new DataTransfer();
    const files = Array.from(fileInput.files);
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    fileInput.files = dt.files;
}

function createAddChecklistModal() {
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

    return modal;
}

function createDeleteActivityGroupModal(noteIds = [], photoIds = []) {
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

    return modal;
}

function createUnifiedSparePartWorkflowModal(spareParts) {
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
                    <div id="step-1-select" class="space-y-4">
                        <div class="base-form-group">
                            <label class="base-form-label">Repuesto</label>
                            <select id="spare-part-selector" name="spare_part_id" class="base-form-input">
                                <option value="">Seleccionar repuesto disponible...</option>
                                ${spareParts.filter(part => part.current_stock > 0).map(part => {
                                    const partName = part.name || part.item_name || 'Sin nombre';
                                    return `
                                    <option value="${part.id}"
                                            data-stock="${part.current_stock}"
                                            data-cost="${part.unit_cost || 0}"
                                            data-name="${partName}">
                                        ${partName} (${part.sku || part.item_code || 'N/A'}) - Stock: ${part.current_stock}
                                    </option>
                                `;
                                }).join('')}
                                <option value="NOT_FOUND" style="background: #FEF3C7; font-weight: bold;">
                                    ⚠️ No encuentro el repuesto - Solicitar compra
                                </option>
                            </select>
                        </div>
                    </div>

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

    return modal;
}

function createLegacySparePartUsageModal(spareParts) {
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

    return modal;
}

function createSparePartRequestModal() {
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

    return modal;
}

async function editActivityGroup(noteIds = [], photoIds = []) {
    const ticketState = window.state;

    console.log('✏️ Editando grupo de actividad:', { noteIds, photoIds });

    if (noteIds.length > 0) {
        const firstNote = ticketState?.notes?.find((note) => note.id === noteIds[0]);
        console.log('🔍 Buscando nota con ID:', noteIds[0], 'Encontrada:', firstNote);

        if (!firstNote) {
            window.showToast?.('❌ No se encontró la nota para editar', 'error');
            return;
        }

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
                            <div class="edit-modal-tabs" style="display: flex; margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
                                <button type="button" class="edit-tab-btn active" data-tab="edit" style="padding: 0.5rem 1rem; border: none; background: transparent; color: #6366f1; border-bottom: 2px solid #6366f1; cursor: pointer; font-weight: 600;">
                                    Editar
                                </button>
                                <button type="button" class="edit-tab-btn" data-tab="preview" style="padding: 0.5rem 1rem; border: none; background: transparent; color: #6b7280; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 600;">
                                    Vista Previa
                                </button>
                            </div>

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

                            <div id="preview-panel" class="edit-panel" style="display: none;">
                                <div class="form-group" style="margin-bottom: 1.5rem;">
                                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #374151; margin-bottom: 0.75rem; font-size: 0.9rem;">
                                        <div style="background: #dcfce7; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                            <i data-lucide="eye" class="w-4 h-4 text-green-600"></i>
                                        </div>
                                        Vista Previa
                                    </label>
                                    <div id="edit-preview-content" style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; min-height: 100px; background: #f9fafb; color: #374151; line-height: 1.5;">
                                        ${(window.renderMarkdown?.(firstNote.note || '')) || ''}
                                    </div>
                                </div>
                            </div>

                            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
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

        document.body.appendChild(modal);

        setTimeout(() => {
            modal.classList.add('is-open');
            window.lucide?.createIcons?.();
        }, 10);

        setupEditModalTabs(modal, firstNote.note || '');

        const updateBtn = modal.querySelector('#update-note-btn');
        updateBtn.addEventListener('click', () => updateAdvancedNote(updateBtn, noteIds[0], modal));
        return;
    }

    if (photoIds.length > 0) {
        const photos = (ticketState?.photos || []).filter((photo) => photoIds.includes(photo.id));

        if (!photos.length) {
            window.showToast?.('❌ No se encontraron las fotos para editar', 'error');
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
                        ${photos.map((photo) => `
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
        window.lucide?.createIcons?.();
        return;
    }

    window.showToast?.('❌ No hay elementos para editar en esta actividad', 'error');
}

async function updateAdvancedNote(button, noteId, modal) {
    const ticketState = window.state;
    const form = modal.querySelector('#edit-note-form');
    const formData = new FormData(form);

    const noteText = formData.get('note').trim();
    const noteType = formData.get('note_type');
    const isInternal = formData.get('is_internal') === 'on';

    if (!noteText) {
        window.showToast?.('❌ El comentario no puede estar vacío', 'error');
        return;
    }

    if (!noteType) {
        window.showToast?.('❌ Selecciona el tipo de nota', 'error');
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

        const response = await window.authenticatedFetch(`${window.API_URL}/tickets/notes/${noteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error HTTP ${response.status}`);
        }

        await response.json();

        const noteIndex = ticketState?.notes?.findIndex((note) => note.id === noteId) ?? -1;
        if (noteIndex !== -1) {
            ticketState.notes[noteIndex] = {
                ...ticketState.notes[noteIndex],
                ...updateData,
                updated_at: new Date().toISOString()
            };
        }

        modal.remove();
        window.renderNotes?.();
        window.renderTicketStats?.();
        window.lucide?.createIcons?.();
        window.showToast?.('✅ Comentario actualizado correctamente', 'success');
    } catch (error) {
        console.error('❌ Error al actualizar nota:', error);
        window.showToast?.(`❌ Error al actualizar: ${error.message}`, 'error');
        button.disabled = false;
        button.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Actualizar Comentario';
    }
}

async function deleteIndividualPhoto(photoId, button) {
    const ticketState = window.state;

    if (!confirm('¿Eliminar esta foto?')) {
        return;
    }

    try {
        button.disabled = true;
        button.innerHTML = '<i data-lucide="loader" class="w-3 h-3 animate-spin"></i>';

        const response = await window.authenticatedFetch(`${window.API_URL}/tickets/${ticketState?.currentTicket?.id}/photos/${photoId}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        ticketState.photos = (ticketState.photos || []).filter((photo) => photo.id !== photoId);
        button.closest('.photo-item')?.remove();
        window.renderNotes?.();
        window.showToast?.('✅ Foto eliminada correctamente', 'success');
    } catch (error) {
        console.error('❌ Error al eliminar foto:', error);
        window.showToast?.('❌ Error al eliminar la foto', 'error');
        button.disabled = false;
        button.innerHTML = '<i data-lucide="trash-2" class="w-3 h-3"></i> Eliminar';
    }
}

function setupEditModalTabs(modal) {
    const tabButtons = modal.querySelectorAll('.edit-tab-btn');
    const editPanel = modal.querySelector('#edit-panel');
    const previewPanel = modal.querySelector('#preview-panel');
    const textarea = modal.querySelector('#edit-note-text');
    const previewContent = modal.querySelector('#edit-preview-content');

    function updatePreview() {
        const text = textarea.value;
        const rendered = typeof window.renderMarkdown === 'function'
            ? window.renderMarkdown(text)
            : text;
        previewContent.innerHTML = rendered || '<em style="color: #9ca3af;">Escribe algo para ver la vista previa...</em>';
    }

    tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            tabButtons.forEach((button) => {
                button.classList.remove('active');
                button.style.color = '#6b7280';
                button.style.borderBottomColor = 'transparent';
            });

            btn.classList.add('active');
            btn.style.color = '#6366f1';
            btn.style.borderBottomColor = '#6366f1';

            if (tab === 'edit') {
                editPanel.style.display = 'block';
                previewPanel.style.display = 'none';
            } else if (tab === 'preview') {
                editPanel.style.display = 'none';
                previewPanel.style.display = 'block';
                updatePreview();
            }
        });
    });

    textarea.addEventListener('input', () => {
        if (previewPanel.style.display !== 'none') {
            updatePreview();
        }
    });

    updatePreview();
}

window.ticketDetailModals = {
    createSparePartModal,
    createPhotoModal,
    createPhotoViewerModal,
    createStatusChangeModal,
    createAdvancedNoteModal,
    createEditTicketModal,
    createAddChecklistModal,
    createDeleteActivityGroupModal,
    createUnifiedSparePartWorkflowModal,
    createLegacySparePartUsageModal,
    createSparePartRequestModal,
    editActivityGroup,
    updateAdvancedNote,
    deleteIndividualPhoto,
    setupEditModalTabs
};
