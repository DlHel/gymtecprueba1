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
            const stock = parseInt(selectedOption.dataset.stock);
            const quantity = parseInt(quantityInput.value);
            
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
        <div class="base-modal-content">
            <div class="base-modal-header">
                <h3 class="base-modal-title">Agregar Nota al Ticket</h3>
                <button class="base-modal-close" onclick="this.closest('.base-modal').remove()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="base-modal-body">
                <form id="note-form">
                    <div class="form-group">
                        <label class="form-label">Tipo de Nota</label>
                        <select name="note_type" class="form-input" required>
                            <option value="">Seleccionar tipo</option>
                            <option value="Comentario">Comentario</option>
                            <option value="Diagnóstico">Diagnóstico</option>
                            <option value="Solución">Solución</option>
                            <option value="Seguimiento">Seguimiento</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nota</label>
                        <textarea name="note" class="form-textarea" rows="5" required placeholder="Escribir nota..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="flex items-center gap-2">
                            <input type="checkbox" name="is_internal" class="form-checkbox">
                            <span class="form-label mb-0">Nota interna (no visible para cliente)</span>
                        </label>
                    </div>
                </form>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="btn-secondary" onclick="this.closest('.base-modal').remove()">Cancelar</button>
                <button type="button" class="btn-primary" onclick="submitAdvancedNote(this)">Agregar Nota</button>
            </div>
        </div>
    `;
    
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
        spare_part_id: parseInt(formData.get('spare_part_id')),
        quantity_used: parseInt(formData.get('quantity_used')),
        unit_cost: formData.get('unit_cost') ? parseFloat(formData.get('unit_cost')) : null,
        notes: formData.get('notes') || null
    };
    
    try {
        button.disabled = true;
        button.textContent = 'Agregando...';
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/spare-parts`, {
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
            photo_data: base64.split(',')[1], // Remover el prefijo data:image/...;base64,
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            description: formData.get('description') || null,
            photo_type: formData.get('photo_type')
        };
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/photos`, {
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
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}`, {
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
                await fetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        note: `Estado cambiado a "${newStatus}": ${comment}`,
                        note_type: 'Seguimiento',
                        author: 'Felipe Maturana'
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
                    author: 'Felipe Maturana',
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
    
    const data = {
        note: formData.get('note'),
        note_type: formData.get('note_type'),
        author: 'Felipe Maturana',
        is_internal: formData.get('is_internal') === 'on'
    };
    
    try {
        button.disabled = true;
        button.textContent = 'Agregando...';
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            modal.remove();
            
            // Agregar la nota al estado local
            if (result.data) {
                state.notes.unshift(result.data);
            }
            
            // Re-renderizar solo las notas
            renderNotes();
            lucide.createIcons();
            
            showNotification('Nota agregada exitosamente', 'success');
        } else {
            throw new Error('Error al agregar nota');
        }
    } catch (error) {
        console.error('Error adding note:', error);
        showNotification('Error al agregar la nota', 'error');
        button.disabled = false;
        button.textContent = 'Agregar Nota';
    }
}

async function deleteTicketPhoto(photoId, button) {
    if (!confirm('¿Eliminar esta foto?')) return;
    
    try {
        button.disabled = true;
        
        const response = await fetch(`${API_URL}/tickets/photos/${photoId}`, {
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
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}`, {
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