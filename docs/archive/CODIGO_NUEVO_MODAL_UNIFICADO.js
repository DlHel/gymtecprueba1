// MODAL UNIFICADO DE REPUESTOS - CÓDIGO NUEVO
// Este código debe agregarse antes de showAddSparePartModal() en ticket-detail.js

/**
 * Modal unificado para solicitar repuestos con flujo inteligente:
 * 1. Muestra lista de repuestos disponibles en inventario
 * 2. Si selecciona un repuesto disponible → Registra uso directo
 * 3. Si el repuesto no está → Habilita formulario de solicitud de compra
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
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div class="base-form-group">
                                    <label class="base-form-label">Cantidad a Utilizar <span class="required">*</span></label>
                                    <input type="number" id="quantity-use" name="quantity_used" class="base-form-input" min="1" placeholder="1">
                                    <small class="text-gray-500 text-xs" id="stock-info"></small>
                                </div>
                                <div class="base-form-group">
                                    <label class="base-form-label">Costo Unitario <span class="required">*</span></label>
                                    <input type="number" id="unit-cost" name="unit_cost" class="base-form-input" step="0.01" placeholder="0.00">
                                </div>
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
                                    <input type="number" id="quantity-request" name="quantity_needed" class="base-form-input" min="1" placeholder="1">
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
                const stock = parseInt(selectedOption.dataset.stock);
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
                    const stock = parseInt(selectedOption.dataset.stock);
                    const quantity = parseInt(quantityUseInput.value);
                    
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
    const quantityUsed = parseInt(formData.get('quantity_used'));
    const unitCost = parseFloat(formData.get('unit_cost'));
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
    
    if (!unitCost || unitCost < 0) {
        showNotification('El costo unitario es requerido', 'error');
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
                spare_part_id: parseInt(sparePartId),
                quantity_used: quantityUsed,
                unit_cost: unitCost,
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
    const quantityNeeded = parseInt(formData.get('quantity_needed'));
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
