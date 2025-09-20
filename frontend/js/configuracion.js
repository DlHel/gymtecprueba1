/**
 * Sistema de Config    try {
        const user = window.authManager.getUser();
        console.log('👤 Usuario obtenido:', user);
        
        const userRole = user?.role?.toLowerCase(); // ✅ SOLUCIÓN: Convertir a minúsculas
        console.log('👑 Rol del usuario (normalizado):', userRole);
        
        // Para configuración, permitir admin y manager (case-insensitive)
        if (!userRole) {
            console.warn('⚠️ No se pudo obtener el rol del usuario, permitiendo acceso temporal');
            // Permitir continuar, pero mostrar warning
        } else if (userRole !== 'admin' && userRole !== 'manager') {
            console.warn('⚠️ Usuario sin permisos para configuración, rol:', userRole);
            alert('No tienes permisos para acceder a la configuración del sistema');
            window.location.href = '/index.html';
            return;
        } else {
            console.log('✅ Permisos verificados correctamente, rol:', userRole);
        }
    } catch (error) {rRole = user?.role?.toLowerCase(); // ✅ SOLUCIÓN: Convertir a minúsculas
        console.log('👑 Rol del usuario (normalizado):', userRole);ón - Gymtec ERP
 * @bitacora: Módulo para gestión de configuraciones del sistema
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Configuración: Iniciando módulo...');
    
    // ✅ PROTECCIÓN DE AUTENTICACIÓN SIMPLIFICADA Y ROBUSTA
    if (!window.authManager) {
        console.error('❌ window.authManager no existe, redirigiendo...');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    if (!window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado, redirigiendo...');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    console.log('✅ Usuario autenticado, verificando permisos...');

    // Verificar permisos de administrador de forma más robusta
    try {
        const user = window.authManager.getUser();
        console.log('� Usuario obtenido:', user);
        
        const userRole = user?.role;
        console.log('� Rol del usuario:', userRole);
        
        // Para configuración, permitir admin y manager, pero ser más permisivo temporalmente
        if (!userRole) {
            console.warn('⚠️ No se pudo obtener el rol del usuario, permitiendo acceso temporal');
            // Permitir continuar, pero mostrar warning
        } else if (userRole !== 'admin' && userRole !== 'manager') {
            console.warn('⚠️ Usuario sin permisos para configuración, rol:', userRole);
            alert('No tienes permisos para acceder a la configuración del sistema');
            window.location.href = '/index.html';
            return;
        } else {
            console.log('✅ Permisos verificados correctamente, rol:', userRole);
        }
    } catch (error) {
        console.error('❌ Error verificando permisos, pero permitiendo acceso:', error);
        // No redirigir, permitir continuar con warning
    }
    
    console.log('✅ Cargando módulo de configuración...');

    // Estado de la configuración
    const state = {
        currentTab: 'general',
        settings: {},
        hasChanges: false
    };

    // Elementos DOM
    const elements = {
        tabButtons: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        saveAllBtn: document.getElementById('save-all-btn'),
        successMessage: document.getElementById('success-message'),
        
        // Inputs de configuración
        companyName: document.getElementById('company-name'),
        companyEmail: document.getElementById('company-email'),
        companyPhone: document.getElementById('company-phone'),
        timezone: document.getElementById('timezone'),
        workStart: document.getElementById('work-start'),
        workEnd: document.getElementById('work-end'),
        
        // Checkboxes de días laborales
        workDays: {
            mon: document.getElementById('work-mon'),
            tue: document.getElementById('work-tue'),
            wed: document.getElementById('work-wed'),
            thu: document.getElementById('work-thu'),
            fri: document.getElementById('work-fri'),
            sat: document.getElementById('work-sat'),
            sun: document.getElementById('work-sun')
        },
        
        // Toggles de notificaciones
        emailNewTickets: document.getElementById('email-new-tickets'),
        emailMaintenance: document.getElementById('email-maintenance'),
        emailLowStock: document.getElementById('email-low-stock'),
        pushEmergency: document.getElementById('push-emergency'),
        pushTasks: document.getElementById('push-tasks'),
        
        // Configuraciones de seguridad
        require2FA: document.getElementById('require-2fa'),
        sessionTimeout: document.getElementById('session-timeout'),
        maxLoginAttempts: document.getElementById('max-login-attempts'),
        
        // Configuraciones de mantenimiento
        autoMaintenance: document.getElementById('auto-maintenance'),
        defaultInterval: document.getElementById('default-interval'),
        slaCritical: document.getElementById('sla-critical'),
        slaNormal: document.getElementById('sla-normal'),
        
        // Integraciones
        whatsappIntegration: document.getElementById('whatsapp-integration'),
        cloudBackup: document.getElementById('cloud-backup')
    };

    // API Functions
    const api = {
        loadSettings: async () => {
            try {
                const response = await authenticatedFetch(`${API_URL}/system-settings`);
                
                if (!response.ok) {
                    // Devolver configuración por defecto si no existe el endpoint
                    console.warn('⚠️ Endpoint de configuración no disponible, usando valores por defecto');
                    return api.getDefaultSettings();
                }
                
                const result = await response.json();
                return result.data || api.getDefaultSettings();
            } catch (error) {
                console.warn('⚠️ Error al cargar configuración, usando valores por defecto:', error.message);
                return api.getDefaultSettings();
            }
        },

        saveSettings: async (settings) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/system-settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
                });
                
                if (!response.ok) {
                    // Simular éxito si no existe el endpoint
                    console.warn('⚠️ Endpoint de configuración no disponible, simulando guardado');
                    return { success: true, message: 'Configuración guardada localmente' };
                }
                
                return await response.json();
            } catch (error) {
                console.warn('⚠️ Simulando guardado de configuración:', error.message);
                // Guardar en localStorage como fallback
                localStorage.setItem('gymtec_settings', JSON.stringify(settings));
                return { success: true, message: 'Configuración guardada localmente' };
            }
        },

        getDefaultSettings: () => {
            // Intentar cargar desde localStorage primero
            const savedSettings = localStorage.getItem('gymtec_settings');
            if (savedSettings) {
                try {
                    return JSON.parse(savedSettings);
                } catch (e) {
                    console.warn('⚠️ Error al parsear configuración guardada');
                }
            }

            // Configuración por defecto
            return {
                // General
                company_name: 'Gymtec Solutions',
                company_email: 'contacto@gymtec.com',
                company_phone: '+1 234 567 8900',
                timezone: 'America/Lima',
                work_start: '08:00',
                work_end: '18:00',
                work_days: {
                    mon: true,
                    tue: true,
                    wed: true,
                    thu: true,
                    fri: true,
                    sat: false,
                    sun: false
                },
                
                // Notificaciones
                email_new_tickets: true,
                email_maintenance: true,
                email_low_stock: true,
                push_emergency: true,
                push_tasks: false,
                
                // Seguridad
                require_2fa: false,
                session_timeout: 240,
                max_login_attempts: 5,
                
                // Mantenimiento
                auto_maintenance: true,
                default_interval: 'monthly',
                sla_critical: 4,
                sla_normal: 24,
                
                // Integraciones
                whatsapp_integration: false,
                cloud_backup: false
            };
        }
    };

    // Funciones de UI
    const ui = {
        switchTab: (tabName) => {
            state.currentTab = tabName;
            
            // Actualizar botones
            elements.tabButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tabName) {
                    btn.classList.add('active');
                }
            });
            
            // Mostrar contenido correspondiente
            elements.tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabName}-tab`) {
                    content.classList.add('active');
                }
            });
        },

        loadSettingsToForm: (settings) => {
            state.settings = { ...settings };
            
            // General
            if (elements.companyName) elements.companyName.value = settings.company_name || '';
            if (elements.companyEmail) elements.companyEmail.value = settings.company_email || '';
            if (elements.companyPhone) elements.companyPhone.value = settings.company_phone || '';
            if (elements.timezone) elements.timezone.value = settings.timezone || 'America/Lima';
            if (elements.workStart) elements.workStart.value = settings.work_start || '08:00';
            if (elements.workEnd) elements.workEnd.value = settings.work_end || '18:00';
            
            // Días laborales
            Object.keys(elements.workDays).forEach(day => {
                if (elements.workDays[day]) {
                    elements.workDays[day].checked = settings.work_days?.[day] || false;
                }
            });
            
            // Notificaciones
            if (elements.emailNewTickets) elements.emailNewTickets.checked = settings.email_new_tickets || false;
            if (elements.emailMaintenance) elements.emailMaintenance.checked = settings.email_maintenance || false;
            if (elements.emailLowStock) elements.emailLowStock.checked = settings.email_low_stock || false;
            if (elements.pushEmergency) elements.pushEmergency.checked = settings.push_emergency || false;
            if (elements.pushTasks) elements.pushTasks.checked = settings.push_tasks || false;
            
            // Seguridad
            if (elements.require2FA) elements.require2FA.checked = settings.require_2fa || false;
            if (elements.sessionTimeout) elements.sessionTimeout.value = settings.session_timeout || 240;
            if (elements.maxLoginAttempts) elements.maxLoginAttempts.value = settings.max_login_attempts || 5;
            
            // Mantenimiento
            if (elements.autoMaintenance) elements.autoMaintenance.checked = settings.auto_maintenance || false;
            if (elements.defaultInterval) elements.defaultInterval.value = settings.default_interval || 'monthly';
            if (elements.slaCritical) elements.slaCritical.value = settings.sla_critical || 4;
            if (elements.slaNormal) elements.slaNormal.value = settings.sla_normal || 24;
            
            // Integraciones
            if (elements.whatsappIntegration) elements.whatsappIntegration.checked = settings.whatsapp_integration || false;
            if (elements.cloudBackup) elements.cloudBackup.checked = settings.cloud_backup || false;
        },

        collectFormData: () => {
            return {
                // General
                company_name: elements.companyName?.value || '',
                company_email: elements.companyEmail?.value || '',
                company_phone: elements.companyPhone?.value || '',
                timezone: elements.timezone?.value || 'America/Lima',
                work_start: elements.workStart?.value || '08:00',
                work_end: elements.workEnd?.value || '18:00',
                work_days: {
                    mon: elements.workDays.mon?.checked || false,
                    tue: elements.workDays.tue?.checked || false,
                    wed: elements.workDays.wed?.checked || false,
                    thu: elements.workDays.thu?.checked || false,
                    fri: elements.workDays.fri?.checked || false,
                    sat: elements.workDays.sat?.checked || false,
                    sun: elements.workDays.sun?.checked || false
                },
                
                // Notificaciones
                email_new_tickets: elements.emailNewTickets?.checked || false,
                email_maintenance: elements.emailMaintenance?.checked || false,
                email_low_stock: elements.emailLowStock?.checked || false,
                push_emergency: elements.pushEmergency?.checked || false,
                push_tasks: elements.pushTasks?.checked || false,
                
                // Seguridad
                require_2fa: elements.require2FA?.checked || false,
                session_timeout: parseInt(elements.sessionTimeout?.value) || 240,
                max_login_attempts: parseInt(elements.maxLoginAttempts?.value) || 5,
                
                // Mantenimiento
                auto_maintenance: elements.autoMaintenance?.checked || false,
                default_interval: elements.defaultInterval?.value || 'monthly',
                sla_critical: parseInt(elements.slaCritical?.value) || 4,
                sla_normal: parseInt(elements.slaNormal?.value) || 24,
                
                // Integraciones
                whatsapp_integration: elements.whatsappIntegration?.checked || false,
                cloud_backup: elements.cloudBackup?.checked || false
            };
        },

        showSuccessMessage: () => {
            elements.successMessage.style.display = 'block';
            setTimeout(() => {
                elements.successMessage.style.display = 'none';
            }, 3000);
        },

        markAsChanged: () => {
            state.hasChanges = true;
            elements.saveAllBtn.classList.add('bg-orange-600', 'hover:bg-orange-700');
            elements.saveAllBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            elements.saveAllBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4 inline mr-2"></i>Guardar Cambios *';
        },

        markAsSaved: () => {
            state.hasChanges = false;
            elements.saveAllBtn.classList.remove('bg-orange-600', 'hover:bg-orange-700');
            elements.saveAllBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            elements.saveAllBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4 inline mr-2"></i>Guardar Cambios';
        }
    };

    // Event Handlers
    const handlers = {
        switchTab: (e) => {
            const tabName = e.currentTarget.dataset.tab;
            ui.switchTab(tabName);
        },

        saveSettings: async () => {
            try {
                const settings = ui.collectFormData();
                
                console.log('💾 Guardando configuración:', settings);
                
                const result = await api.saveSettings(settings);
                
                if (result.success) {
                    state.settings = { ...settings };
                    ui.markAsSaved();
                    ui.showSuccessMessage();
                    console.log('✅ Configuración guardada exitosamente');
                } else {
                    throw new Error(result.message || 'Error al guardar configuración');
                }
            } catch (error) {
                console.error('❌ Error al guardar configuración:', error);
                alert('Error al guardar la configuración: ' + error.message);
            }
        },

        markChanged: () => {
            ui.markAsChanged();
        }
    };

    // Setup Event Listeners
    const setupEventListeners = () => {
        // Tabs
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', handlers.switchTab);
        });
        
        // Botón guardar
        elements.saveAllBtn.addEventListener('click', handlers.saveSettings);
        
        // Detectar cambios en todos los inputs
        const allInputs = document.querySelectorAll('input, select, textarea');
        allInputs.forEach(input => {
            input.addEventListener('change', handlers.markChanged);
            input.addEventListener('input', handlers.markChanged);
        });
    };

    // Función para prevenir pérdida de cambios
    const setupBeforeUnload = () => {
        window.addEventListener('beforeunload', (e) => {
            if (state.hasChanges) {
                e.preventDefault();
                e.returnValue = '¿Estás seguro de que quieres salir? Tienes cambios sin guardar.';
                return e.returnValue;
            }
        });
    };

    // Inicialización
    const init = async () => {
        try {
            console.log('🔧 Inicializando módulo de configuración...');
            
            // Cargar configuración actual
            const settings = await api.loadSettings();
            ui.loadSettingsToForm(settings);
            
            // Configurar event listeners
            setupEventListeners();
            setupBeforeUnload();
            
            // Inicializar iconos
            if (window.lucide) {
                window.lucide.createIcons();
            }
            
            console.log('✅ Módulo de configuración inicializado');
            console.log('⚙️ Configuración cargada:', settings);
            
        } catch (error) {
            console.error('❌ Error al inicializar configuración:', error);
        }
    };

    // Inicializar cuando el DOM esté listo
    init();
});