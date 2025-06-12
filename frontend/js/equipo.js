document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const backButton = document.querySelector('header a');

    const state = {
        equipment: null,
        tickets: [],
        notes: []
    };

    const api = {
        getEquipment: id => fetch(`${API_URL}/equipment/${id}`).then(res => res.json()),
        getEquipmentTickets: id => fetch(`${API_URL}/equipment/${id}/tickets`).then(res => res.json()),
        getEquipmentNotes: id => fetch(`${API_URL}/equipment/${id}/notes`).then(res => res.json()),
        addEquipmentNote: (id, note) => fetch(`${API_URL}/equipment/${id}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note })
        }).then(res => res.json()),
        deleteEquipmentNote: (noteId) => fetch(`${API_URL}/equipment/notes/${noteId}`, {
            method: 'DELETE'
        }).then(res => res.json())
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
                        <div class="flex justify-between items-center border-b pb-2 mb-4">
                            <h2 class="text-xl font-bold text-gray-800">Notas del Equipo</h2>
                            <button id="add-note-btn" class="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 flex items-center gap-2">
                                <i data-lucide="plus" class="h-4 w-4"></i> Agregar Nota
                            </button>
                        </div>
                        
                        <!-- Formulario para nueva nota (inicialmente oculto) -->
                        <div id="note-form" class="hidden mb-4 p-4 bg-gray-50 rounded-lg border">
                            <textarea id="note-textarea" placeholder="Escribe tu nota aquí..." class="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows="4"></textarea>
                            <div class="flex justify-end gap-2 mt-3">
                                <button id="cancel-note-btn" class="px-3 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600">Cancelar</button>
                                <button id="save-note-btn" class="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">Guardar Nota</button>
                            </div>
                        </div>
                        
                        <!-- Lista de notas -->
                        <div id="notes-container">
                            <!-- Las notas se cargarán aquí -->
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
            
            // Cargar y renderizar notas
            render.notes();
        },
        
        notes: () => {
            const notesContainer = document.getElementById('notes-container');
            if (!notesContainer) return;
            
            if (state.notes.length === 0) {
                notesContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No hay notas para este equipo.</p>';
                return;
            }
            
            const notesHtml = state.notes.map(note => {
                const date = new Date(note.created_at).toLocaleString('es-CL');
                return `
                    <div class="border-l-4 border-blue-500 pl-4 py-3 mb-3 bg-gray-50 rounded-r-lg group">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex flex-col">
                                <span class="text-xs text-gray-500 font-medium">${date}</span>
                                <span class="text-xs text-gray-400">Por: ${note.author || 'Sistema'}</span>
                            </div>
                            <button class="delete-note-btn opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 text-xs p-1" data-note-id="${note.id}" title="Eliminar nota">
                                <i data-lucide="trash-2" class="h-3 w-3"></i>
                            </button>
                        </div>
                        <p class="text-gray-800 text-sm leading-relaxed">${note.note.replace(/\n/g, '<br>')}</p>
                    </div>
                `;
            }).join('');
            
            notesContainer.innerHTML = notesHtml;
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
                const [equipmentData, ticketsData, notesData] = await Promise.all([
                    api.getEquipment(equipmentId),
                    api.getEquipmentTickets(equipmentId),
                    api.getEquipmentNotes(equipmentId)
                ]);
                console.log('Datos cargados:', { equipmentData, ticketsData, notesData });
                state.equipment = equipmentData;
                state.tickets = ticketsData;
                state.notes = notesData;
                render.all();
                
            } catch (error) {
                console.error('Error al cargar los datos del equipo:', error);
                mainContent.innerHTML = `<div class="text-center text-red-500">Error al cargar la información. ${error.message}</div>`;
            }
        },
        
        saveNote: async () => {
            const textarea = document.getElementById('note-textarea');
            const noteText = textarea.value.trim();
            
            if (!noteText) {
                alert('Por favor, escribe una nota antes de guardar.');
                return;
            }
            
            try {
                console.log('Guardando nota...');
                const saveBtn = document.getElementById('save-note-btn');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Guardando...';
                
                await api.addEquipmentNote(state.equipment.id, noteText);
                
                // Recargar las notas
                state.notes = await api.getEquipmentNotes(state.equipment.id);
                render.notes();
                
                // Limpiar y ocultar formulario
                const noteForm = document.getElementById('note-form');
                textarea.value = '';
                noteForm.classList.add('hidden');
                
                console.log('Nota guardada exitosamente');
                
            } catch (error) {
                console.error('Error al guardar la nota:', error);
                alert('Error al guardar la nota. Por favor, inténtalo de nuevo.');
            } finally {
                const saveBtn = document.getElementById('save-note-btn');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Nota';
            }
        },
        
        deleteNote: async (noteId) => {
            if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
                return;
            }
            
            try {
                console.log('Eliminando nota...');
                await api.deleteEquipmentNote(noteId);
                
                // Recargar las notas
                state.notes = await api.getEquipmentNotes(state.equipment.id);
                render.notes();
                
                console.log('Nota eliminada exitosamente');
                
            } catch (error) {
                console.error('Error al eliminar la nota:', error);
                alert('Error al eliminar la nota. Por favor, inténtalo de nuevo.');
            }
        }
    };

    const events = {
        setup: () => {
            document.body.addEventListener('click', e => {
                // Manejar impresión de QR
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
                
                // Manejar botón "Agregar Nota"
                if (e.target.matches('#add-note-btn')) {
                    e.preventDefault();
                    const noteForm = document.getElementById('note-form');
                    const textarea = document.getElementById('note-textarea');
                    noteForm.classList.remove('hidden');
                    textarea.focus();
                }
                
                // Manejar botón "Cancelar"
                if (e.target.matches('#cancel-note-btn')) {
                    e.preventDefault();
                    const noteForm = document.getElementById('note-form');
                    const textarea = document.getElementById('note-textarea');
                    noteForm.classList.add('hidden');
                    textarea.value = '';
                }
                
                // Manejar botón "Guardar Nota"
                if (e.target.matches('#save-note-btn')) {
                    e.preventDefault();
                    actions.saveNote();
                }
                
                // Manejar botón "Eliminar Nota"
                if (e.target.matches('.delete-note-btn, .delete-note-btn *')) {
                    e.preventDefault();
                    const button = e.target.closest('.delete-note-btn');
                    const noteId = button.getAttribute('data-note-id');
                    actions.deleteNote(noteId);
                }
            });
        }
    };

    actions.init();
    events.setup();
    lucide.createIcons();
}); 