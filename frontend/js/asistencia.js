// ===================================================================
// MÓDULO DE ASISTENCIA - asistencia.js
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // CRÍTICO: Protección de autenticación
    if (!window.authManager.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // ===================================================================
    // STATE MANAGEMENT
    // ===================================================================
    const state = {
        currentUser: null,
        attendances: [],
        schedules: [],
        overtime: [],
        leaveRequests: [],
        todayAttendance: null,
        currentSchedule: null,
        summary: null,
        stats: null,
        activeTab: 'attendance',
        filters: {
            dateFrom: null,
            dateTo: null
        }
    };

    // ===================================================================
    // API FUNCTIONS
    // ===================================================================
    const api = {
        // Asistencia
        getTodayAttendance: async () => {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/attendance/today`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data;
            } catch (error) {
                console.error('❌ Error obteniendo asistencia de hoy:', error);
                throw error;
            }
        },

        getAttendances: async (filters = {}) => {
            try {
                const params = new URLSearchParams();
                if (filters.user_id) params.append('user_id', filters.user_id);
                if (filters.date_from) params.append('date_from', filters.date_from);
                if (filters.date_to) params.append('date_to', filters.date_to);
                
                const response = await window.authenticatedFetch(`${window.API_URL}/attendance?${params}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('❌ Error obteniendo asistencias:', error);
                throw error;
            }
        },

        checkIn: async (data) => {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/attendance/check-in`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al marcar entrada');
                }
                return await response.json();
            } catch (error) {
                console.error('❌ Error en check-in:', error);
                throw error;
            }
        },

        checkOut: async (data) => {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/attendance/check-out`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al marcar salida');
                }
                return await response.json();
            } catch (error) {
                console.error('❌ Error en check-out:', error);
                throw error;
            }
        },

        getSummary: async (userId, month, year) => {
            try {
                const params = new URLSearchParams();
                if (month) params.append('month', month);
                if (year) params.append('year', year);
                
                const response = await window.authenticatedFetch(`${window.API_URL}/attendance/summary/${userId}?${params}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data;
            } catch (error) {
                console.error('❌ Error obteniendo resumen:', error);
                throw error;
            }
        },

        // Horarios
        getActiveSchedule: async (userId) => {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/employee-schedules/${userId}/active`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data;
            } catch (error) {
                console.error('❌ Error obteniendo horario activo:', error);
                return null;
            }
        },

        getWorkSchedules: async () => {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/work-schedules`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('❌ Error obteniendo horarios:', error);
                throw error;
            }
        },

        // Horas Extras
        getOvertime: async (filters = {}) => {
            try {
                const params = new URLSearchParams();
                if (filters.user_id) params.append('user_id', filters.user_id);
                if (filters.status) params.append('status', filters.status);
                
                const response = await window.authenticatedFetch(`${window.API_URL}/overtime?${params}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('❌ Error obteniendo horas extras:', error);
                throw error;
            }
        },

        createOvertime: async (data) => {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/overtime`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al registrar horas extras');
                }
                return await response.json();
            } catch (error) {
                console.error('❌ Error creando horas extras:', error);
                throw error;
            }
        },

        // Permisos
        getLeaveRequests: async (filters = {}) => {
            try {
                const params = new URLSearchParams();
                if (filters.user_id) params.append('user_id', filters.user_id);
                if (filters.status) params.append('status', filters.status);
                
                const response = await window.authenticatedFetch(`${window.API_URL}/leave-requests?${params}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('❌ Error obteniendo solicitudes:', error);
                throw error;
            }
        },

        createLeaveRequest: async (data) => {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/leave-requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Error al crear solicitud');
                }
                return await response.json();
            } catch (error) {
                console.error('❌ Error creando solicitud:', error);
                throw error;
            }
        },

        // Estadísticas (Admin)
        getStats: async () => {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/attendance/stats`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data;
            } catch (error) {
                console.error('❌ Error obteniendo estadísticas:', error);
                throw error;
            }
        }
    };

    // ===================================================================
    // UI FUNCTIONS
    // ===================================================================
    const ui = {
        showLoading: (message = 'Cargando...') => {
            console.log('🔄', message);
        },

        hideLoading: () => {
            console.log('✅ Carga completada');
        },

        showSuccess: (message) => {
            alert(message);
            console.log('✅', message);
        },

        showError: (message) => {
            alert(message);
            console.error('❌', message);
        },

        updateClock: () => {
            const now = new Date();
            const timeElement = document.getElementById('current-time');
            const dateElement = document.getElementById('current-date');
            
            if (timeElement) {
                timeElement.textContent = now.toLocaleTimeString('es-CL', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                });
            }
            
            if (dateElement) {
                dateElement.textContent = now.toLocaleDateString('es-CL', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }
        },

        updateClockCard: (todayAttendance, schedule) => {
            const statusDiv = document.getElementById('current-status');
            const workedHoursDiv = document.getElementById('worked-hours-display');
            const checkInBtn = document.getElementById('check-in-btn');
            const checkOutBtn = document.getElementById('check-out-btn');
            const scheduleInfo = document.getElementById('schedule-info');

            if (todayAttendance) {
                if (todayAttendance.check_in_time && !todayAttendance.check_out_time) {
                    // Trabajando
                    statusDiv.innerHTML = '<span class="status-badge status-present working-badge">Trabajando Ahora</span>';
                    checkInBtn.disabled = true;
                    checkOutBtn.disabled = false;
                    
                    // Calcular horas trabajadas en tiempo real
                    const checkIn = new Date(todayAttendance.check_in_time);
                    const updateWorkedHours = () => {
                        const now = new Date();
                        const hours = ((now - checkIn) / (1000 * 60 * 60)).toFixed(2);
                        workedHoursDiv.textContent = `Horas trabajadas hoy: ${hours}`;
                    };
                    updateWorkedHours();
                    setInterval(updateWorkedHours, 60000); // Actualizar cada minuto
                    
                } else if (todayAttendance.check_out_time) {
                    // Ya salió
                    statusDiv.innerHTML = '<span class="status-badge status-approved">Jornada Completada</span>';
                    checkInBtn.disabled = true;
                    checkOutBtn.disabled = true;
                    workedHoursDiv.textContent = `Horas trabajadas hoy: ${todayAttendance.worked_hours || 0}`;
                }
            } else {
                // No ha marcado entrada
                statusDiv.innerHTML = '<span class="status-badge status-pending">Sin marcar entrada</span>';
                checkInBtn.disabled = false;
                checkOutBtn.disabled = true;
                workedHoursDiv.textContent = '';
            }

            // Mostrar información del horario
            if (schedule) {
                const today = new Date().getDay();
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const dayName = days[today];
                const enabled = schedule[`${dayName}_enabled`];
                const start = schedule[`${dayName}_start`];
                const end = schedule[`${dayName}_end`];
                
                if (enabled) {
                    scheduleInfo.textContent = `Tu horario hoy: ${start} - ${end}`;
                } else {
                    scheduleInfo.textContent = 'No tienes horario asignado para hoy';
                }
            } else {
                scheduleInfo.textContent = 'No tienes horario asignado';
            }
        },

        renderAttendanceTable: (attendances) => {
            const tbody = document.getElementById('attendance-table-body');
            if (!tbody) return;

            if (attendances.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No hay registros de asistencia</td></tr>';
                return;
            }

            tbody.innerHTML = attendances.map(att => {
                const date = new Date(att.date).toLocaleDateString('es-CL');
                const checkIn = att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-';
                const checkOut = att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-';
                const hours = att.worked_hours ? `${att.worked_hours}h` : '-';
                
                let statusBadge = '';
                if (att.status === 'present') statusBadge = '<span class="status-badge status-present">Presente</span>';
                else if (att.status === 'late') statusBadge = '<span class="status-badge status-late">Tarde</span>';
                else if (att.status === 'absent') statusBadge = '<span class="status-badge status-absent">Ausente</span>';
                
                const lateInfo = att.is_late ? `${att.late_minutes} min` : '-';
                
                return `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap">${date}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${checkIn}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${checkOut}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${hours}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${lateInfo}</td>
                    </tr>
                `;
            }).join('');
        },

        renderSummary: (summary) => {
            if (!summary) return;
            
            document.getElementById('summary-present').textContent = summary.present_days || 0;
            document.getElementById('summary-absent').textContent = summary.absent_days || 0;
            document.getElementById('summary-late').textContent = summary.late_days || 0;
            document.getElementById('summary-hours').textContent = summary.total_worked_hours ? `${summary.total_worked_hours}h` : '0h';
        },

        renderScheduleDetails: (schedule) => {
            const container = document.getElementById('schedule-details');
            if (!container) return;

            if (!schedule) {
                container.innerHTML = '<p class="text-gray-500">No tienes un horario asignado actualmente.</p>';
                return;
            }

            const days = [
                { key: 'monday', name: 'Lunes' },
                { key: 'tuesday', name: 'Martes' },
                { key: 'wednesday', name: 'Miércoles' },
                { key: 'thursday', name: 'Jueves' },
                { key: 'friday', name: 'Viernes' },
                { key: 'saturday', name: 'Sábado' },
                { key: 'sunday', name: 'Domingo' }
            ];

            let html = `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">${schedule.name}</h3>
                    <p class="text-gray-600">${schedule.description || ''}</p>
                    <p class="text-sm text-gray-500 mt-2">Horas semanales: ${schedule.weekly_hours || 0}h</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            `;

            days.forEach(day => {
                const enabled = schedule[`${day.key}_enabled`];
                const start = schedule[`${day.key}_start`];
                const end = schedule[`${day.key}_end`];
                const breakDuration = schedule[`${day.key}_break_duration`];

                html += `
                    <div class="border border-gray-200 rounded-lg p-4 ${enabled ? 'bg-blue-50' : 'bg-gray-50'}">
                        <div class="font-semibold text-gray-900">${day.name}</div>
                        ${enabled ? `
                            <div class="text-sm text-gray-700 mt-2">
                                <i class="fas fa-clock mr-2"></i>${start} - ${end}
                            </div>
                            ${breakDuration > 0 ? `<div class="text-xs text-gray-500 mt-1">Descanso: ${breakDuration} min</div>` : ''}
                        ` : '<div class="text-sm text-gray-500 mt-2">Día libre</div>'}
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
        },

        renderOvertimeTable: (overtimeRecords) => {
            const tbody = document.getElementById('overtime-table-body');
            if (!tbody) return;

            if (overtimeRecords.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No hay registros de horas extras</td></tr>';
                return;
            }

            tbody.innerHTML = overtimeRecords.map(ot => {
                const date = new Date(ot.date).toLocaleDateString('es-CL');
                const schedule = `${ot.start_time} - ${ot.end_time}`;
                const typeLabels = {
                    regular: 'Regular',
                    night: 'Nocturno',
                    holiday: 'Festivo',
                    sunday: 'Domingo'
                };
                
                let statusBadge = '';
                if (ot.status === 'approved') statusBadge = '<span class="status-badge status-approved">Aprobado</span>';
                else if (ot.status === 'pending') statusBadge = '<span class="status-badge status-pending">Pendiente</span>';
                else if (ot.status === 'rejected') statusBadge = '<span class="status-badge status-rejected">Rechazado</span>';
                
                return `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap">${date}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${schedule}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${ot.hours}h (x${ot.multiplier})</td>
                        <td class="px-6 py-4 whitespace-nowrap">${typeLabels[ot.type] || ot.type}</td>
                        <td class="px-6 py-4 whitespace-nowrap">$${parseFloat(ot.total_amount || 0).toLocaleString('es-CL')}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                    </tr>
                `;
            }).join('');
        },

        renderLeaveTable: (leaveRequests) => {
            const tbody = document.getElementById('leave-table-body');
            if (!tbody) return;

            if (leaveRequests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No hay solicitudes de permiso</td></tr>';
                return;
            }

            tbody.innerHTML = leaveRequests.map(leave => {
                const typeLabels = {
                    vacation: 'Vacaciones',
                    sick: 'Licencia médica',
                    personal: 'Personal',
                    unpaid: 'Sin goce de sueldo'
                };
                
                let statusBadge = '';
                if (leave.status === 'approved') statusBadge = '<span class="status-badge status-approved">Aprobado</span>';
                else if (leave.status === 'pending') statusBadge = '<span class="status-badge status-pending">Pendiente</span>';
                else if (leave.status === 'rejected') statusBadge = '<span class="status-badge status-rejected">Rechazado</span>';
                
                return `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap">${typeLabels[leave.type] || leave.type}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${new Date(leave.start_date).toLocaleDateString('es-CL')}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${new Date(leave.end_date).toLocaleDateString('es-CL')}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${leave.days_requested}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                        <td class="px-6 py-4">${leave.reason || '-'}</td>
                    </tr>
                `;
            }).join('');
        }
    };

    // ===================================================================
    // EVENT HANDLERS
    // ===================================================================
    const handlers = {
        handleCheckIn: async () => {
            try {
                const location = 'Web';
                const notes = '';
                
                const result = await api.checkIn({ location, notes });
                ui.showSuccess(result.message);
                
                // Recargar datos
                await loadTodayAttendance();
                await loadAttendances();
            } catch (error) {
                ui.showError(error.message);
            }
        },

        handleCheckOut: async () => {
            try {
                const location = 'Web';
                const notes = '';
                
                const result = await api.checkOut({ location, notes });
                ui.showSuccess(result.message);
                
                // Recargar datos
                await loadTodayAttendance();
                await loadAttendances();
            } catch (error) {
                ui.showError(error.message);
            }
        },

        handleTabClick: (tabName) => {
            state.activeTab = tabName;
            
            // Actualizar UI de tabs
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('tab-active');
            });
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('tab-active');
            
            // Mostrar/ocultar contenido
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.add('hidden');
            });
            document.getElementById(`${tabName}-tab`).classList.remove('hidden');
            
            // Cargar datos según tab
            if (tabName === 'schedule') {
                ui.renderScheduleDetails(state.currentSchedule);
            } else if (tabName === 'overtime') {
                loadOvertime();
            } else if (tabName === 'leave') {
                loadLeaveRequests();
            } else if (tabName === 'management') {
                loadManagementData();
            }
        },

        handleFilterAttendance: async () => {
            const dateFrom = document.getElementById('filter-date-from').value;
            const dateTo = document.getElementById('filter-date-to').value;
            
            state.filters.dateFrom = dateFrom;
            state.filters.dateTo = dateTo;
            
            await loadAttendances();
        },

        handleRequestOvertime: () => {
            const html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                        <input type="date" id="overtime-date" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                            <input type="time" id="overtime-start" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                            <input type="time" id="overtime-end" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                        <select id="overtime-type" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                            <option value="regular">Regular (x1.5)</option>
                            <option value="night">Nocturno (x2.0)</option>
                            <option value="holiday">Festivo (x2.0)</option>
                            <option value="sunday">Domingo (x1.8)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tarifa por hora ($)</label>
                        <input type="number" id="overtime-rate" class="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="5000">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea id="overtime-description" class="w-full border border-gray-300 rounded-lg px-3 py-2" rows="3"></textarea>
                    </div>
                </div>
            `;
            
            if (window.showModal) {
                window.showModal('Registrar Horas Extras', html, async () => {
                    const data = {
                        user_id: state.currentUser.id,
                        date: document.getElementById('overtime-date').value,
                        start_time: document.getElementById('overtime-start').value,
                        end_time: document.getElementById('overtime-end').value,
                        type: document.getElementById('overtime-type').value,
                        hourly_rate: document.getElementById('overtime-rate').value,
                        description: document.getElementById('overtime-description').value
                    };
                    
                    try {
                        await api.createOvertime(data);
                        ui.showSuccess('Horas extras registradas correctamente');
                        await loadOvertime();
                    } catch (error) {
                        ui.showError(error.message);
                    }
                });
            } else {
                ui.showError('Sistema de modales no disponible');
            }
        },

        handleRequestLeave: () => {
            const html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Permiso</label>
                        <select id="leave-type" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                            <option value="vacation">Vacaciones</option>
                            <option value="sick">Licencia médica</option>
                            <option value="personal">Personal</option>
                            <option value="unpaid">Sin goce de sueldo</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                            <input type="date" id="leave-start" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                            <input type="date" id="leave-end" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Días Solicitados</label>
                        <input type="number" id="leave-days" class="w-full border border-gray-300 rounded-lg px-3 py-2" min="1" value="1">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                        <textarea id="leave-reason" class="w-full border border-gray-300 rounded-lg px-3 py-2" rows="3" required></textarea>
                    </div>
                </div>
            `;
            
            if (window.showModal) {
                window.showModal('Nueva Solicitud de Permiso', html, async () => {
                    const data = {
                        type: document.getElementById('leave-type').value,
                        start_date: document.getElementById('leave-start').value,
                        end_date: document.getElementById('leave-end').value,
                        days_requested: document.getElementById('leave-days').value,
                        reason: document.getElementById('leave-reason').value
                    };
                    
                    try {
                        await api.createLeaveRequest(data);
                        ui.showSuccess('Solicitud creada correctamente');
                        await loadLeaveRequests();
                    } catch (error) {
                        ui.showError(error.message);
                    }
                });
            } else {
                ui.showError('Sistema de modales no disponible');
            }
        }
    };

    // ===================================================================
    // DATA LOADING
    // ===================================================================
    async function loadTodayAttendance() {
        try {
            state.todayAttendance = await api.getTodayAttendance();
            ui.updateClockCard(state.todayAttendance, state.currentSchedule);
        } catch (error) {
            console.error('Error cargando asistencia de hoy:', error);
        }
    }

    async function loadAttendances() {
        try {
            const filters = {
                user_id: state.currentUser.id,
                date_from: state.filters.dateFrom,
                date_to: state.filters.dateTo
            };
            
            state.attendances = await api.getAttendances(filters);
            ui.renderAttendanceTable(state.attendances);
            
            // Cargar resumen
            const now = new Date();
            state.summary = await api.getSummary(
                state.currentUser.id,
                String(now.getMonth() + 1).padStart(2, '0'),
                String(now.getFullYear())
            );
            ui.renderSummary(state.summary);
        } catch (error) {
            console.error('Error cargando asistencias:', error);
        }
    }

    async function loadSchedule() {
        try {
            state.currentSchedule = await api.getActiveSchedule(state.currentUser.id);
            ui.updateClockCard(state.todayAttendance, state.currentSchedule);
        } catch (error) {
            console.error('Error cargando horario:', error);
        }
    }

    async function loadOvertime() {
        try {
            state.overtime = await api.getOvertime({ user_id: state.currentUser.id });
            ui.renderOvertimeTable(state.overtime);
        } catch (error) {
            console.error('Error cargando horas extras:', error);
        }
    }

    async function loadLeaveRequests() {
        try {
            state.leaveRequests = await api.getLeaveRequests({ user_id: state.currentUser.id });
            ui.renderLeaveTable(state.leaveRequests);
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
        }
    }

    async function loadManagementData() {
        try {
            // Solo para admin/manager
            if (!['Admin', 'Manager'].includes(state.currentUser.role)) return;
            
            state.stats = await api.getStats();
            // Renderizar estadísticas...
        } catch (error) {
            console.error('Error cargando datos de gestión:', error);
        }
    }

    // ===================================================================
    // SETUP EVENT LISTENERS
    // ===================================================================
    function setupEventListeners() {
        // Botones de marcación
        const checkInBtn = document.getElementById('check-in-btn');
        const checkOutBtn = document.getElementById('check-out-btn');
        
        if (checkInBtn) checkInBtn.addEventListener('click', handlers.handleCheckIn);
        if (checkOutBtn) checkOutBtn.addEventListener('click', handlers.handleCheckOut);
        
        // Tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', () => {
                handlers.handleTabClick(btn.dataset.tab);
            });
        });
        
        // Filtros
        const filterBtn = document.getElementById('filter-attendance-btn');
        if (filterBtn) filterBtn.addEventListener('click', handlers.handleFilterAttendance);
        
        // Botones de acciones
        const overtimeBtn = document.getElementById('request-overtime-btn');
        if (overtimeBtn) overtimeBtn.addEventListener('click', handlers.handleRequestOvertime);
        
        const leaveBtn = document.getElementById('request-leave-btn');
        if (leaveBtn) leaveBtn.addEventListener('click', handlers.handleRequestLeave);
        
        // Actualizar reloj cada segundo
        setInterval(ui.updateClock, 1000);
    }

    // ===================================================================
    // INITIALIZATION
    // ===================================================================
    async function init() {
        try {
            console.log('🚀 Inicializando módulo de asistencia...');
            ui.showLoading('Cargando datos...');
            
            // Obtener usuario actual
            state.currentUser = window.authManager.getUser();
            
            // Mostrar tab de gestión si es admin/manager
            if (['Admin', 'Manager'].includes(state.currentUser.role)) {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = '';
                });
            }
            
            // Iniciar reloj
            ui.updateClock();
            
            // Cargar datos iniciales
            await Promise.all([
                loadSchedule(),
                loadTodayAttendance(),
                loadAttendances()
            ]);
            
            // Setup event listeners
            setupEventListeners();
            
            console.log('✅ Módulo de asistencia inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando módulo de asistencia:', error);
            ui.showError('Error al cargar el módulo de asistencia');
        } finally {
            ui.hideLoading();
        }
    }

    // Iniciar
    init();
});
