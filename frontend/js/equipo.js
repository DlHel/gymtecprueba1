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
                <div class="max-w-6xl mx-auto space-y-6">
                    <!-- Tarjeta de detalles e identificador -->
                    <div class="bg-white p-6 rounded-lg shadow-sm">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <!-- Información General -->
                            <div class="lg:col-span-2">
                                <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Información General</h2>
                                <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <dt class="font-medium text-gray-500">Tipo</dt><dd class="text-gray-900">${equipment.type}</dd>
                                    <dt class="font-medium text-gray-500">Marca</dt><dd class="text-gray-900">${equipment.brand || 'N/A'}</dd>
                                    <dt class="font-medium text-gray-500">Modelo</dt><dd class="text-gray-900">${equipment.model || 'N/A'}</dd>
                                    <dt class="font-medium text-gray-500">Nº Serie</dt><dd class="text-gray-900 font-mono text-xs">${equipment.serial_number || 'N/A'}</dd>
                                    <dt class="font-medium text-gray-500">Fecha Adquisición</dt><dd class="text-gray-900">${formatDate(equipment.acquisition_date)}</dd>
                                    <dt class="font-medium text-gray-500">Última Mantención</dt><dd class="text-gray-900">${formatDate(equipment.last_maintenance_date)}</dd>
                                </dl>
                            </div>
                            
                            <!-- Identificador Único -->
                            <div class="lg:col-span-1 text-center lg:border-l lg:pl-6">
                                <h3 class="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Identificador Único</h3>
                                <div id="qrcode" class="inline-block p-2 border rounded-lg bg-white mb-3">
                                    <!-- El código QR se generará aquí -->
                                </div>
                                <p class="font-mono text-sm font-bold tracking-wider text-gray-700 mb-3">${equipment.custom_id}</p>
                                <button id="print-qr-btn" class="px-3 py-2 bg-slate-600 text-white text-xs font-semibold rounded-md hover:bg-slate-700 flex items-center gap-2 mx-auto">
                                    <i data-lucide="printer" class="h-3 w-3"></i> Imprimir QR
                                </button>
                            </div>
                        </div>
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
                console.log('Generando código QR...');
                const qrContainer = document.getElementById('qrcode');
                if (!qrContainer) {
                    console.error('No se encontró el contenedor del QR');
                    return;
                }
                qrContainer.innerHTML = ''; // Limpiar por si acaso
                const qrUrl = `${window.location.origin}${window.location.pathname}?id=${state.equipment.id}`;
                console.log('URL del QR:', qrUrl);
                
                try {
                    new QRCode(qrContainer, {
                        text: qrUrl,
                        width: 120,
                        height: 120,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                    console.log('QR generado exitosamente');
                } catch (error) {
                    console.error('Error al generar QR:', error);
                    qrContainer.innerHTML = '<p class="text-red-500">Error al generar código QR</p>';
                }
            } else {
                console.warn('No se puede generar QR: equipment o custom_id faltante');
            }
        }
    };

    const actions = {
        init: async () => {
            console.log('Iniciando carga de equipo...');
            const urlParams = new URLSearchParams(window.location.search);
            const equipmentId = urlParams.get('id');
            const clientId = urlParams.get('clientId');
            
            console.log('Parámetros URL:', { equipmentId, clientId });

            // Hacer el botón de volver inteligente
            if (clientId) {
                backButton.href = `clientes.html?openClient=${clientId}`;
            }

            if (!equipmentId) {
                console.error('No se proporcionó ID de equipo');
                mainContent.innerHTML = '<div class="text-center text-red-500">ID de equipo no especificado.</div>';
                return;
            }

            try {
                console.log('Cargando datos del equipo...');
                const [equipmentData, ticketsData] = await Promise.all([
                    api.getEquipment(equipmentId),
                    api.getEquipmentTickets(equipmentId)
                ]);
                console.log('Datos cargados:', { equipmentData, ticketsData });
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
                    e.preventDefault();
                    console.log('Iniciando impresión del QR...');
                    
                    const qrContainer = document.getElementById('qrcode');
                    const canvas = qrContainer.querySelector('canvas');
                    if (!canvas) {
                        alert("El código QR no se ha generado todavía.");
                        return;
                    }

                    const customId = state.equipment.custom_id || 'Equipo sin ID';
                    const equipmentName = `${state.equipment.type} - ${state.equipment.model || state.equipment.name}`;
                    
                    // Crear ventana de impresión
                    const printWindow = window.open('', 'PRINT', 'height=700,width=900');
                    
                    if (!printWindow) {
                        alert('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueada por el navegador.');
                        return;
                    }

                    const qrDataUrl = canvas.toDataURL('image/png');
                    
                    const htmlContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Imprimir QR - ${customId}</title>
                            <style>
                                @media print {
                                    @page { margin: 1cm; }
                                    body { margin: 0; }
                                }
                                body {
                                    font-family: Arial, sans-serif;
                                    text-align: center;
                                    padding: 20px;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: center;
                                    align-items: center;
                                    min-height: 100vh;
                                    margin: 0;
                                }
                                .qr-container {
                                    border: 2px solid #000;
                                    padding: 20px;
                                    background: white;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                }
                                h1 {
                                    font-size: 24px;
                                    margin: 0 0 10px 0;
                                    color: #333;
                                }
                                h2 {
                                    font-size: 18px;
                                    margin: 0 0 20px 0;
                                    color: #666;
                                    font-weight: normal;
                                }
                                .qr-image {
                                    width: 300px;
                                    height: 300px;
                                    margin: 20px 0;
                                }
                                .custom-id {
                                    font-family: 'Courier New', monospace;
                                    font-size: 20px;
                                    font-weight: bold;
                                    margin-top: 15px;
                                    letter-spacing: 2px;
                                }
                                .print-info {
                                    margin-top: 30px;
                                    font-size: 12px;
                                    color: #888;
                                }
                                @media screen {
                                    .no-print {
                                        margin-top: 30px;
                                    }
                                    button {
                                        padding: 10px 20px;
                                        margin: 0 10px;
                                        font-size: 16px;
                                        border: none;
                                        border-radius: 5px;
                                        cursor: pointer;
                                    }
                                    .print-btn {
                                        background: #007bff;
                                        color: white;
                                    }
                                    .close-btn {
                                        background: #6c757d;
                                        color: white;
                                    }
                                }
                                @media print {
                                    .no-print { display: none; }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="qr-container">
                                <h1>${customId}</h1>
                                <h2>${equipmentName}</h2>
                                <img src="${qrDataUrl}" alt="Código QR" class="qr-image">
                                <div class="custom-id">${customId}</div>
                                <div class="print-info">
                                    Gymtec ERP - ${new Date().toLocaleDateString('es-CL')}
                                </div>
                            </div>
                            <div class="no-print">
                                <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                                <button class="close-btn" onclick="window.close()">❌ Cerrar</button>
                            </div>
                        </body>
                        </html>
                    `;

                    printWindow.document.write(htmlContent);
                    printWindow.document.close();
                    
                    // Esperar a que la ventana cargue completamente
                    printWindow.onload = function() {
                        console.log('Ventana de impresión cargada');
                        printWindow.focus();
                        
                        // Dar un pequeño delay para asegurar que todo esté renderizado
                        setTimeout(() => {
                            printWindow.print();
                        }, 500);
                    };
                    
                    console.log('Ventana de impresión creada');
                }
            });
        }
    };

    actions.init();
    events.setup();
    lucide.createIcons();
}); 