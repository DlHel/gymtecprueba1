import { buildUiPage } from './helpers.mjs';

export const baselineFlowSpecs = [
    {
        key: 'dashboard',
        page: buildUiPage('index.html'),
        ownerFiles: ['frontend/index.html', 'frontend/js/dashboard.js']
    },
    {
        key: 'clients',
        page: buildUiPage('clientes.html'),
        ownerFiles: ['frontend/clientes.html', 'frontend/js/clientes.js']
    },
    {
        key: 'equipment',
        page: buildUiPage('equipo.html'),
        ownerFiles: ['frontend/equipo.html', 'frontend/js/equipo.js']
    },
    {
        key: 'equipment-gallery',
        page: buildUiPage('equipos.html'),
        ownerFiles: ['frontend/equipos.html', 'frontend/js/equipos.js'],
        async run(ctx) {
            await ctx.expectVisible('#filter-search', 'Buscador de equipos visible');
            await ctx.expectVisible('#equipment-container', 'Contenedor principal de equipos visible');
        }
    },
    {
        key: 'planning',
        page: buildUiPage('planificador.html'),
        ownerFiles: ['frontend/planificador.html', 'frontend/js/planificador.js'],
        actions: [
            {
                label: 'Abrir modal de nueva tarea',
                assertionType: 'modal',
                target: { role: 'button', name: /Nueva Tarea/i },
                expectVisible: '#task-modal',
                ownerFiles: ['frontend/planificador.html', 'frontend/js/planificador.js']
            }
        ]
    },
    {
        key: 'contracts',
        page: buildUiPage('contratos.html'),
        ownerFiles: ['frontend/contratos.html', 'frontend/js/contratos.js'],
        actions: [
            {
                label: 'Abrir modal de contrato',
                assertionType: 'modal',
                target: { role: 'button', name: /Nuevo Contrato/i },
                expectVisible: '#contract-modal',
                ownerFiles: ['frontend/contratos.html', 'frontend/js/contratos.js']
            }
        ]
    },
    {
        key: 'contracts-new',
        page: buildUiPage('contratos-new.html'),
        ownerFiles: ['frontend/contratos-new.html', 'frontend/js/contratos-new.js'],
        actions: [
            {
                label: 'Abrir modal de contrato rediseñado',
                assertionType: 'modal',
                target: { id: 'create-contract-btn' },
                expectVisible: '#contract-modal',
                ownerFiles: ['frontend/contratos-new.html', 'frontend/js/contratos-new.js']
            }
        ],
        modalOwnership: [
            {
                label: 'Modal de contrato rediseñado',
                selector: '#contract-modal',
                ownerFiles: ['frontend/contratos-new.html', 'frontend/js/contratos-new.js']
            }
        ]
    },
    {
        key: 'models',
        page: buildUiPage('modelos.html'),
        ownerFiles: ['frontend/modelos.html', 'frontend/js/modelos.js']
    },
    {
        key: 'notifications',
        page: buildUiPage('notifications-dashboard.html'),
        ownerFiles: ['frontend/notifications-dashboard.html', 'frontend/js/notifications-dashboard.js'],
        actions: [
            {
                label: 'Cambiar a pestaña plantillas',
                target: { id: 'tab-templates' },
                expectVisible: '#content-templates:not(.hidden)'
            },
            {
                label: 'Cambiar a pestaña análisis',
                target: { id: 'tab-analytics' },
                expectVisible: '#content-analytics:not(.hidden)'
            }
        ]
    },
    {
        key: 'workforce',
        page: buildUiPage('asistencia.html'),
        ownerFiles: ['frontend/asistencia.html', 'frontend/js/asistencia.js'],
        actions: [
            {
                label: 'Cambiar a tab horario',
                target: { selector: 'button[data-tab="schedule"]' },
                expectVisible: 'button[data-tab="schedule"].tab-active'
            },
            {
                label: 'Cambiar a tab horas extras',
                target: { selector: 'button[data-tab="overtime"]' },
                expectVisible: 'button[data-tab="overtime"].tab-active'
            },
            {
                label: 'Cambiar a tab permisos',
                target: { selector: 'button[data-tab="leave"]' },
                expectVisible: 'button[data-tab="leave"].tab-active'
            }
        ]
    },
    {
        key: 'reports',
        page: buildUiPage('reportes.html'),
        ownerFiles: ['frontend/reportes.html', 'frontend/js/reportes.js', 'frontend/js/informes-tecnicos.js'],
        actions: [
            {
                label: 'Abrir modal de informe técnico',
                assertionType: 'modal',
                target: { role: 'button', name: /Generar Informe Técnico/i },
                expectVisible: '#informe-tecnico-modal',
                ownerFiles: ['frontend/reportes.html', 'frontend/js/reportes.js', 'frontend/js/informes-tecnicos.js']
            }
        ]
    },
    {
        key: 'config',
        page: buildUiPage('configuracion.html'),
        ownerFiles: ['frontend/configuracion.html', 'frontend/js/configuracion.js'],
        actions: [
            {
                label: 'Cambiar a tab notificaciones',
                target: { selector: 'button[data-tab="notifications"]' },
                expectVisible: 'button[data-tab="notifications"].active'
            },
            {
                label: 'Cambiar a tab seguridad',
                target: { selector: 'button[data-tab="security"]' },
                expectVisible: 'button[data-tab="security"].active'
            },
            {
                label: 'Cambiar a tab mantenimiento',
                target: { selector: 'button[data-tab="maintenance"]' },
                expectVisible: 'button[data-tab="maintenance"].active'
            }
        ]
    },
    {
        key: 'personal',
        page: buildUiPage('personal.html'),
        ownerFiles: ['frontend/personal.html', 'frontend/js/personal.js']
    }
];
