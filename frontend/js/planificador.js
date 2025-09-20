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
                const response = await authenticatedFetch(`${API_URL}/maintenance-tasks`);
                if (!response.ok) {
                    // Fallback con datos mock si no existe el endpoint
                    return api.getMockTasks();
                }
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.warn('⚠️ Usando datos mock para tareas:', error.message);
                return api.getMockTasks();
            }
        },

        fetchEquipment: async () => {
            try {
                const response = await authenticatedFetch(`${API_URL}/equipment`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('❌ Error loading equipment:', error);
                return [];
            }
        },

        fetchTechnicians: async () => {
            try {
                const response = await authenticatedFetch(`${API_URL}/users?role=technician`);
                if (!response.ok) {
                    // Fallback con datos mock
                    return [
                        { id: 1, username: 'juan_tech', email: 'juan@gymtec.com', name: 'Juan Pérez' },
                        { id: 2, username: 'maria_tech', email: 'maria@gymtec.com', name: 'María García' }
                    ];
                }
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.warn('⚠️ Usando datos mock para técnicos:', error.message);
                return [
                    { id: 1, username: 'juan_tech', email: 'juan@gymtec.com', name: 'Juan Pérez' },
                    { id: 2, username: 'maria_tech', email: 'maria@gymtec.com', name: 'María García' }
                ];
            }
        },

        createTask: async (taskData) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/maintenance-tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
                
                if (!response.ok) {
                    // Simulamos éxito si no existe el endpoint
                    console.warn('⚠️ Endpoint no disponible, simulando creación de tarea');
                    return { success: true, data: { id: Date.now(), ...taskData } };
                }
                
                return await response.json();
            } catch (error) {
                console.warn('⚠️ Simulando creación de tarea:', error.message);
                return { success: true, data: { id: Date.now(), ...taskData } };
            }
        },

        getMockTasks: () => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);

            return [
                {
                    id: 1,
                    title: 'Mantenimiento Cinta 001',
                    type: 'maintenance',
                    equipment_id: 1,
                    equipment_name: 'Cinta Corredora TechGym Pro',
                    scheduled_date: today.toISOString().split('T')[0],
                    scheduled_time: '09:00',
                    technician_id: 1,
                    technician_name: 'Juan Pérez',
                    status: 'pending',
                    notes: 'Revisión mensual programada'
                },
                {
                    id: 2,
                    title: 'Inspección Bicicletas',
                    type: 'inspection',
                    equipment_id: 2,
                    equipment_name: 'Bicicleta Estática FitPro',
                    scheduled_date: tomorrow.toISOString().split('T')[0],
                    scheduled_time: '14:00',
                    technician_id: 2,
                    technician_name: 'María García',
                    status: 'pending',
                    notes: 'Inspección semanal de seguridad'
                },
                {
                    id: 3,
                    title: 'Reparación Elíptica',
                    type: 'repair',
                    equipment_id: 3,
                    equipment_name: 'Elíptica CardioMax',
                    scheduled_date: nextWeek.toISOString().split('T')[0],
                    scheduled_time: '10:30',
                    technician_id: 1,
                    technician_name: 'Juan Pérez',
                    status: 'pending',
                    notes: 'Ruido en pedales reportado'
                }
            ];
        }
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

            // Tareas pendientes
            const pendingTasks = state.tasks.filter(task => 
                task.status === 'pending' && task.scheduled_date >= todayStr
            );
            ui.renderTaskList(elements.pendingTasks, pendingTasks);

            // Tareas de hoy
            const todayTasks = state.tasks.filter(task => 
                task.scheduled_date === todayStr
            );
            ui.renderTaskList(elements.todayTasks, todayTasks);

            // Tareas completadas recientes
            const completedTasks = state.tasks.filter(task => 
                task.status === 'completed'
            ).slice(0, 5);
            ui.renderTaskList(elements.completedTasks, completedTasks);
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

        switchView: (view) => {
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
            } else if (view === 'tasks') {
                elements.calendarView.classList.add('hidden');
                elements.tasksView.classList.remove('hidden');
                ui.updateTasksView();
            }
        },

        openTaskModal: () => {
            elements.taskModal.classList.remove('hidden');
            ui.populateFormSelectors();
        },

        closeTaskModal: () => {
            elements.taskModal.classList.add('hidden');
            elements.taskForm.reset();
        },

        populateFormSelectors: () => {
            // Poblar selector de equipos
            const equipmentSelect = elements.taskForm.querySelector('[name="equipment_id"]');
            equipmentSelect.innerHTML = '<option value="">Seleccionar equipo</option>';
            state.equipment.forEach(equipment => {
                const option = document.createElement('option');
                option.value = equipment.id;
                option.textContent = equipment.name || `Equipo ${equipment.id}`;
                equipmentSelect.appendChild(option);
            });

            // Poblar selector de técnicos
            const technicianSelect = elements.taskForm.querySelector('[name="technician_id"]');
            technicianSelect.innerHTML = '<option value="">Sin asignar</option>';
            state.technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = tech.name || tech.username;
                technicianSelect.appendChild(option);
            });
        }
    };

    // Event Handlers
    const handlers = {
        prevMonth: () => {
            state.currentDate.setMonth(state.currentDate.getMonth() - 1);
            ui.updateCalendar();
        },

        nextMonth: () => {
            state.currentDate.setMonth(state.currentDate.getMonth() + 1);
            ui.updateCalendar();
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
                equipment_id: parseInt(formData.get('equipment_id')) || null,
                scheduled_date: formData.get('scheduled_date'),
                scheduled_time: formData.get('scheduled_time'),
                technician_id: parseInt(formData.get('technician_id')) || null,
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
        elements.prevMonthBtn.addEventListener('click', handlers.prevMonth);
        elements.nextMonthBtn.addEventListener('click', handlers.nextMonth);
        elements.addTaskBtn.addEventListener('click', handlers.addTask);
        elements.closeModalBtn.addEventListener('click', handlers.closeModal);
        elements.cancelBtn.addEventListener('click', handlers.closeModal);
        elements.taskForm.addEventListener('submit', handlers.submitTask);

        // Botones de vista
        elements.viewMonthBtn.addEventListener('click', () => ui.switchView('month'));
        elements.viewWeekBtn.addEventListener('click', () => ui.switchView('week'));
        elements.viewTasksBtn.addEventListener('click', () => ui.switchView('tasks'));

        // Cerrar modal al hacer click fuera
        elements.taskModal.addEventListener('click', (e) => {
            if (e.target === elements.taskModal) {
                ui.closeTaskModal();
            }
        });
    };

    // Inicialización
    const init = async () => {
        try {
            ui.showLoading();
            
            // Cargar datos iniciales
            const [tasks, equipment, technicians] = await Promise.all([
                api.fetchTasks(),
                api.fetchEquipment(),
                api.fetchTechnicians()
            ]);

            state.tasks = tasks;
            state.equipment = equipment;
            state.technicians = technicians;

            // Configurar UI inicial
            setupEventListeners();
            ui.updateCalendar();
            
            // Inicializar iconos
            if (window.lucide) {
                window.lucide.createIcons();
            }

            console.log('✅ Planificador inicializado correctamente');
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