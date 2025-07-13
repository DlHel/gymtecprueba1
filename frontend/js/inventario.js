// API_URL se define en config.js

let state = {
    inventory: [],
};

// --- DOM Elements (Inicializados de forma segura) ---
let dom = {};

// --- Lógica de Modales Modernos ---
const modals = {
    open: (modalElem, title, data = {}) => {
        console.log('Abriendo modal de inventario:', title, data);
        
        if (!modalElem) {
            console.error('Modal element no encontrado!');
            return;
        }
        
        const form = modalElem.querySelector('form');
        if (!form) {
            console.error('Form no encontrado en modal!');
            return;
        }
        
        form.reset();
        const titleElement = modalElem.querySelector('h3');
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        for (const [key, value] of Object.entries(data)) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = value;
        }
        
        // Mostrar modal con animación
        modalElem.style.display = 'flex';
        modalElem.style.opacity = '1';
        modalElem.style.pointerEvents = 'auto';
        document.body.classList.add('modal-open');
        
        // Forzar reflow para que la transición funcione
        modalElem.offsetHeight;
        
        modalElem.classList.add('is-open');
        
        // Configurar botón X de cerrar (cada vez que se abre el modal)
        const closeBtn = modalElem.querySelector('.base-modal-close');
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = modalElem.querySelector('.base-modal-close');
            newCloseBtn.addEventListener('click', () => modals.close(modalElem));
        }
        
        // Actualizar iconos de Lucide después de configurar el modal
        lucide.createIcons();
    },
    
    close: (modalElem) => {
        modalElem.classList.remove('is-open');
        setTimeout(() => {
            modalElem.style.display = 'none';
        }, 300); // Esperar a que termine la animación
        document.body.classList.remove('modal-open');
    },
    
    setup: (modalElem, resource, onSuccess) => {
        if (!modalElem) {
            console.error('❌ Modal element no disponible para configuración');
            return;
        }
        
        const form = modalElem.querySelector('form');
        if (!form) {
            console.error('❌ Form no encontrado en modal para configuración');
            return;
        }
        
        // Event listener para botón cancelar
        const cancelBtn = modalElem.querySelector('.base-btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => modals.close(modalElem));
        } else {
            console.warn('⚠️ Botón cancelar no encontrado en modal');
        }
        
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                await api.save(resource, formData);
                modals.close(modalElem);
                if(onSuccess) await onSuccess();
            } catch (error) {
                console.error('❌ Error al guardar:', error);
                alert(error.message);
            }
        });
        
        console.log('✅ Modal configurado correctamente');
    }
};

// --- API Functions ---
const api = {
    save: (resource, data) => {
        const id = data.get('id');
        const url = id ? `${API_URL}/${resource}/${id}` : `${API_URL}/${resource}`;
        const method = id ? 'PUT' : 'POST';
        return fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(data)),
        }).then(res => {
            if (!res.ok) throw new Error(`Error al guardar ${resource}`);
            return res.json().catch(() => ({}));
        });
    },
    
    delete: (resource, id) => {
        return fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error(`Error al eliminar ${resource}`);
                return res.json().catch(() => ({}));
            });
    }
};

// --- DOM Initialization ---
function initializeDOMElements() {
    console.log('🎯 Inicializando elementos DOM de inventario...');
    
    // Función auxiliar para obtener elementos de forma segura
    const getElementSafe = (elementId, description) => {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`✅ Elemento encontrado: ${elementId} (${description})`);
            return element;
        } else {
            console.warn(`⚠️ Elemento ${elementId} no encontrado (${description})`);
            return null;
        }
    };
    
    dom.inventoryList = getElementSafe('inventory-container', 'contenedor de inventario');
    dom.addInventoryBtn = getElementSafe('add-inventory-btn', 'botón agregar inventario');
    dom.modal = getElementSafe('inventory-modal', 'modal de inventario');
    dom.form = getElementSafe('inventory-form', 'formulario del modal');
    
    // Verificar elementos críticos
    const criticalElements = ['inventory-container', 'add-inventory-btn'];
    const missingCritical = criticalElements.filter(id => !document.getElementById(id));
    
    if (missingCritical.length > 0) {
        console.error('❌ Elementos críticos no encontrados:', missingCritical);
        console.error('❌ La página puede no estar completamente cargada');
        return false;
    }
    
    console.log('✅ Elementos DOM inicializados correctamente');
    return true;
}

function setupEventListeners() {
    console.log('🎯 Configurando event listeners de inventario...');
    
    // Event listener para botón agregar (con verificación)
    if (dom.addInventoryBtn) {
        dom.addInventoryBtn.addEventListener('click', () => {
            if (dom.modal) {
                modals.open(dom.modal, 'Nuevo Repuesto');
            } else {
                console.error('❌ Modal no disponible para agregar repuesto');
            }
        });
        console.log('✅ Event listener agregado para botón agregar inventario');
    }

    // Event listeners para botones de editar/eliminar (delegación de eventos)
    document.body.addEventListener('click', async function(event) {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.matches('.edit-inventory-btn')) {
            if (!dom.modal) {
                console.error('❌ Modal no disponible para editar repuesto');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/inventory/${button.dataset.id}`);
                const result = await response.json();
                modals.open(dom.modal, 'Editar Repuesto', result.data);
            } catch (error) {
                console.error('❌ Error al cargar datos para edición:', error);
            }
        } else if (button.matches('.delete-inventory-btn')) {
            if (confirm('¿Estás seguro de que quieres eliminar este repuesto? Esta acción no se puede deshacer.')) {
                try {
                    await api.delete('inventory', button.dataset.id);
                    fetchInventory();
                } catch (error) {
                    console.error('❌ Error al eliminar repuesto:', error);
                }
            }
        }
    });
    
    console.log('✅ Event listeners configurados correctamente');
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema de inventario...');
    
    // Inicializar elementos DOM
    if (!initializeDOMElements()) {
        console.error('❌ Fallo en inicialización de elementos DOM');
        return;
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    // Configurar modal si está disponible
    if (dom.modal) {
        modals.setup(dom.modal, 'inventory', fetchInventory);
        console.log('✅ Modal configurado');
    } else {
        console.warn('⚠️ Modal no disponible para configuración');
    }
    
    // Cargar datos de inventario
    fetchInventory();
    
    console.log('✅ Sistema de inventario inicializado correctamente');
});


// --- Render Functions ---
function renderInventory(inventoryItems) {
    if (!dom.inventoryList) {
        console.error('❌ Elemento inventory-container no disponible para renderizar');
        return;
    }
    
    if (inventoryItems && inventoryItems.length > 0) {
        const tableHTML = `
            <div class="overflow-x-auto">
                <table class="app-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>SKU</th>
                            <th>Stock Actual</th>
                            <th>Stock Mínimo</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventoryItems.map(item => {
                            const stockStatus = item.current_stock <= item.minimum_stock
                                ? '<span class="status-badge danger">Bajo Stock</span>'
                                : '<span class="status-badge success">En Stock</span>';

                            return `
                                <tr>
                                    <td><div class="font-medium text-slate-900">${item.name}</div></td>
                                    <td class="text-slate-500">${item.sku || 'N/A'}</td>
                                    <td class="text-slate-500">${item.current_stock}</td>
                                    <td class="text-slate-500">${item.minimum_stock}</td>
                                    <td>${stockStatus}</td>
                                    <td class="text-right">
                                        <button class="p-1 text-slate-500 hover:text-sky-500 edit-inventory-btn" data-id="${item.id}" title="Editar repuesto">
                                            <i data-lucide="edit" class="w-4 h-4"></i>
                                        </button>
                                        <button class="p-1 text-slate-500 hover:text-red-500 delete-inventory-btn" data-id="${item.id}" title="Eliminar repuesto">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        dom.inventoryList.innerHTML = tableHTML;
    } else {
        dom.inventoryList.innerHTML = `
            <div class="text-center py-12">
                <div class="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="package" class="w-12 h-12 text-gray-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">No hay repuestos registrados</h3>
                <p class="text-gray-500 mb-6">Comienza agregando el primer repuesto al inventario</p>
                <button class="btn-primary" onclick="document.getElementById('add-inventory-btn').click()">
                    Agregar Primer Repuesto
                </button>
            </div>
        `;
    }
    lucide.createIcons();
}

// --- API Calls ---
async function fetchInventory() {
    try {
        console.log('📦 Cargando datos de inventario...');
        const response = await fetch(`${API_URL}/inventory`);
        state.inventory = (await response.json()).data;
        renderInventory(state.inventory);
        console.log(`✅ Inventario cargado: ${state.inventory.length} items`);
    } catch (error) {
        console.error("❌ Error fetching inventory:", error);
        if (dom.inventoryList) {
            dom.inventoryList.innerHTML = `
                <div class="text-center py-12">
                    <div class="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <i data-lucide="alert-circle" class="w-12 h-12 text-red-600"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Error al cargar inventario</h3>
                    <p class="text-red-500 mb-6">Ha ocurrido un error al cargar los datos del inventario</p>
                    <button class="btn-primary" onclick="fetchInventory()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }
}

 