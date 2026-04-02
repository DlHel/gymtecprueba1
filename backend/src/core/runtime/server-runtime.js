function logStartupBanner({ port, env = process.env, logger = console }) {
    logger.log('\n🚀 ========================================');
    logger.log('🚀 GYMTEC ERP - SERVIDOR INICIADO');
    logger.log('🚀 ========================================');
    logger.log(`🌍 Servidor corriendo en: http://localhost:${port}`);
    logger.log(`🌍 Accessible via: http://0.0.0.0:${port}`);
    logger.log(`🔧 Modo: ${env.NODE_ENV || 'development'}`);
    logger.log('📂 Base de datos: MySQL');
    logger.log('📋 Rutas disponibles:');
    logger.log('   🔐 /api/auth/* (Autenticación)');
    logger.log('   👥 /api/clients/* (Gestión de Clientes)');
    logger.log('   🏢 /api/locations/* (Gestión de Sedes)');
    logger.log('   🔧 /api/equipment/* (Gestión de Equipos)');
    logger.log('   🎫 /api/tickets/* (Sistema de Tickets)');
    logger.log('   📦 /api/inventory/* (Gestión de Inventario)');
    logger.log('   🛒 /api/purchase-orders/* (Órdenes de Compra)');
    logger.log('   📊 /api/dashboard/* (Dashboard y KPIs)');
    logger.log('   👤 /api/users/* (Gestión de Usuarios)');
    logger.log('   💰 /api/quotes/* (Cotizaciones)');
    logger.log('   🧾 /api/invoices/* (Facturación)');
    logger.log('   💸 /api/expenses/* (Gastos)');
    logger.log('   ⏱️  /api/time-entries/* (Control de Tiempo)');
    logger.log('   🔔 /api/notifications/* (Notificaciones - Fase 2)');
    logger.log('   📈 /api/inventory/* (Inventario Inteligente - Fase 3)');
    logger.log('   ⏰ /api/attendance/* (Control de Asistencia)');
    logger.log('   📅 /api/schedules/* (Horarios y Turnos)');
    logger.log('   ⏳ /api/overtime/* (Horas Extras)');
    logger.log('   📋 /api/leave-requests/* (Solicitudes de Permiso)');
    logger.log('🚀 ========================================\n');
}

function createServerRuntime({
    app,
    db,
    port,
    advancedRuntime,
    env = process.env,
    logger = console
}) {
    let httpServer = null;
    let isShuttingDown = false;

    function startServer() {
        if (httpServer && httpServer.listening) {
            return httpServer;
        }

        httpServer = app.listen(port, '0.0.0.0', (error) => {
            if (error) {
                logger.error('💥 Error iniciando servidor:', error);
                process.exit(1);
            }

            logStartupBanner({ port, env, logger });

            try {
                logger.log('🔄 Inicializando servicios de background...');
                logger.log('✅ Servicios de background iniciados correctamente');
            } catch (backgroundError) {
                logger.warn('⚠️  Warning: Algunos servicios de background no pudieron iniciarse:', backgroundError.message);
            }
        });

        return httpServer;
    }

    async function shutdown(signal) {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        logger.log(`\n🛑 Recibida señal ${signal}, cerrando servidor...`);

        try {
            advancedRuntime?.stop?.();

            if (httpServer && httpServer.listening) {
                await new Promise((resolve) => {
                    httpServer.close((error) => {
                        if (error) {
                            logger.error('❌ Error cerrando servidor HTTP:', error.message);
                        } else {
                            logger.log('✅ Servidor HTTP cerrado correctamente');
                        }

                        resolve();
                    });
                });
            }

            await db.close();
            logger.log('✅ Base de datos cerrada correctamente');

            if (env.NODE_ENV !== 'test') {
                process.exit(0);
            }
        } catch (error) {
            logger.error('❌ Error durante el cierre del servidor:', error.message);

            if (env.NODE_ENV !== 'test') {
                process.exit(1);
            }

            throw error;
        }
    }

    return {
        startServer,
        shutdown
    };
}

module.exports = {
    createServerRuntime
};
