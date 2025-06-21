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
    modal.innerHTML = `
        <div class="base-modal-content">
            <div class="base-modal-header">
                <h3 class="base-modal-title">Cambiar Estado del Ticket</h3>
                <button class="base-modal-close" onclick="this.closest('.base-modal').remove()">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="base-modal-body">
                <form id="status-form">
                    <div class="form-group">
                        <label class="form-label">Estado Actual</label>
                        <input type="text" value="${currentStatus}" class="form-input" readonly>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nuevo Estado</label>
                        <select name="new_status" class="form-input" required>
                            <option value="">Seleccionar nuevo estado</option>
                            ${statuses.filter(s => s !== currentStatus).map(status => `
                                <option value="${status}">${status}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Comentario (opcional)</label>
                        <textarea name="comment" class="form-textarea" rows="3" placeholder="Razón del cambio de estado..."></textarea>
                    </div>
                </form>
            </div>
            <div class="base-modal-footer">
                <button type="button" class="btn-secondary" onclick="this.closest('.base-modal').remove()">Cancelar</button>
                <button type="button" class="btn-primary" onclick="submitStatusChange(this)">Cambiar Estado</button>
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
            modal.remove();
            await loadTicketDetail(state.currentTicket.id);
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
            modal.remove();
            await loadTicketDetail(state.currentTicket.id);
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
    
    try {
        button.disabled = true;
        button.textContent = 'Cambiando...';
        
        const response = await fetch(`${API_URL}/tickets/${state.currentTicket.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...state.currentTicket,
                status: newStatus
            })
        });
        
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
            
            modal.remove();
            await loadTicketDetail(state.currentTicket.id);
            showNotification(`Estado cambiado a "${newStatus}"`, 'success');
        } else {
            throw new Error('Error al cambiar estado');
        }
    } catch (error) {
        console.error('Error changing status:', error);
        showNotification('Error al cambiar el estado', 'error');
        button.disabled = false;
        button.textContent = 'Cambiar Estado';
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
            modal.remove();
            await loadTicketDetail(state.currentTicket.id);
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
            await loadTicketDetail(state.currentTicket.id);
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