const API_URL = 'http://localhost:3000/api';

let state = {
    inventory: [],
};

// --- DOM Elements ---
const dom = {
    inventoryList: document.getElementById('inventory-list'),
    addInventoryBtn: document.getElementById('add-inventory-btn'),
    modal: document.getElementById('inventory-modal'),
    form: document.getElementById('inventory-modal-form'),
};

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
        const closeBtn = modalElem.querySelector('.inventory-modal-close');
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = modalElem.querySelector('.inventory-modal-close');
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
        const form = modalElem.querySelector('form');
        
        // Event listener para botón cancelar
        modalElem.querySelector('.modal-cancel-btn').addEventListener('click', () => modals.close(modalElem));
        
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                await api.save(resource, formData);
                modals.close(modalElem);
                if(onSuccess) await onSuccess();
            } catch (error) {
                alert(error.message);
            }
        });
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();

    // --- Event Listeners ---
    dom.addInventoryBtn.addEventListener('click', () => {
        modals.open(dom.modal, 'Nuevo Repuesto');
    });

    document.body.addEventListener('click', async function(event) {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.matches('.edit-inventory-btn')) {
            const response = await fetch(`${API_URL}/inventory/${button.dataset.id}`);
            const result = await response.json();
            modals.open(dom.modal, 'Editar Repuesto', result.data);
        } else if (button.matches('.delete-inventory-btn')) {
            if (confirm('¿Estás seguro de que quieres eliminar este repuesto? Esta acción no se puede deshacer.')) {
                await api.delete('inventory', button.dataset.id);
                fetchInventory();
            }
        }
    });
    
    // Configuración del modal
    modals.setup(dom.modal, 'inventory', fetchInventory);
});


// --- Render Functions ---
function renderInventory(inventoryItems) {
    dom.inventoryList.innerHTML = '';
    if (inventoryItems && inventoryItems.length > 0) {
        inventoryItems.forEach(item => {
            const row = document.createElement('tr');
            const stockStatus = item.current_stock <= item.minimum_stock
                ? '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Bajo Stock</span>'
                : '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">En Stock</span>';

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-slate-900">${item.name}</div></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${item.sku || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${item.current_stock}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${item.minimum_stock}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${stockStatus}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="p-1 text-slate-500 hover:text-sky-500 edit-inventory-btn" data-id="${item.id}" title="Editar repuesto"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button class="p-1 text-slate-500 hover:text-red-500 delete-inventory-btn" data-id="${item.id}" title="Eliminar repuesto"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>`;
            dom.inventoryList.appendChild(row);
        });
    } else {
        dom.inventoryList.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500">No hay repuestos en el inventario.</td></tr>';
    }
    lucide.createIcons();
}

// --- API Calls ---
async function fetchInventory() {
    try {
        const response = await fetch(`${API_URL}/inventory`);
        state.inventory = (await response.json()).data;
        renderInventory(state.inventory);
    } catch (error) {
        console.error("Error fetching inventory:", error);
        dom.inventoryList.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Error al cargar inventario.</td></tr>`;
    }
}

 