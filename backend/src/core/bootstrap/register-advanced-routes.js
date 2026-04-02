function registerAdvancedRoutes({ app, db, env = process.env, logger = console }) {
    const teardownTasks = [];

    try {
        const contractsSlaRoutes = require('../../routes/contracts-sla');
        const checklistRoutes = require('../../routes/checklist');
        const workflowRoutes = require('../../routes/workflow');
        const dashboardCorrelationsRoutes = require('../../routes/dashboard-correlations');
        const taskGeneratorRoutes = require('../../routes/task-generator');
        const intelligentAssignmentRoutes = require('../../routes/intelligent-assignment');
        const {
            router: slaProcessorRoutes,
            initializeSLAProcessor,
            startAutomaticMonitoring,
            stopAutomaticMonitoring
        } = require('../../routes/sla-processor');

        app.use('/api', contractsSlaRoutes);
        app.use('/api', checklistRoutes);
        app.use('/api', workflowRoutes);
        app.use('/api', dashboardCorrelationsRoutes);
        app.use('/api', taskGeneratorRoutes);
        app.use('/api', intelligentAssignmentRoutes);
        app.use('/api/sla', slaProcessorRoutes);

        initializeSLAProcessor(db);
        if (env.NODE_ENV !== 'test') {
            startAutomaticMonitoring(db, 5);
            teardownTasks.push(() => stopAutomaticMonitoring());
        }

        logger.log('✅ Fase 1 Routes loaded: Contratos SLA, Checklist, Workflow, Dashboard Correlations, Task Generator, Intelligent Assignment, SLA Processor');
    } catch (error) {
        logger.warn('⚠️  Warning: Some Fase 1 routes could not be loaded:', error.message);
    }

    try {
        const notificationsRoutes = require('../../routes/notifications');
        const notificationsFixedRoutes = require('../../routes/notifications-fixed');

        app.use('/api/notifications', notificationsRoutes);
        app.use('/api/notifications', notificationsFixedRoutes);

        logger.log('✅ Fase 2 Routes loaded: Sistema de Notificaciones (Production mode)');
    } catch (error) {
        logger.warn('⚠️  Warning: Some Fase 2 routes could not be loaded:', error.message);
    }

    try {
        const payrollRoutes = require('../../routes/payroll-chile');
        const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
        const { toMySQLDateTime } = require('../utils/datetime');

        payrollRoutes(app, db, authenticateToken, requireRole, toMySQLDateTime);
        logger.log('✅ Payroll Routes loaded: Sistema de Nómina Chile');
    } catch (error) {
        logger.warn('⚠️  Warning: Some Fase 2 routes could not be loaded:', error.message);
    }

    try {
        const purchaseOrdersRoutes = require('../../routes/purchase-orders');
        app.use('/api/purchase-orders', purchaseOrdersRoutes);

        logger.log('✅ Fase 3 Routes loaded: Sistema de Inventario Inteligente y Reportes');
        logger.log('   📦 /api/inventory/* (Gestión de Inventario)');
        logger.log('   🛒 /api/purchase-orders/* (Órdenes de Compra)');
    } catch (error) {
        logger.warn('⚠️  Warning: Some Fase 3 routes could not be loaded:', error.message);
    }

    return {
        stop() {
            while (teardownTasks.length > 0) {
                const stopTask = teardownTasks.pop();

                try {
                    stopTask();
                } catch (error) {
                    logger.warn('⚠️  Warning: No fue posible detener un servicio avanzado:', error.message);
                }
            }
        }
    };
}

module.exports = {
    registerAdvancedRoutes
};
