document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const backButton = document.querySelector('header a');

    const state = {
        equipment: null,
        tickets: []
    };

    const api = {
        getEquipment: id => fetch(`${API_URL}/equipment/${id}`).then(res => res.json()),
        getEquipmentTickets: id => fetch(`${API_URL}/equipment/${id}/tickets`).then(res => res.json())
    };

    const render = {
        all: () => {
            const { equipment, tickets } = state;
            if (!equipment) {
                mainContent.innerHTML = '<div class="text-center text-red-500">No se pudo cargar la información del equipo.</div>';
                return;
            }

            pageTitle.textContent = `${equipment.type} - ${equipment.model || equipment.name}`;

            const formatDate = (dateString) => {
                return dateString ? new Date(dateString).toLocaleDateString('es-CL') : 'N/A';
            };
            
            const ticketsHtml = tickets.length > 0 ? tickets.map(t => `
                <li class="border-b py-2">
                    <p class="font-semibold">${t.title}</p>
                    <p class="text-sm">${t.description}</p>
                    <div class="text-xs text-gray-500 mt-1">
                        <span>${formatDate(t.created_at)}</span> | 
                        <span>Estado: ${t.status}</span> | 
                        <span>Prioridad: ${t.priority}</span>
                    </div>
                </li>
            `).join('') : '<li class="text-sm text-gray-500">No hay tickets para este equipo.</li>';

            mainContent.innerHTML = `
                <div class="max-w-4xl mx-auto space-y-6">
                    <!-- Tarjeta de detalles -->
                    <div class="bg-white p-6 rounded-lg shadow-sm">
                        <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Información General</h2>
                        <dl class="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                            <dt class="font-medium text-gray-500">Tipo</dt><dd class="md:col-span-2 text-gray-900">${equipment.type}</dd>
                            <dt class="font-medium text-gray-500">Marca</dt><dd class="md:col-span-2 text-gray-900">${equipment.brand || 'N/A'}</dd>
                            <dt class="font-medium text-gray-500">Modelo</dt><dd class="md:col-span-2 text-gray-900">${equipment.model || 'N/A'}</dd>
                            <dt class="font-medium text-gray-500">Nº Serie</dt><dd class="md:col-span-2 text-gray-900 font-mono">${equipment.serial_number || 'N/A'}</dd>
                            <dt class="font-medium text-gray-500">Fecha Adquisición</dt><dd class="md:col-span-2 text-gray-900">${formatDate(equipment.acquisition_date)}</dd>
                            <dt class="font-medium text-gray-500">Última Mantención</dt><dd class="md:col-span-2 text-gray-900">${formatDate(equipment.last_maintenance_date)}</dd>
                        </dl>
                    </div>
                    
                    <!-- Tarjeta de QR -->
                    <div class="bg-white p-6 rounded-lg shadow-sm text-center">
                        <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Identificador Único</h2>
                        <div id="qrcode" class="inline-block p-2 border rounded-lg bg-white">
                            <!-- El código QR se generará aquí -->
                        </div>
                        <p class="font-mono text-lg mt-2 tracking-wider">${equipment.custom_id}</p>
                         <button id="print-qr-btn" class="mt-4 px-4 py-2 bg-slate-600 text-white text-sm font-semibold rounded-md hover:bg-slate-700 flex items-center gap-2 mx-auto">
                            <i data-lucide="printer" class="h-4 w-4"></i> Imprimir QR
                        </button>
                    </div>

                    <!-- Tarjeta de Notas -->
                    <div class="bg-white p-6 rounded-lg shadow-sm">
                         <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Notas</h2>
                         <div class="prose prose-sm max-w-none">
                            ${equipment.notes ? equipment.notes.replace(/\n/g, '<br>') : '<p class="text-gray-500">No hay notas para este equipo.</p>'}
                         </div>
                    </div>

                    <!-- Tarjeta de Historial de Tickets -->
                    <div class="bg-white p-6 rounded-lg shadow-sm">
                         <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Historial de Tickets</h2>
                         <ul class="space-y-2">${ticketsHtml}</ul>
                    </div>
                </div>
            `;
            lucide.createIcons();
            
            // Generar QR
            if (state.equipment && state.equipment.custom_id) {
                const qrContainer = document.getElementById('qrcode');
                qrContainer.innerHTML = ''; // Limpiar por si acaso
                const qrUrl = `${window.location.origin}${window.location.pathname}?id=${state.equipment.id}`;
                
                new QRCode(qrContainer, {
                    text: qrUrl,
                    width: 180,
                    height: 180,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            }
        }
    };

    const actions = {
        init: async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const equipmentId = urlParams.get('id');
            const clientId = urlParams.get('clientId');

            // Hacer el botón de volver inteligente
            if (clientId) {
                backButton.href = `clientes.html?openClient=${clientId}`;
            }

            if (!equipmentId) {
                mainContent.innerHTML = '<div class="text-center text-red-500">ID de equipo no especificado.</div>';
                return;
            }

            try {
                const [equipmentData, ticketsData] = await Promise.all([
                    api.getEquipment(equipmentId),
                    api.getEquipmentTickets(equipmentId)
                ]);
                state.equipment = equipmentData;
                state.tickets = ticketsData;
                render.all();
                
            } catch (error) {
                console.error('Error al cargar los datos del equipo:', error);
                mainContent.innerHTML = `<div class="text-center text-red-500">Error al cargar la información. ${error.message}</div>`;
            }
        }
    };

    const events = {
        setup: () => {
            document.body.addEventListener('click', e => {
                if (e.target.matches('#print-qr-btn, #print-qr-btn *')) {
                    const qrContainer = document.getElementById('qrcode');
                    const canvas = qrContainer.querySelector('canvas');
                    if (!canvas) {
                        alert("El código QR no se ha generado todavía.");
                        return;
                    }

                    const customId = state.equipment.custom_id || 'Equipo sin ID';
                    const printWindow = window.open('', 'PRINT', 'height=600,width=800');

                    printWindow.document.write('<html><head><title>Imprimir QR</title>');
                    printWindow.document.write('<style>body{text-align:center;font-family:sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;} h1{font-size:2rem; margin: 0.5em;} img{width:400px!important;height:400px!important;}</style>');
                    printWindow.document.write('</head><body >');
                    printWindow.document.write(`<h1>${customId}</h1>`);
                    printWindow.document.write('<img src="' + canvas.toDataURL() + '">');
                    printWindow.document.write('</body></html>');

                    printWindow.document.close();
                    
                    printWindow.onload = function() {
                        printWindow.focus(); 
                        printWindow.print();
                        printWindow.close();
                    }
                }
            });
        }
    };

    actions.init();
    events.setup();
    lucide.createIcons();
}); 