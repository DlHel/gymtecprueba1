const API_URL = 'http://localhost:3000/api';

let state = {
    inventory: [],
};

// --- DOM Elements ---
const inventoryList = document.getElementById('inventory-list');
const inventoryModalForm = document.getElementById('inventory-modal-form');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();

    // --- Event Listeners ---
    document.getElementById('add-inventory-btn').addEventListener('click', () => openModal('inventory-modal'));
    document.getElementById('inventory-modal-cancel-btn').addEventListener('click', () => closeModal('inventory-modal'));
    inventoryModalForm.addEventListener('submit', handleFormSubmit);

    document.body.addEventListener('click', function(event) {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.matches('.edit-inventory-btn')) {
            openModal('inventory-modal', { id: button.dataset.id });
        } else if (button.matches('.delete-inventory-btn')) {
            deleteItem('inventory', button.dataset.id, fetchInventory);
        }
    });
});


// --- Render Functions ---
function renderInventory(inventoryItems) {
    inventoryList.innerHTML = '';
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
                    <button class="p-1 text-slate-500 hover:text-sky-500 edit-inventory-btn" data-id="${item.id}"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button class="p-1 text-slate-500 hover:text-red-500 delete-inventory-btn" data-id="${item.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>`;
            inventoryList.appendChild(row);
        });
    } else {
        inventoryList.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500">No hay repuestos en el inventario.</td></tr>';
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
        inventoryList.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Error al cargar inventario.</td></tr>`;
    }
}

// --- Modal & Form Logic ---
async function openModal(modalId, data = {}) {
    const form = document.getElementById(`${modalId}-form`);
    form.reset();
    form.querySelector('input[name="id"]').value = '';
    document.getElementById(`${modalId}-title`).textContent = 'Nuevo Repuesto';

    if (data.id) { // Editing
        document.getElementById(`${modalId}-title`).textContent = 'Editar Repuesto';
        const response = await fetch(`${API_URL}/inventory/${data.id}`);
        const result = await response.json();
        Object.entries(result.data).forEach(([key, value]) => {
            if (form.elements[key]) form.elements[key].value = value;
        });
        form.elements.id.value = data.id;
        document.getElementById('inventory-modal-title').innerText = 'Editar Repuesto';
    }
    
    document.getElementById(modalId).classList.add('flex');
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('flex');
    document.getElementById(modalId).style.display = 'none';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    const id = form.elements.id.value;
    const body = Object.fromEntries(new FormData(form));
    delete body.id;

    const url = id ? `${API_URL}/inventory/${id}` : `${API_URL}/inventory`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('API request failed');
        
        closeModal('inventory-modal');
        fetchInventory();

    } catch (error) {
        console.error('Form submission error:', error);
    }
}

async function deleteItem(resource, id, callback) {
    if (!confirm('¿Seguro que quieres eliminar este elemento?')) return;
    try {
        await fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' });
        callback();
    } catch (error) {
        console.error(`Error deleting ${resource}:`, error);
    }
} 