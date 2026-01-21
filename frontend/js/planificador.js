/**
 * Planificador de Mantenimientos - Sistema de calendario y tareas
 * @bitacora: Módulo para planificación y gestión de tareas de mantenimiento
 */

document.addEventListener('DOMContentLoaded', () => {
    // ✅ PROTECCIÓN DE AUTENTICACIÓN OBLIGATORIA
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado en planificador, redirigiendo a login...');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }
    
    console.log('✅ Usuario autenticado, cargando módulo de planificador...');

    // Estado del planificador
    const state = {
        currentDate: new Date(),
        currentView: 'month', // month, week, tasks
        tasks: [],
        equipment: [],
        technicians: [],
        selectedDate: null
    };

    // Elementos DOM
    const elements = {
        calendarView: document.getElementById('calendar-view'),
        tasksView: document.getElementById('tasks-view'),
        currentMonth: document.getElementById('current-month'),
        prevMonthBtn: document.getElementById('prev-month'),
        nextMonthBtn: document.getElementById('next-month'),
        addTaskBtn: document.getElementById('add-task-btn'),
        taskModal: document.getElementById('task-modal'),
        taskForm: document.getElementById('task-form'),
        closeModalBtn: document.getElementById('close-modal'),
        cancelBtn: document.getElementById('cancel-btn'),
        
        // Botones de vista
        viewMonthBtn: document.getElementById('view-month'),
        viewWeekBtn: document.getElementById('view-week'),
        viewTasksBtn: document.getElementById('view-tasks'),
        
        // Contenedores de tareas
        pendingTasks: document.getElementById('pending-tasks'),
        todayTasks: document.getElementById('today-tasks'),
        completedTasks: document.getElementById('completed-tasks')
    };

    // API Functions
    const api = {
        fetchTasks: async () => {
            try {
                console.log('🔄 Fetching maintenance tasks from API...');
                const response = await authenticatedFetch(`${API_URL}/maintenance-tasks`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('✅ Tasks fetched successfully:', result.data?.length || 0, 'items');
                
                // Procesar datos para el frontend
                const tasks = (result.data || []).map(task => ({
                    ...task,
                    // Usar fecha directamente si ya viene como string YYYY-MM-DD
                    // Evita problemas de timezone con new Date() que interpreta como UTC
                    scheduled_date: task.scheduled_date 
                        ? (typeof task.scheduled_date === 'string' && task.scheduled_date.match(/^\d{4}-\d{2}-\d{2}$/)
                            ? task.scheduled_date  // Ya está en formato correcto
                            : task.scheduled_date.split('T')[0])  // Extraer solo la fecha
                        : null,
                    // Mapear campos legacy si es necesario
                    equipment_name: task.equipment_name || 'Sin especificar',
                    technician_name: task.technician_name || 'Sin asignar'
                }));
                
                return tasks;
            } catch (error) {
                console.error('❌ Error fetching maintenance tasks:', error.message);
                throw error;
            }
        },

        fetchEquipment: async () => {
            try {
                console.log('🔄 Fetching equipment from API...');
                const response = await authenticatedFetch(`${API_URL}/equipment`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('✅ Equipment fetched successfully:', result.data?.length || 0, 'items');
                return result.data || [];
            } catch (error) {
                console.error('❌ Error loading equipment:', error.message);
                return [];
            }
        },

        fetchTechnicians: async () => {
            try {
                console.log('🔄 Fetching technicians from API...');
                const response = await authenticatedFetch(`${API_URL}/maintenance-tasks/technicians`);
                
                if (!response.ok) {
                    // Fallback to general users endpoint
                    const usersResponse = await authenticatedFetch(`${API_URL}/users?role=technician`);
                    if (!usersResponse.ok) {
                        throw new Error(`HTTP ${usersResponse.status}: ${usersResponse.statusText}`);
                    }
                    const usersResult = await usersResponse.json();
                    return usersResult.data || [];
                }
                
                const result = await response.json();
                console.log('✅ Technicians fetched successfully:', result.data?.length || 0, 'items');
                return result.data || [];
            } catch (error) {
                console.error('❌ Error loading technicians:', error.message);
                return [];
            }
        },

        createTask: async (taskData) => {
            try {
                console.log('🔄 Creating maintenance task:', taskData.title);
                const response = await authenticatedFetch(`${API_URL}/maintenance-tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(taskData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('✅ Task created successfully:', result.data?.id);
                return result;
            } catch (error) {
                console.error('❌ Error creating maintenance task:', error.message);
                throw error;
            }
        },

        updateTask: async (taskId, taskData) => {
            try {
                console.log('🔄 Updating maintenance task:', taskId);
                const response = await authenticatedFetch(`${API_URL}/maintenance-tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(taskData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('✅ Task updated successfully:', taskId);
                return result;
            } catch (error) {
                console.error('❌ Error updating maintenance task:', error.message);
                throw error;
            }
        },

        deleteTask: async (taskId) => {
            try {
                console.log('🔄 Deleting maintenance task:', taskId);
                const response = await authenticatedFetch(`${API_URL}/maintenance-tasks/${taskId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('✅ Task deleted successfully:', taskId);
                return result;
            } catch (error) {
                console.error('❌ Error deleting maintenance task:', error.message);
                throw error;
            }
        },
    };

    // Funciones de UI
    const ui = {
        showLoading: () => {
            console.log('🔄 Loading planificador data...');
        },

        hideLoading: () => {
            console.log('✅ Planificador data loaded');
        },

        showError: (message) => {
            console.error('❌ Planificador Error:', message);
            // Implementar notificación visual en el futuro
        },

        updateCalendar: () => {
            const year = state.currentDate.getFullYear();
            const month = state.currentDate.getMonth();
            
            // Actualizar título del mes
            elements.currentMonth.textContent = state.currentDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long'
            });

            // Generar días del calendario
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());

            const calendarGrid = elements.calendarView.querySelector('.calendar-grid');
            
            // Limpiar días anteriores (mantener headers)
            const headers = calendarGrid.querySelectorAll('.calendar-header');
            calendarGrid.innerHTML = '';
            headers.forEach(header => calendarGrid.appendChild(header));

            // Generar 42 días (6 semanas × 7 días)
            for (let i = 0; i < 42; i++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + i);
                
                const dayElement = ui.createDayElement(currentDate, month);
                calendarGrid.appendChild(dayElement);
            }
        },

        createDayElement: (date, currentMonth) => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            // Clases adicionales
            if (date.getMonth() !== currentMonth) {
                dayElement.classList.add('other-month');
            }
            
            if (ui.isToday(date)) {
                dayElement.classList.add('today');
            }

            // Número del día
            const dayNumber = document.createElement('div');
            dayNumber.className = 'font-semibold text-sm mb-1';
            dayNumber.textContent = date.getDate();
            dayElement.appendChild(dayNumber);

            // Tareas del día
            const dayTasks = state.tasks.filter(task => 
                task.scheduled_date === date.toISOString().split('T')[0]
            );

            dayTasks.forEach(task => {
                const eventElement = document.createElement('div');
                eventElement.className = `event-item ${task.type}`;
                eventElement.textContent = task.title;
                eventElement.title = `${task.title} - ${task.scheduled_time || 'Sin hora'}`;
                dayElement.appendChild(eventElement);
            });

            // Event listener para seleccionar día
            dayElement.addEventListener('click', () => {
                state.selectedDate = date;
                ui.highlightSelectedDay(dayElement);
            });

            return dayElement;
        },

        isToday: (date) => {
            const today = new Date();
            return date.toDateString() === today.toDateString();
        },

        highlightSelectedDay: (dayElement) => {
            // Remover selección anterior
            document.querySelectorAll('.calendar-day.selected').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Agregar selección actual
            dayElement.classList.add('selected');
        },

        updateTasksView: () => {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            // Obtener el mes actual para filtrar
            const currentMonth = state.currentDate.getMonth();
            const currentYear = state.currentDate.getFullYear();
            
            console.log(`📅 Actualizando vista de tareas para ${currentYear}-${currentMonth + 1}`);

            // Tareas pendientes del mes actual
            const pendingTasks = state.tasks.filter(task => {
                const taskDate = new Date(task.scheduled_date);
                return task.status === 'pending' && 
                       task.scheduled_date >= todayStr &&
                       taskDate.getMonth() === currentMonth &&
                       taskDate.getFullYear() === currentYear;
            });
            ui.renderTaskList(elements.pendingTasks, pendingTasks);

            // Tareas de hoy (sin filtro de mes)
            const todayTasks = state.tasks.filter(task => 
                task.scheduled_date === todayStr
            );
            ui.renderTaskList(elements.todayTasks, todayTasks);

            // Tareas completadas del mes actual
            const completedTasks = state.tasks.filter(task => {
                const taskDate = new Date(task.scheduled_date);
                return task.status === 'completed' &&
                       taskDate.getMonth() === currentMonth &&
                       taskDate.getFullYear() === currentYear;
            }).slice(0, 10);
            ui.renderTaskList(elements.completedTasks, completedTasks);
            
            console.log(`✅ Vista de tareas actualizada: ${pendingTasks.length} pendientes, ${todayTasks.length} hoy, ${completedTasks.length} completadas`);
        },

        renderTaskList: (container, tasks) => {
            container.innerHTML = '';
            
            if (tasks.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-sm">No hay tareas</p>';
                return;
            }

            tasks.forEach(task => {
                const taskElement = ui.createTaskCard(task);
                container.appendChild(taskElement);
            });
        },

        createTaskCard: (task) => {
            const card = document.createElement('div');
            card.className = 'task-card';
            
            // Determinar estado visual
            const today = new Date().toISOString().split('T')[0];
            if (task.scheduled_date < today && task.status === 'pending') {
                card.classList.add('overdue');
            } else if (task.scheduled_date === today) {
                card.classList.add('due-today');
            }

            card.innerHTML = `
                <div class="flex items-start justify-between mb-2">
                    <h4 class="font-medium text-sm">${task.title}</h4>
                    <span class="px-2 py-1 text-xs rounded-full ${ui.getTypeClass(task.type)}">
                        ${ui.getTypeLabel(task.type)}
                    </span>
                </div>
                <p class="text-gray-600 text-xs mb-2">${task.equipment_name || 'Equipo no especificado'}</p>
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span>${task.scheduled_date} ${task.scheduled_time || ''}</span>
                    <span>${task.technician_name || 'Sin asignar'}</span>
                </div>
            `;

            return card;
        },

        getTypeClass: (type) => {
            const classes = {
                maintenance: 'bg-yellow-100 text-yellow-800',
                inspection: 'bg-green-100 text-green-800',
                repair: 'bg-red-100 text-red-800',
                cleaning: 'bg-blue-100 text-blue-800'
            };
            return classes[type] || 'bg-gray-100 text-gray-800';
        },

        getTypeLabel: (type) => {
            const labels = {
                maintenance: 'Mantenimiento',
                inspection: 'Inspección',
                repair: 'Reparación',
                cleaning: 'Limpieza'
            };
            return labels[type] || type;
        },

        getTaskColor: (task) => {
            // Determinar color basado en estado y prioridad
            if (task.status === 'completed') {
                return 'bg-green-100 text-green-800 border-green-200';
            } else if (task.status === 'in_progress') {
                return 'bg-blue-100 text-blue-800 border-blue-200';
            } else if (task.priority === 'critical') {
                return 'bg-red-100 text-red-800 border-red-200';
            } else if (task.priority === 'high') {
                return 'bg-orange-100 text-orange-800 border-orange-200';
            } else if (task.priority === 'medium') {
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            } else {
                return 'bg-gray-100 text-gray-800 border-gray-200';
            }
        },

        switchView: (view) => {
            console.log(`🔄 Cambiando a vista: ${view}`);
            state.currentView = view;
            
            // Actualizar botones
            document.querySelectorAll('[id^="view-"]').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            });
            
            document.getElementById(`view-${view}`).classList.remove('bg-gray-200', 'text-gray-700');
            document.getElementById(`view-${view}`).classList.add('bg-blue-600', 'text-white');

            // Mostrar/ocultar vistas
            if (view === 'month') {
                elements.calendarView.classList.remove('hidden');
                elements.tasksView.classList.add('hidden');
                ui.updateCalendar();
                console.log('✅ Vista mensual activada');
            } else if (view === 'week') {
                elements.calendarView.classList.remove('hidden');
                elements.tasksView.classList.add('hidden');
                ui.renderWeekView();
                console.log('✅ Vista semanal activada');
            } else if (view === 'tasks') {
                elements.calendarView.classList.add('hidden');
                elements.tasksView.classList.remove('hidden');
                ui.updateTasksView();
                console.log('✅ Vista de tareas activada');
            }
        },

        renderWeekView: () => {
            console.log('🗓️ Renderizando vista semanal...');
            
            // Calcular semana actual
            const startOfWeek = new Date(state.currentDate);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day;
            startOfWeek.setDate(diff);
            
            // Generar grid semanal
            const calendarGrid = elements.calendarView.querySelector('.calendar-grid');
            
            // Limpiar contenido existente pero mantener headers
            const headers = calendarGrid.querySelectorAll('.calendar-header');
            calendarGrid.innerHTML = '';
            
            // Re-agregar headers
            headers.forEach(header => calendarGrid.appendChild(header));
            
            // Agregar días de la semana
            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(startOfWeek);
                dayDate.setDate(startOfWeek.getDate() + i);
                
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                dayElement.style.minHeight = '200px'; // Más alto para vista semanal
                
                // Marcar día actual
                const today = new Date();
                if (dayDate.toDateString() === today.toDateString()) {
                    dayElement.classList.add('today');
                }
                
                // Día del mes
                const dayNumber = document.createElement('div');
                dayNumber.className = 'font-semibold text-sm mb-2';
                dayNumber.textContent = dayDate.getDate();
                dayElement.appendChild(dayNumber);
                
                // Tareas del día
                const dayTasks = state.tasks.filter(task => {
                    const taskDate = new Date(task.scheduled_date);
                    return taskDate.toDateString() === dayDate.toDateString();
                });
                
                // Mostrar tareas
                dayTasks.forEach(task => {
                    const taskDiv = document.createElement('div');
                    taskDiv.className = `text-xs p-1 mb-1 rounded ${ui.getTaskColor(task)} cursor-pointer`;
                    taskDiv.textContent = task.title;
                    taskDiv.title = `${task.title} - ${task.scheduled_time || ''}`;
                    dayElement.appendChild(taskDiv);
                });
                
                // Event listener para seleccionar día
                dayElement.addEventListener('click', () => {
                    ui.selectDate(dayDate);
                });
                
                calendarGrid.appendChild(dayElement);
            }
            
            console.log('✅ Vista semanal renderizada');
        },

        openTaskModal: () => {
            elements.taskModal.classList.remove('hidden');
            ui.populateFormSelectors();
        },

        closeTaskModal: () => {
            elements.taskModal.classList.add('hidden');
            elements.taskForm.reset();
        },

        populateFormSelects: () => {
            // Esta función se ejecuta al inicializar para poblar los selects una vez
            ui.populateFormSelectors();
        },

        populateFormSelectors: () => {
            // Poblar selector de equipos
            const equipmentSelect = elements.taskForm.querySelector('[name="equipment_id"]');
            if (equipmentSelect) {
                equipmentSelect.innerHTML = '<option value="">Seleccionar equipo</option>';
                state.equipment.forEach(equipment => {
                    const option = document.createElement('option');
                    option.value = equipment.id;
                    option.textContent = equipment.name || `Equipo ${equipment.id}`;
                    equipmentSelect.appendChild(option);
                });
                console.log('✅ Equipos poblados en selector:', state.equipment.length, 'items');
            }

            // Poblar selector de técnicos
            const technicianSelect = elements.taskForm.querySelector('[name="technician_id"]');
            if (technicianSelect) {
                technicianSelect.innerHTML = '<option value="">Sin asignar</option>';
                state.technicians.forEach(tech => {
                    const option = document.createElement('option');
                    option.value = tech.id;
                    option.textContent = tech.name || tech.username;
                    technicianSelect.appendChild(option);
                });
                console.log('✅ Técnicos poblados en selector:', state.technicians.length, 'items');
            }
        }
    };

    // Event Handlers
    const handlers = {
        prevMonth: () => {
            console.log(`🔙 Navegando al mes anterior (vista actual: ${state.currentView})`);
            
            if (state.currentView === 'week') {
                // En vista semanal, mover una semana hacia atrás
                state.currentDate.setDate(state.currentDate.getDate() - 7);
                ui.renderWeekView();
            } else {
                // En vista mensual o de tareas, mover un mes hacia atrás
                state.currentDate.setMonth(state.currentDate.getMonth() - 1);
                
                if (state.currentView === 'month') {
                    ui.updateCalendar();
                } else if (state.currentView === 'tasks') {
                    ui.updateCalendar(); // Actualizar título del mes
                    ui.updateTasksView(); // Actualizar filtros de tareas
                }
            }
        },

        nextMonth: () => {
            console.log(`🔜 Navegando al mes siguiente (vista actual: ${state.currentView})`);
            
            if (state.currentView === 'week') {
                // En vista semanal, mover una semana hacia adelante
                state.currentDate.setDate(state.currentDate.getDate() + 7);
                ui.renderWeekView();
            } else {
                // En vista mensual o de tareas, mover un mes hacia adelante
                state.currentDate.setMonth(state.currentDate.getMonth() + 1);
                
                if (state.currentView === 'month') {
                    ui.updateCalendar();
                } else if (state.currentView === 'tasks') {
                    ui.updateCalendar(); // Actualizar título del mes
                    ui.updateTasksView(); // Actualizar filtros de tareas
                }
            }
        },

        addTask: () => {
            ui.openTaskModal();
        },

        closeModal: () => {
            ui.closeTaskModal();
        },

        submitTask: async (e) => {
            e.preventDefault();
            
            const formData = new FormData(elements.taskForm);
            const taskData = {
                title: formData.get('title'),
                type: formData.get('type'),
                equipment_id: parseInt(formData.get('equipment_id'), 10) || null,
                scheduled_date: formData.get('scheduled_date'),
                scheduled_time: formData.get('scheduled_time'),
                technician_id: parseInt(formData.get('technician_id'), 10) || null,
                notes: formData.get('notes'),
                status: 'pending'
            };

            try {
                ui.showLoading();
                const result = await api.createTask(taskData);
                
                if (result.success) {
                    // Agregar tarea al estado local
                    state.tasks.push({
                        ...taskData,
                        id: result.data.id,
                        equipment_name: state.equipment.find(eq => eq.id == taskData.equipment_id)?.name,
                        technician_name: state.technicians.find(tech => tech.id == taskData.technician_id)?.name
                    });
                    
                    ui.updateCalendar();
                    if (state.currentView === 'tasks') {
                        ui.updateTasksView();
                    }
                    ui.closeTaskModal();
                    
                    console.log('✅ Tarea creada exitosamente');
                }
            } catch (error) {
                ui.showError('Error al crear la tarea: ' + error.message);
            } finally {
                ui.hideLoading();
            }
        }
    };

    // Setup Event Listeners
    const setupEventListeners = () => {
        // Verificar que todos los elementos existan antes de agregar listeners
        if (!elements.prevMonthBtn || !elements.nextMonthBtn || !elements.addTaskBtn) {
            console.error('❌ Elementos del calendario no encontrados');
            console.error('prevMonthBtn:', elements.prevMonthBtn);
            console.error('nextMonthBtn:', elements.nextMonthBtn);
            console.error('addTaskBtn:', elements.addTaskBtn);
            throw new Error('Elementos del DOM no encontrados para planificador');
        }

        elements.prevMonthBtn.addEventListener('click', handlers.prevMonth);
        elements.nextMonthBtn.addEventListener('click', handlers.nextMonth);
        elements.addTaskBtn.addEventListener('click', handlers.addTask);
        
        if (elements.closeModalBtn) {
            elements.closeModalBtn.addEventListener('click', handlers.closeModal);
        }
        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', handlers.closeModal);
        }
        if (elements.taskForm) {
            elements.taskForm.addEventListener('submit', handlers.submitTask);
        }

        // Botones de vista
        if (elements.viewMonthBtn) {
            elements.viewMonthBtn.addEventListener('click', () => ui.switchView('month'));
        }
        if (elements.viewWeekBtn) {
            elements.viewWeekBtn.addEventListener('click', () => ui.switchView('week'));
        }
        if (elements.viewTasksBtn) {
            elements.viewTasksBtn.addEventListener('click', () => ui.switchView('tasks'));
        }

        // Cerrar modal al hacer click fuera
        if (elements.taskModal) {
            elements.taskModal.addEventListener('click', (e) => {
                if (e.target === elements.taskModal) {
                    ui.closeTaskModal();
                }
            });
        }
    };

    // Inicialización
    const init = async () => {
        try {
            ui.showLoading();
            console.log('🚀 Inicializando planificador con datos reales...');
            
            // Cargar datos iniciales en paralelo
            const [tasks, equipment, technicians] = await Promise.all([
                api.fetchTasks().catch(err => {
                    console.warn('⚠️ Error cargando tareas:', err.message);
                    return [];
                }),
                api.fetchEquipment().catch(err => {
                    console.warn('⚠️ Error cargando equipos:', err.message);
                    return [];
                }),
                api.fetchTechnicians().catch(err => {
                    console.warn('⚠️ Error cargando técnicos:', err.message);
                    return [];
                })
            ]);

            // Actualizar estado
            state.tasks = tasks;
            state.equipment = equipment;
            state.technicians = technicians;

            // Configurar selectores del formulario
            ui.populateFormSelects();

            // Configurar UI inicial
            setupEventListeners();
            ui.updateCalendar();
            
            // Actualizar vista de tareas si es la activa
            if (state.currentView === 'tasks') {
                ui.updateTasksView();
            }
            
            // Inicializar iconos
            if (window.lucide) {
                window.lucide.createIcons();
            }

            console.log('✅ Planificador inicializado correctamente con datos reales');
            console.log('📊 Estado inicial:', {
                tasks: state.tasks.length,
                equipment: state.equipment.length,
                technicians: state.technicians.length
            });

        } catch (error) {
            console.error('❌ Error al inicializar planificador:', error);
            ui.showError('Error al cargar el planificador');
        } finally {
            ui.hideLoading();
        }
    };

    // Inicializar cuando el DOM esté listo
    init();
});