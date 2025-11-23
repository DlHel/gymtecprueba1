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
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/attendance/today`);
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
                
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/attendance?${params}`);
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
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/attendance/check-in`, {
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
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/attendance/check-out`, {
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
                
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/attendance/summary/${userId}?${params}`);
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
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/employee-schedules/${userId}/active`);
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
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/work-schedules`);
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
                
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/overtime?${params}`);
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
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/overtime`, {
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
                
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/leave-requests?${params}`);
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
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/leave-requests`, {
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
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/attendance/stats`);
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
                    // FIX: Parsear correctamente la fecha MySQL (sin 'Z' asume hora local)
                    const checkInTime = todayAttendance.check_in_time.replace(' ', 'T');
                    const checkIn = new Date(checkInTime);
                    
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
                    
                    // FIX: Mostrar horas trabajadas correctamente (viene de BD)
                    const workedHours = parseFloat(todayAttendance.worked_hours) || 0;
                    workedHoursDiv.textContent = `Horas trabajadas hoy: ${workedHours.toFixed(2)}h`;
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
            
            // Actualizar nombre de usuario en header
            const userNameElement = document.getElementById('current-user-name');
            if (userNameElement && state.currentUser) {
                userNameElement.textContent = `${state.currentUser.name} (${state.currentUser.role})`;
            }
            
            // Configurar UI según rol
            const userRole = window.authManager.getUserRole();
            
            // Mostrar tab de gestión si es admin/manager
            if (['Admin', 'Manager'].includes(userRole)) {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = '';
                });
            }
            
            // Si es técnico, ocultar tabs innecesarios (solo mostrar reloj + mis asistencias)
            if (userRole === 'Technician') {
                console.log('👷 Usuario técnico detectado - mostrando vista limitada');
                
                // Ocultar tabs innecesarios
                const tabsToHide = ['schedule', 'overtime', 'leave', 'management'];
                tabsToHide.forEach(tabName => {
                    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
                    if (tabButton) {
                        tabButton.style.display = 'none';
                    }
                });
                
                // Mensaje informativo para técnicos
                const scheduleInfo = document.getElementById('schedule-info');
                if (scheduleInfo) {
                    scheduleInfo.textContent = 'Marca tu entrada y salida usando los botones';
                }
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

    // ===================================================================
    // GESTIÓN ADMINISTRATIVA (SOLO ADMIN/MANAGER)
    // ===================================================================
    
    const adminFunctions = {
        // ============= ESTADÍSTICAS =============
        async loadAdminStats() {
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/attendance/stats/today`);
                if (!response.ok) throw new Error('Error loading stats');
                const result = await response.json();
                
                const stats = result.data || {};
                document.getElementById('stat-present').textContent = stats.present || 0;
                document.getElementById('stat-late').textContent = stats.late || 0;
                document.getElementById('stat-pending').textContent = (stats.pending_overtime || 0) + (stats.pending_leave || 0);
                document.getElementById('stat-overtime').textContent = `${(stats.overtime_hours || 0).toFixed(1)}h`;
            } catch (error) {
                console.error('Error loading admin stats:', error);
            }
        },

        // ============= HORAS EXTRAS =============
        async loadPendingOvertime() {
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/overtime?status=pending`);
                if (!response.ok) throw new Error('Error loading overtime');
                const result = await response.json();
                
                const overtimeList = result.data || [];
                document.getElementById('overtime-count').textContent = overtimeList.length;
                
                const container = document.getElementById('overtime-approvals-list');
                if (overtimeList.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay solicitudes pendientes</p>';
                    return;
                }
                
                container.innerHTML = overtimeList.map(ot => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="font-semibold text-gray-900">${ot.user_name || 'Usuario'}</p>
                                <p class="text-sm text-gray-600">${ot.date} - ${ot.hours_requested || 0}h solicitadas</p>
                            </div>
                            <span class="status-badge status-pending">Pendiente</span>
                        </div>
                        <p class="text-sm text-gray-700 mb-3">${ot.reason || 'Sin motivo'}</p>
                        
                        <!-- Ajuste de horas -->
                        <div class="flex items-center gap-2 mb-3 bg-blue-50 p-2 rounded">
                            <label class="text-sm font-medium text-gray-700">Horas a aprobar:</label>
                            <input type="number" 
                                   id="overtime-hours-${ot.id}" 
                                   value="${ot.hours_requested || 0}" 
                                   step="0.5" 
                                   min="0" 
                                   max="${ot.hours_requested || 0}"
                                   class="w-20 px-2 py-1 border border-gray-300 rounded text-center">
                            <span class="text-xs text-gray-500">de ${ot.hours_requested}h</span>
                        </div>
                        
                        <div class="flex gap-2">
                            <button onclick="window.adminFunctions.approveOvertime(${ot.id})" 
                                    class="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition">
                                <i class="fas fa-check mr-1"></i>Aprobar
                            </button>
                            <button onclick="window.adminFunctions.rejectOvertime(${ot.id})" 
                                    class="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition">
                                <i class="fas fa-times mr-1"></i>Rechazar
                            </button>
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading pending overtime:', error);
            }
        },

        async approveOvertime(overtimeId) {
            try {
                const hoursInput = document.getElementById(`overtime-hours-${overtimeId}`);
                const hoursApproved = parseFloat(hoursInput.value) || 0;
                
                if (hoursApproved <= 0) {
                    alert('Por favor ingrese horas válidas a aprobar');
                    return;
                }
                
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/overtime/${overtimeId}/approve`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hours_approved: hoursApproved })
                });
                
                if (!response.ok) throw new Error('Error approving overtime');
                
                ui.showSuccess(`Horas extras aprobadas: ${hoursApproved}h`);
                this.loadPendingOvertime();
                this.loadAdminStats();
            } catch (error) {
                console.error('Error approving overtime:', error);
                ui.showError('Error al aprobar horas extras');
            }
        },

        async rejectOvertime(overtimeId) {
            if (!confirm('¿Está seguro de rechazar esta solicitud de horas extras?')) return;
            
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/overtime/${overtimeId}/reject`, {
                    method: 'PATCH'
                });
                
                if (!response.ok) throw new Error('Error rejecting overtime');
                
                ui.showSuccess('Solicitud rechazada');
                this.loadPendingOvertime();
                this.loadAdminStats();
            } catch (error) {
                console.error('Error rejecting overtime:', error);
                ui.showError('Error al rechazar solicitud');
            }
        },

        // ============= GESTIÓN DE TURNOS =============
        async loadShifts() {
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/shift-types`);
                if (!response.ok) throw new Error('Error loading shifts');
                const result = await response.json();
                
                const shifts = result.data || [];
                const container = document.getElementById('shifts-list');
                
                if (shifts.length === 0) {
                    container.innerHTML = '<p class="text-gray-500 text-center py-4">No hay turnos configurados</p>';
                    return;
                }
                
                container.innerHTML = shifts.map(shift => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h3 class="font-semibold text-gray-900">${shift.name}</h3>
                                <p class="text-sm text-gray-600 mt-1">
                                    <i class="fas fa-clock mr-1"></i>
                                    ${shift.start_time} - ${shift.end_time}
                                    ${shift.is_overnight ? '<span class="text-orange-600">(Nocturno)</span>' : ''}
                                </p>
                                <p class="text-xs text-gray-500 mt-1">${shift.description || ''}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="window.adminFunctions.editShift(${shift.id})" 
                                        class="text-blue-600 hover:text-blue-800">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="window.adminFunctions.deleteShift(${shift.id})" 
                                        class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error loading shifts:', error);
            }
        },

        async createShift() {
            const modalContent = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del Turno</label>
                        <input type="text" id="shift-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ej: Turno Mañana">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                            <input type="time" id="shift-start" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                            <input type="time" id="shift-end" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                    </div>
                    <div>
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="shift-overnight" class="rounded">
                            <span class="text-sm text-gray-700">Turno nocturno (cruza medianoche)</span>
                        </label>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                        <textarea id="shift-description" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="2"></textarea>
                    </div>
                </div>
            `;
            
            window.showModal('Crear Nuevo Turno', modalContent, async () => {
                const name = document.getElementById('shift-name').value.trim();
                const startTime = document.getElementById('shift-start').value;
                const endTime = document.getElementById('shift-end').value;
                const isOvernight = document.getElementById('shift-overnight').checked;
                const description = document.getElementById('shift-description').value.trim();
                
                if (!name || !startTime || !endTime) {
                    throw new Error('Por favor complete todos los campos requeridos');
                }
                
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/shift-types`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, start_time: startTime, end_time: endTime, is_overnight: isOvernight, description })
                });
                
                if (!response.ok) throw new Error('Error creating shift');
                
                ui.showSuccess('Turno creado exitosamente');
                this.loadShifts();
            });
        },

        async editShift(shiftId) {
            // TODO: Implementar edición de turno
            alert('Función de edición en desarrollo');
        },

        async deleteShift(shiftId) {
            if (!confirm('¿Está seguro de eliminar este turno?')) return;
            
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/shift-types/${shiftId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error('Error deleting shift');
                
                ui.showSuccess('Turno eliminado');
                this.loadShifts();
            } catch (error) {
                console.error('Error deleting shift:', error);
                ui.showError('Error al eliminar turno');
            }
        },

        // ============= PERMISOS =============
        async loadPendingLeave() {
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/leave-requests?status=pending`);
                if (!response.ok) throw new Error('Error loading leave requests');
                const result = await response.json();
                
                const leaveRequests = result.data || [];
                document.getElementById('leave-count').textContent = leaveRequests.length;
                
                const tbody = document.getElementById('leave-approvals-list');
                if (leaveRequests.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">No hay solicitudes pendientes</td></tr>';
                    return;
                }
                
                tbody.innerHTML = leaveRequests.map(leave => `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${leave.user_name || 'Usuario'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${leave.type || 'Permiso'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${leave.start_date} - ${leave.end_date}</td>
                        <td class="px-6 py-4 text-sm text-gray-600">${leave.reason || 'Sin motivo'}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="status-badge status-pending">Pendiente</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="window.adminFunctions.approveLeave(${leave.id})" 
                                    class="text-green-600 hover:text-green-900 mr-3">
                                <i class="fas fa-check"></i> Aprobar
                            </button>
                            <button onclick="window.adminFunctions.rejectLeave(${leave.id})" 
                                    class="text-red-600 hover:text-red-900">
                                <i class="fas fa-times"></i> Rechazar
                            </button>
                        </td>
                    </tr>
                `).join('');
            } catch (error) {
                console.error('Error loading leave requests:', error);
            }
        },

        async approveLeave(leaveId) {
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/leave-requests/${leaveId}/approve`, {
                    method: 'PATCH'
                });
                
                if (!response.ok) throw new Error('Error approving leave');
                
                ui.showSuccess('Permiso aprobado');
                this.loadPendingLeave();
                this.loadAdminStats();
            } catch (error) {
                console.error('Error approving leave:', error);
                ui.showError('Error al aprobar permiso');
            }
        },

        async rejectLeave(leaveId) {
            if (!confirm('¿Está seguro de rechazar esta solicitud de permiso?')) return;
            
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/leave-requests/${leaveId}/reject`, {
                    method: 'PATCH'
                });
                
                if (!response.ok) throw new Error('Error rejecting leave');
                
                ui.showSuccess('Solicitud rechazada');
                this.loadPendingLeave();
                this.loadAdminStats();
            } catch (error) {
                console.error('Error rejecting leave:', error);
                ui.showError('Error al rechazar solicitud');
            }
        },

        // ============= VISTA GLOBAL DE ASISTENCIA (NUEVO) =============
        async loadAllUsersAttendance(filters = {}) {
            try {
                const params = new URLSearchParams();
                if (filters.user_id) params.append('user_id', filters.user_id);
                if (filters.date_from) params.append('date_from', filters.date_from);
                if (filters.date_to) params.append('date_to', filters.date_to);
                if (filters.status) params.append('status', filters.status);
                params.append('limit', filters.limit || 100);

                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/attendance/all?${params.toString()}`);
                if (!response.ok) throw new Error('Error loading global attendance');
                const result = await response.json();

                const attendances = result.data || [];
                const summary = result.summary || {};
                
                // Actualizar resumen
                this.updateGlobalSummary(summary);
                
                // Renderizar tabla
                this.renderGlobalAttendanceTable(attendances);
                
                // Actualizar contador
                document.getElementById('global-attendance-count').textContent = 
                    `Mostrando ${attendances.length} registros`;
                    
                console.log('✅ Cargada asistencia global:', attendances.length, 'registros');
            } catch (error) {
                console.error('Error loading global attendance:', error);
                ui.showError('Error al cargar asistencia global');
            }
        },

        updateGlobalSummary(summary) {
            document.getElementById('global-summary-users').textContent = summary.total_users || 0;
            document.getElementById('global-summary-present').textContent = summary.present_count || 0;
            document.getElementById('global-summary-absent').textContent = summary.absent_count || 0;
            document.getElementById('global-summary-late').textContent = summary.total_lates || 0;
            document.getElementById('global-summary-hours').textContent = 
                `${parseFloat(summary.total_worked_hours || 0).toFixed(1)}h`;
        },

        renderGlobalAttendanceTable(attendances) {
            const tbody = document.getElementById('global-attendance-table-body');
            if (!tbody) return;

            if (attendances.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No hay registros para mostrar</td></tr>';
                return;
            }

            tbody.innerHTML = attendances.map(att => {
                const date = new Date(att.date).toLocaleDateString('es-CL');
                const checkIn = att.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-';
                const checkOut = att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-';
                const hours = att.worked_hours ? `${parseFloat(att.worked_hours).toFixed(1)}h` : '-';
                
                let statusBadge = '';
                if (att.status === 'present') statusBadge = '<span class="status-badge status-present">Presente</span>';
                else if (att.status === 'absent') statusBadge = '<span class="status-badge status-absent">Ausente</span>';
                else if (att.status === 'late') statusBadge = '<span class="status-badge status-late">Tarde</span>';
                else if (att.status === 'excused') statusBadge = '<span class="status-badge status-approved">Justificado</span>';
                
                const lateMinutes = att.is_late && att.late_minutes > 0 ? `${att.late_minutes} min` : '-';

                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${att.username || 'Usuario'}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${date}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${checkIn}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${checkOut}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${hours}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm ${att.is_late ? 'text-red-600 font-semibold' : 'text-gray-600'}">${lateMinutes}</td>
                    </tr>
                `;
            }).join('');
        },

        async loadUsers() {
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/users`);
                if (!response.ok) throw new Error('Error loading users');
                const result = await response.json();

                const users = result.data || [];
                const userSelect = document.getElementById('filter-global-user');
                if (!userSelect) return;

                // Poblar dropdown de usuarios
                userSelect.innerHTML = '<option value="">Todos los usuarios</option>' +
                    users.map(user => `<option value="${user.id}">${user.username} (${user.role})</option>`).join('');
            } catch (error) {
                console.error('Error loading users:', error);
            }
        },

        exportAttendanceToCSV() {
            const table = document.getElementById('global-attendance-table-body');
            if (!table || table.children.length === 0) {
                ui.showError('No hay datos para exportar');
                return;
            }

            // Construir CSV
            let csv = 'Usuario,Fecha,Entrada,Salida,Horas,Estado,Tardanza\n';
            
            Array.from(table.children).forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 7) {
                    // Extraer texto de cada celda, manejando los badges HTML
                    const rowData = Array.from(cells).map((cell, idx) => {
                        if (idx === 5) { // Estado column
                            const badge = cell.querySelector('.status-badge');
                            return badge ? `"${badge.textContent.trim()}"` : '"-"';
                        }
                        return `"${cell.textContent.trim()}"`;
                    });
                    csv += rowData.join(',') + '\n';
                }
            });

            // Descargar archivo
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().split('T')[0];
            
            link.setAttribute('href', url);
            link.setAttribute('download', `asistencia_global_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            ui.showSuccess('CSV exportado correctamente');
        },

        // Cargar todo el panel de gestión
        async loadManagementPanel() {
            await Promise.all([
                this.loadAdminStats(),
                this.loadPendingOvertime(),
                this.loadShifts(),
                this.loadPendingLeave(),
                this.loadUsers(),
                this.loadAllUsersAttendance()
            ]);
        }
    };

    // Exponer funciones de admin globalmente para onclick
    window.adminFunctions = adminFunctions;

    // Event listener para crear turno
    const createShiftBtn = document.getElementById('create-shift-btn');
    if (createShiftBtn) {
        createShiftBtn.addEventListener('click', () => adminFunctions.createShift());
    }

    // Cargar panel de gestión cuando se cambia a esa pestaña
    const managementTab = document.querySelector('[data-tab="management"]');
    if (managementTab) {
        managementTab.addEventListener('click', () => {
            adminFunctions.loadManagementPanel();
        });
    }

    // Event listeners para vista global de asistencia (Admin)
    const applyGlobalFiltersBtn = document.getElementById('apply-global-filters-btn');
    if (applyGlobalFiltersBtn) {
        applyGlobalFiltersBtn.addEventListener('click', () => {
            const filters = {
                user_id: document.getElementById('filter-global-user').value,
                date_from: document.getElementById('filter-global-date-from').value,
                date_to: document.getElementById('filter-global-date-to').value,
                status: document.getElementById('filter-global-status').value
            };
            adminFunctions.loadAllUsersAttendance(filters);
        });
    }

    const clearGlobalFiltersBtn = document.getElementById('clear-global-filters-btn');
    if (clearGlobalFiltersBtn) {
        clearGlobalFiltersBtn.addEventListener('click', () => {
            document.getElementById('filter-global-user').value = '';
            document.getElementById('filter-global-date-from').value = '';
            document.getElementById('filter-global-date-to').value = '';
            document.getElementById('filter-global-status').value = '';
            adminFunctions.loadAllUsersAttendance();
        });
    }

    const exportCSVBtn = document.getElementById('export-attendance-csv-btn');
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', () => {
            adminFunctions.exportAttendanceToCSV();
        });
    }

    // Control de visibilidad basado en rol
    const currentUser = window.authManager.getUser();
    const isAdmin = currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Manager');
    
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        if (isAdmin) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    // ===================================================================
    // FIN GESTIÓN ADMINISTRATIVA
    // ===================================================================

    // Iniciar
    init();
});
