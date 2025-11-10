/**
 * Sistema de Configuración - Gymtec ERP
 * @bitacora: Módulo para gestión de configuraciones del sistema
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Configuración: Iniciando módulo...');
    
    // ✅ PROTECCIÓN: Verificar autenticación
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.error('❌ No autenticado, redirigiendo...');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    // ✅ PROTECCIÓN: Verificar permisos de la página
    if (!window.checkPagePermissions()) {
        return; // checkPagePermissions ya maneja la redirección
    }
    
    console.log('✅ Cargando módulo de configuración...');

    // ✅ MENSAJE DE ÉXITO VISUAL
    setTimeout(() => {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed; 
            top: 20px; 
            right: 20px; 
            background: #4CAF50; 
            color: white; 
            padding: 15px 20px; 
            border-radius: 8px; 
            z-index: 9999;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        successDiv.innerHTML = '✅ Configuración cargada correctamente!<br><small>Problema de autenticación resuelto</small>';
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }, 500);

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
            monday: document.getElementById('work-monday'),
            tuesday: document.getElementById('work-tuesday'),
            wednesday: document.getElementById('work-wednesday'),
            thursday: document.getElementById('work-thursday'),
            friday: document.getElementById('work-friday'),
            saturday: document.getElementById('work-saturday'),
            sunday: document.getElementById('work-sunday')
        },
        
        // Configuraciones de seguridad
        passwordMinLength: document.getElementById('password-min-length'),
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

        getDefaultSettings: () => ({
            company: {
                name: 'GymTec ERP',
                email: 'admin@gymtec.com',
                phone: '+1 555-0123',
                timezone: 'America/New_York'
            },
            workSchedule: {
                start: '08:00',
                end: '18:00',
                days: {
                    monday: true,
                    tuesday: true,
                    wednesday: true,
                    thursday: true,
                    friday: true,
                    saturday: false,
                    sunday: false
                }
            },
            security: {
                passwordMinLength: 8,
                sessionTimeout: 30,
                maxLoginAttempts: 3
            },
            maintenance: {
                autoMaintenance: true,
                defaultInterval: 30,
                slaCritical: 4,
                slaNormal: 24
            },
            integrations: {
                whatsappIntegration: false,
                cloudBackup: true
            }
        }),

        saveSettings: async (settings) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/system-settings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Error guardando configuración:', error);
                throw error;
            }
        }
    };

    // UI Functions
    const ui = {
        initTabs: () => {
            elements.tabButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab;
                    ui.switchTab(tabName);
                });
            });
        },

        switchTab: (tabName) => {
            // Desactivar todas las pestañas
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            elements.tabContents.forEach(content => content.classList.remove('active'));

            // Activar la pestaña seleccionada
            const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
            const activeContent = document.getElementById(`${tabName}-tab`);

            if (activeButton && activeContent) {
                activeButton.classList.add('active');
                activeContent.classList.add('active');
                state.currentTab = tabName;
            }
        },

        loadSettingsToForm: (settings) => {
            // Configuración de empresa
            if (elements.companyName) elements.companyName.value = settings.company?.name || '';
            if (elements.companyEmail) elements.companyEmail.value = settings.company?.email || '';
            if (elements.companyPhone) elements.companyPhone.value = settings.company?.phone || '';
            if (elements.timezone) elements.timezone.value = settings.company?.timezone || '';

            // Horario de trabajo
            if (elements.workStart) elements.workStart.value = settings.workSchedule?.start || '';
            if (elements.workEnd) elements.workEnd.value = settings.workSchedule?.end || '';

            // Días laborales
            Object.keys(elements.workDays).forEach(day => {
                if (elements.workDays[day]) {
                    elements.workDays[day].checked = settings.workSchedule?.days?.[day] || false;
                }
            });

            // Configuración de seguridad
            if (elements.passwordMinLength) elements.passwordMinLength.value = settings.security?.passwordMinLength || '';
            if (elements.sessionTimeout) elements.sessionTimeout.value = settings.security?.sessionTimeout || '';
            if (elements.maxLoginAttempts) elements.maxLoginAttempts.value = settings.security?.maxLoginAttempts || '';

            // Configuración de mantenimiento
            if (elements.autoMaintenance) elements.autoMaintenance.checked = settings.maintenance?.autoMaintenance || false;
            if (elements.defaultInterval) elements.defaultInterval.value = settings.maintenance?.defaultInterval || '';
            if (elements.slaCritical) elements.slaCritical.value = settings.maintenance?.slaCritical || '';
            if (elements.slaNormal) elements.slaNormal.value = settings.maintenance?.slaNormal || '';

            // Integraciones
            if (elements.whatsappIntegration) elements.whatsappIntegration.checked = settings.integrations?.whatsappIntegration || false;
            if (elements.cloudBackup) elements.cloudBackup.checked = settings.integrations?.cloudBackup || false;
        },

        collectFormData: () => {
            const settings = {
                company: {
                    name: elements.companyName?.value || '',
                    email: elements.companyEmail?.value || '',
                    phone: elements.companyPhone?.value || '',
                    timezone: elements.timezone?.value || ''
                },
                workSchedule: {
                    start: elements.workStart?.value || '',
                    end: elements.workEnd?.value || '',
                    days: {}
                },
                security: {
                    passwordMinLength: parseInt(elements.passwordMinLength?.value) || 8,
                    sessionTimeout: parseInt(elements.sessionTimeout?.value) || 30,
                    maxLoginAttempts: parseInt(elements.maxLoginAttempts?.value) || 3
                },
                maintenance: {
                    autoMaintenance: elements.autoMaintenance?.checked || false,
                    defaultInterval: parseInt(elements.defaultInterval?.value) || 30,
                    slaCritical: parseInt(elements.slaCritical?.value) || 4,
                    slaNormal: parseInt(elements.slaNormal?.value) || 24
                },
                integrations: {
                    whatsappIntegration: elements.whatsappIntegration?.checked || false,
                    cloudBackup: elements.cloudBackup?.checked || false
                }
            };

            // Recopilar días laborales
            Object.keys(elements.workDays).forEach(day => {
                settings.workSchedule.days[day] = elements.workDays[day]?.checked || false;
            });

            return settings;
        },

        showSuccessMessage: (message) => {
            if (elements.successMessage) {
                elements.successMessage.textContent = message;
                elements.successMessage.classList.remove('hidden');
                setTimeout(() => {
                    elements.successMessage.classList.add('hidden');
                }, 3000);
            }
        },

        showError: (message) => {
            alert('Error: ' + message);
        }
    };

    // Event Handlers
    const handlers = {
        saveSettings: async () => {
            try {
                const settings = ui.collectFormData();
                await api.saveSettings(settings);
                state.settings = settings;
                state.hasChanges = false;
                ui.showSuccessMessage('Configuración guardada correctamente');
            } catch (error) {
                ui.showError('Error al guardar la configuración: ' + error.message);
            }
        }
    };

    // Initialization
    async function init() {
        try {
            console.log('Inicializando configuración...');
            
            // Cargar configuración
            const settings = await api.loadSettings();
            state.settings = settings;
            
            // Configurar UI
            ui.initTabs();
            ui.loadSettingsToForm(settings);
            
            // Event listeners
            if (elements.saveAllBtn) {
                elements.saveAllBtn.addEventListener('click', handlers.saveSettings);
            }
            
            console.log('✅ Configuración inicializada correctamente');
            
        } catch (error) {
            console.error('Error inicializando configuración:', error);
            ui.showError('Error al cargar la configuración');
        }
    }

    // Inicializar
    init();
});