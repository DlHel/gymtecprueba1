document.addEventListener('DOMContentLoaded', () => {

    const state = {
        ticket: null,
        equipment: [],
        isLoading: true,
        error: null
    };

    const ui = {
        loadingState: document.getElementById('loading-state'),
        errorState: document.getElementById('error-state'),
        errorMessage: document.getElementById('error-message'),
        content: document.getElementById('ticket-detail-content'),
        header: document.getElementById('ticket-header'),
        equipmentContainer: document.getElementById('equipment-list-container'),
    };

    const api = {
        getServiceTicket: async (id) => {
            const response = await authenticatedFetch(`${API_URL}/service-tickets/${id}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        },
        getServiceTicketEquipment: async (id) => {
            const response = await authenticatedFetch(`${API_URL}/service-tickets/${id}/equipment`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        }
    };

    function render() {
        ui.loadingState.classList.toggle('hidden', !state.isLoading);
        ui.errorState.classList.toggle('hidden', !state.error);
        ui.content.classList.toggle('hidden', state.isLoading || state.error);

        if (state.error) {
            ui.errorMessage.textContent = state.error;
            return;
        }

        if (!state.isLoading && state.ticket) {
            renderHeader();
            renderEquipmentTable();
            lucide.createIcons();
        }
    }

    function renderHeader() {
        const ticket = state.ticket;
        ui.header.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h2 class="text-2xl font-bold text-gray-900">${ticket.title} (#${ticket.id})</h2>
                    <p class="mt-1 text-sm text-gray-500">para <span class="font-medium text-gray-700">${ticket.client_name}</span> - <span class="text-gray-600">${ticket.location_name}</span></p>
                </div>
                <span class="text-sm font-medium py-1 px-3 rounded-full bg-blue-100 text-blue-800">${ticket.status}</span>
            </div>
            <div class="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                    <p class="text-gray-500">Prioridad</p>
                    <p class="font-medium text-gray-800">${ticket.priority}</p>
                </div>
                <div>
                    <p class="text-gray-500">Fecha Programada</p>
                    <p class="font-medium text-gray-800">${ticket.scheduled_date ? new Date(ticket.scheduled_date).toLocaleDateString('es-ES') : 'No especificada'}</p>
                </div>
                <div>
                    <p class="text-gray-500">Técnico Asignado</p>
                    <p class="font-medium text-gray-800">${ticket.assigned_technician_name || 'Sin asignar'}</p>
                </div>
            </div>
            <div class="mt-4">
                 <p class="text-gray-500">Descripción</p>
                 <p class="text-gray-800">${ticket.description || 'Sin descripción.'}</p>
            </div>
        `;
    }

    function renderEquipmentTable() {
        if (state.equipment.length === 0) {
            ui.equipmentContainer.innerHTML = '<p class="text-gray-500">No hay equipos asociados a este ticket.</p>';
            return;
        }

        ui.equipmentContainer.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo / Modelo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${state.equipment.map(eq => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900">${eq.equipment_name}</div>
                                <div class="text-sm text-gray-500">ID: ${eq.equipment_custom_id}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">${eq.equipment_type}</div>
                                <div class="text-sm text-gray-500">${eq.equipment_model}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="text-sm font-medium py-1 px-3 rounded-full bg-green-100 text-green-800">${eq.status}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${eq.notes || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async function init() {
        const params = new URLSearchParams(window.location.search);
        const ticketId = params.get('id');

        if (!ticketId) {
            state.isLoading = false;
            state.error = 'No se ha especificado un ID de ticket.';
            render();
            return;
        }

        try {
            const [ticketResponse, equipmentResponse] = await Promise.all([
                api.getServiceTicket(ticketId),
                api.getServiceTicketEquipment(ticketId)
            ]);

            state.ticket = ticketResponse.data;
            state.equipment = equipmentResponse.data;
            state.isLoading = false;
            render();

        } catch (error) {
            console.error('Error al inicializar la página de detalle:', error);
            state.isLoading = false;
            state.error = 'No se pudo cargar la información del ticket. Por favor, inténtalo de nuevo.';
            render();
        }
    }

    // Check for auth and then initialize
    if (window.authManager && window.authManager.isAuthenticated()) {
        init();
    } else {
        window.location.href = '/login.html';
    }
});
