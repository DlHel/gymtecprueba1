# 🎨 PLAN DE IMPLEMENTACIÓN FRONTEND - TICKETS DE GIMNACIÓN

## 📋 **Modificaciones Requeridas en Frontend**

### **1. tickets.html - Modificaciones de UI** (20 min)

#### **Selector de Tipo de Ticket**:
```html
<div class="form-group">
    <label for="ticket-type" class="form-label required">Tipo de Servicio</label>
    <select id="ticket-type" name="ticket_type" class="form-select" required>
        <option value="">Seleccionar tipo...</option>
        <option value="individual">Mantenimiento Individual</option>
        <option value="gimnacion">Mantenimiento de Gimnación</option>
    </select>
</div>
```

#### **Panel Específico para Gimnación**:
```html
<div id="gimnacion-panel" class="gimnacion-panel hidden">
    <!-- Información del contrato -->
    <div class="contract-info">
        <h4>Información del Contrato</h4>
        <div id="contract-details"></div>
    </div>
    
    <!-- Selección de equipos -->
    <div class="equipment-scope">
        <h4>Equipos a Incluir en el Servicio</h4>
        <div class="equipment-stats">
            <span class="stat">
                <span id="total-equipment">0</span> Total
            </span>
            <span class="stat">
                <span id="contract-equipment">0</span> En Contrato
            </span>
            <span class="stat">
                <span id="included-equipment">0</span> Incluidos
            </span>
            <span class="stat">
                <span id="excluded-equipment">0</span> Excluidos
            </span>
        </div>
        
        <div class="equipment-filters">
            <button type="button" id="select-all-equipment" class="btn-secondary btn-sm">
                Seleccionar Todos
            </button>
            <button type="button" id="select-contract-equipment" class="btn-secondary btn-sm">
                Solo del Contrato
            </button>
            <button type="button" id="clear-selection" class="btn-secondary btn-sm">
                Limpiar Selección
            </button>
        </div>
        
        <div id="equipment-checklist" class="equipment-list">
            <!-- Se llenará dinámicamente -->
        </div>
    </div>
    
    <!-- Asignación de técnicos -->
    <div class="technicians-assignment">
        <h4>Asignación de Técnicos</h4>
        <div class="technician-controls">
            <button type="button" id="add-technician" class="btn-secondary btn-sm">
                + Agregar Técnico
            </button>
        </div>
        <div id="technicians-list">
            <!-- Se llenará dinámicamente -->
        </div>
    </div>
    
    <!-- Sistema de checklist -->
    <div class="checklist-section">
        <h4>Checklist de Mantenimiento</h4>
        <div class="checklist-options">
            <label>
                <input type="radio" name="checklist-type" value="template" checked>
                Usar Template Existente
            </label>
            <label>
                <input type="radio" name="checklist-type" value="custom">
                Crear Checklist Personalizado
            </label>
        </div>
        
        <div id="template-selection" class="checklist-templates">
            <select id="checklist-template" class="form-select">
                <option value="">Seleccionar template...</option>
            </select>
            <div id="template-preview"></div>
        </div>
        
        <div id="custom-checklist" class="custom-checklist hidden">
            <div class="checklist-builder">
                <div class="checklist-item-form">
                    <input type="text" placeholder="Agregar item al checklist..." id="new-checklist-item">
                    <button type="button" id="add-checklist-item" class="btn-secondary btn-sm">Agregar</button>
                </div>
                <div id="checklist-items-preview"></div>
            </div>
            
            <div class="save-template">
                <label>
                    <input type="checkbox" id="save-as-template">
                    Guardar como template para uso futuro
                </label>
                <input type="text" placeholder="Nombre del template..." id="template-name" class="form-input" disabled>
            </div>
        </div>
    </div>
</div>
```

### **2. tickets.js - Lógica JavaScript** (30 min)

#### **State Management Expandido**:
```javascript
let state = {
    // Estado existente...
    gimnacion: {
        equipmentScope: [],
        selectedEquipment: [],
        assignedTechnicians: [],
        customChecklist: [],
        checklistTemplates: [],
        contractInfo: null,
        isGimnacionMode: false
    }
};
```

#### **Funciones Principales**:

**1. Gestión de Tipo de Ticket**:
```javascript
function handleTicketTypeChange(ticketType) {
    const gimnacionPanel = document.getElementById('gimnacion-panel');
    const individualFields = document.querySelectorAll('.individual-only');
    
    if (ticketType === 'gimnacion') {
        gimnacionPanel.classList.remove('hidden');
        individualFields.forEach(field => field.style.display = 'none');
        state.gimnacion.isGimnacionMode = true;
        
        // Cargar datos específicos de gimnación
        loadEquipmentByLocation();
        loadChecklistTemplates();
        
    } else {
        gimnacionPanel.classList.add('hidden');
        individualFields.forEach(field => field.style.display = 'block');
        state.gimnacion.isGimnacionMode = false;
    }
}
```

**2. Carga de Equipos por Sede**:
```javascript
async function loadEquipmentByLocation() {
    const locationId = document.querySelector('[name="location_id"]').value;
    const contractId = document.querySelector('[name="contract_id"]')?.value;
    
    if (!locationId) return;
    
    try {
        const response = await authenticatedFetch(
            `${API_URL}/locations/${locationId}/equipment?contractId=${contractId || ''}`
        );
        
        if (!response.ok) throw new Error('Error loading equipment');
        
        const result = await response.json();
        state.gimnacion.equipmentScope = result.data;
        
        renderEquipmentChecklist();
        updateEquipmentStats();
        
    } catch (error) {
        console.error('Error loading equipment:', error);
        ui.showError('Error cargando equipos de la sede');
    }
}
```

**3. Renderizado de Lista de Equipos**:
```javascript
function renderEquipmentChecklist() {
    const container = document.getElementById('equipment-checklist');
    const equipments = state.gimnacion.equipmentScope;
    
    if (!equipments.length) {
        container.innerHTML = '<p class="no-equipment">No hay equipos en esta sede</p>';
        return;
    }
    
    const html = equipments.map(equipment => `
        <div class="equipment-item ${equipment.is_in_contract ? 'in-contract' : ''}">
            <label class="equipment-checkbox">
                <input 
                    type="checkbox" 
                    value="${equipment.id}"
                    ${equipment.is_in_contract ? 'checked' : ''}
                    data-equipment='${JSON.stringify(equipment)}'
                >
                <div class="equipment-info">
                    <div class="equipment-name">
                        ${equipment.name}
                        ${equipment.is_in_contract ? '<span class="contract-badge">En Contrato</span>' : ''}
                    </div>
                    <div class="equipment-details">
                        ${equipment.brand} ${equipment.model} - ${equipment.type}
                    </div>
                    <div class="equipment-serial">
                        S/N: ${equipment.serial_number}
                    </div>
                </div>
                <div class="technician-assignment">
                    <select class="form-select form-select-sm equipment-technician" 
                            data-equipment-id="${equipment.id}">
                        <option value="">Sin asignar</option>
                        <!-- Se llenarán dinámicamente -->
                    </select>
                </div>
            </label>
            
            <div class="exclusion-reason ${equipment.is_in_contract ? '' : 'active'}">
                <textarea 
                    placeholder="Razón de exclusión..."
                    class="form-textarea exclusion-textarea"
                    data-equipment-id="${equipment.id}"
                ></textarea>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    
    // Event listeners para checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleEquipmentSelection);
    });
}
```

**4. Gestión de Checklist**:
```javascript
async function loadChecklistTemplates() {
    try {
        const response = await authenticatedFetch(`${API_URL}/gimnacion/checklist-templates`);
        if (!response.ok) throw new Error('Error loading templates');
        
        const result = await response.json();
        state.gimnacion.checklistTemplates = result.data;
        
        renderTemplateOptions();
        
    } catch (error) {
        console.error('Error loading checklist templates:', error);
    }
}

function renderTemplateOptions() {
    const select = document.getElementById('checklist-template');
    const templates = state.gimnacion.checklistTemplates;
    
    const html = templates.map(template => 
        `<option value="${template.id}">
            ${template.name} (${template.items_count} items)
            ${template.is_default ? ' - Por defecto' : ''}
        </option>`
    ).join('');
    
    select.innerHTML = '<option value="">Seleccionar template...</option>' + html;
}

async function previewTemplate(templateId) {
    if (!templateId) {
        document.getElementById('template-preview').innerHTML = '';
        return;
    }
    
    try {
        const response = await authenticatedFetch(
            `${API_URL}/gimnacion/checklist-templates/${templateId}/items`
        );
        
        if (!response.ok) throw new Error('Error loading template items');
        
        const result = await response.json();
        const items = result.data;
        
        const html = `
            <div class="template-preview">
                <h5>Vista previa del checklist:</h5>
                <ul class="checklist-preview">
                    ${items.map(item => `
                        <li class="checklist-item-preview">
                            ${item.item_text}
                            ${item.is_required ? '<span class="required-badge">Requerido</span>' : ''}
                            ${item.category ? `<span class="category-badge">${item.category}</span>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        document.getElementById('template-preview').innerHTML = html;
        
    } catch (error) {
        console.error('Error previewing template:', error);
    }
}
```

**5. Creación del Ticket de Gimnación**:
```javascript
async function createGimnacionTicket(formData) {
    const gimnacionData = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        client_id: parseInt(formData.get('client_id')),
        location_id: parseInt(formData.get('location_id')),
        contract_id: formData.get('contract_id') ? parseInt(formData.get('contract_id')) : null,
        
        // Scope de equipos
        equipment_scope: state.gimnacion.selectedEquipment.map(eq => ({
            equipment_id: eq.id,
            is_included: eq.is_included,
            exclusion_reason: eq.exclusion_reason,
            assigned_technician_id: eq.assigned_technician_id
        })),
        
        // Técnicos asignados
        technicians: state.gimnacion.assignedTechnicians.map(tech => ({
            technician_id: tech.id,
            role: tech.role
        })),
        
        // Checklist
        checklist_template_id: formData.get('checklist-type') === 'template' 
            ? parseInt(formData.get('checklist_template')) || null
            : null,
        custom_checklist: formData.get('checklist-type') === 'custom'
            ? state.gimnacion.customChecklist
            : null
    };
    
    try {
        ui.showLoading();
        
        const response = await authenticatedFetch(`${API_URL}/tickets/gimnacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gimnacionData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error creando ticket de gimnación');
        }
        
        const result = await response.json();
        
        ui.showSuccess('Ticket de gimnación creado exitosamente');
        
        // Guardar template si es necesario
        if (formData.get('save_as_template') && state.gimnacion.customChecklist.length > 0) {
            await saveChecklistTemplate();
        }
        
        // Limpiar formulario y recargar lista
        resetGimnacionForm();
        closeModal('ticket-modal');
        await fetchTickets();
        
    } catch (error) {
        console.error('Error creating gimnacion ticket:', error);
        ui.showError(error.message);
    } finally {
        ui.hideLoading();
    }
}
```

### **3. CSS Específico** (10 min)

```css
/* Estilos para panel de gimnación */
.gimnacion-panel {
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.equipment-scope {
    margin: 20px 0;
}

.equipment-stats {
    display: flex;
    gap: 15px;
    margin: 15px 0;
    padding: 10px;
    background: rgba(255,255,255,0.7);
    border-radius: 6px;
}

.equipment-stats .stat {
    font-size: 14px;
    font-weight: 500;
}

.equipment-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px;
    background: white;
}

.equipment-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #f3f4f6;
    transition: background-color 0.2s;
}

.equipment-item:hover {
    background-color: #f9fafb;
}

.equipment-item.in-contract {
    background-color: #f0fdf4;
    border-left: 4px solid #10b981;
}

.contract-badge {
    background: #10b981;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    margin-left: 8px;
}

.technicians-assignment {
    margin: 20px 0;
}

.technician-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 10px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    margin: 10px 0;
}

.checklist-section {
    margin: 20px 0;
}

.checklist-templates {
    margin: 15px 0;
}

.template-preview {
    margin: 15px 0;
    padding: 15px;
    background: #f9fafb;
    border-radius: 6px;
}

.checklist-preview {
    list-style: none;
    padding: 0;
}

.checklist-item-preview {
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;
}

.required-badge {
    background: #ef4444;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    margin-left: 8px;
}

.category-badge {
    background: #6366f1;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    margin-left: 8px;
}
```

## 🔧 **INTEGRACIÓN CON SISTEMA EXISTENTE**

### **Modificaciones en server-clean.js**:
```javascript
// Agregar las rutas de gimnación
const gimnacionRoutes = require('./gimnacion-routes');
app.use('/api', gimnacionRoutes);
```

### **Script de Migración de BD**:
```bash
# Ejecutar migración
cd backend && mysql -u root -p gymtec_erp < database/gimnacion-tickets-migration.sql
```

## 📊 **TESTING DEL SISTEMA**

### **Tests Manuales**:
1. Crear ticket individual (verificar funcionamiento normal)
2. Crear ticket de gimnación con template
3. Crear ticket de gimnación con checklist personalizado
4. Verificar asignación múltiple de técnicos
5. Probar exclusión de equipos
6. Validar guardado de templates
7. Comprobar reportes específicos

### **Validaciones**:
- [ ] Formulario no permite envío sin equipos seleccionados
- [ ] Sistema calcula correctamente estadísticas
- [ ] Templates se cargan y previsualizan correctamente
- [ ] Checklist personalizado se guarda como template
- [ ] Múltiples técnicos se asignan correctamente
- [ ] Reportes muestran datos precisos

## 🎯 **RESULTADO ESPERADO**

**Frontend completamente funcional para Tickets de Gimnación con**:
- ✅ Selección de tipo de ticket intuitiva
- ✅ Carga automática de equipos por sede
- ✅ Sistema de inclusión/exclusión visual
- ✅ Asignación flexible de técnicos
- ✅ Checklist personalizable y reutilizable
- ✅ Integración perfecta con sistema existente
- ✅ UI/UX consistente con el resto del sistema

**¿Procedo con la implementación del frontend siguiendo este plan?**