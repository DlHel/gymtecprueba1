function resolveRouter(mod) {
    if (!mod) {
        return null;
    }

    if (typeof mod === 'function' && typeof mod.use !== 'function') {
        return null;
    }

    return mod.router || mod;
}

function mountRouter({ app, logger, mountPath, label, modulePath }) {
    const mod = require(modulePath);
    const router = resolveRouter(mod);

    if (!router) {
        throw new Error(`El módulo ${modulePath} no exporta un router de Express`);
    }

    app.use(mountPath, router);
    logger.log(`✅ Módulo cargado: ${label} -> ${mountPath}`);

    return mod;
}

function safeMount(args) {
    try {
        return mountRouter(args);
    } catch (error) {
        args.logger.warn(`⚠️ No fue posible cargar ${args.label}: ${error.message}`);
        return null;
    }
}

function registerModules({ app, db, env = process.env, logger = console }) {
    const teardownTasks = [];

    [
        ['/api/auth', 'auth', './auth/auth.routes'],
        ['/api', 'system', './system/system.routes'],
        ['/api', 'users', './users/users.routes'],
        ['/api', 'clients', './clients/clients.routes'],
        ['/api', 'locations', './locations/locations.routes'],
        ['/api', 'equipment', './equipment/equipment.routes'],
        ['/api', 'models', './models/models.routes'],
        ['/api', 'tickets', './tickets/tickets.routes'],
        ['/api', 'gimnacion', './gimnacion/gimnacion.routes'],
        ['/api', 'workforce', './workforce/workforce.routes'],
        ['/api', 'dashboard', './dashboard/dashboard.routes'],
        ['/api', 'dashboard-correlations', './dashboard-correlations/dashboard-correlations.routes'],
        ['/api', 'finance', './finance/finance.routes'],
        ['/api/inventory', 'inventory', './inventory/inventory.routes'],
        ['/api/maintenance-tasks', 'planning', './planning/planning.routes'],
        ['/api', 'reports', './reports/reports.routes'],
        ['/api', 'contracts-sla', './contracts-sla/contracts-sla.routes'],
        ['/api', 'checklist', './checklist/checklist.routes'],
        ['/api', 'workflow', './workflow/workflow.routes'],
        ['/api', 'task-generator', './task-generator/task-generator.routes'],
        ['/api', 'intelligent-assignment', './intelligent-assignment/intelligent-assignment.routes'],
        ['/api/notifications', 'notifications', './notifications/notifications.routes'],
        ['/api/notifications', 'notifications-fixed', './notifications-fixed/notifications-fixed.routes'],
        ['/api/purchase-orders', 'purchase-orders', './purchase-orders/purchase-orders.routes'],
        ['/api', 'payroll', './payroll/payroll.routes']
    ].forEach(([mountPath, label, modulePath]) => {
        safeMount({ app, logger, mountPath, label, modulePath });
    });

    const slaProcessorModule = safeMount({
        app,
        logger,
        mountPath: '/api/sla',
        label: 'sla-processor',
        modulePath: './sla-processor/sla-processor.routes'
    });

    if (slaProcessorModule && typeof slaProcessorModule.initializeSLAProcessor === 'function') {
        slaProcessorModule.initializeSLAProcessor(db);

        if ((env.NODE_ENV || '').toLowerCase() !== 'test' && typeof slaProcessorModule.startAutomaticMonitoring === 'function') {
            slaProcessorModule.startAutomaticMonitoring(db, 5);

            if (typeof slaProcessorModule.stopAutomaticMonitoring === 'function') {
                teardownTasks.push(() => slaProcessorModule.stopAutomaticMonitoring());
            }
        }
    }

    return {
        stop() {
            while (teardownTasks.length > 0) {
                const task = teardownTasks.pop();

                try {
                    task();
                } catch (error) {
                    logger.warn(`⚠️ No fue posible detener un servicio de módulos: ${error.message}`);
                }
            }
        }
    };
}

module.exports = {
    registerModules
};
