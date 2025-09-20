const { runNotificationProcessor } = require('./notification-processor');

/**
 * Hook para procesar notificaciones después de operaciones de tickets
 */
async function processNotificationsAfterTicketOperation(operation = 'create', ticketId = null) {
    try {
        console.log(`🔔 Procesando notificaciones después de ${operation} del ticket ${ticketId || 'N/A'}`);
        
        // Procesar notificaciones con un pequeño delay para asegurar que los triggers se ejecutaron
        setTimeout(async () => {
            try {
                await runNotificationProcessor();
                console.log(`✅ Notificaciones procesadas para ${operation} del ticket ${ticketId || 'N/A'}`);
            } catch (error) {
                console.error(`❌ Error procesando notificaciones para ${operation}:`, error.message);
            }
        }, 1000); // 1 segundo de delay
        
    } catch (error) {
        console.error('❌ Error en hook de notificaciones:', error.message);
    }
}

/**
 * Middleware para integrar notificaciones en rutas de tickets
 */
function notificationMiddleware(operation) {
    return (req, res, next) => {
        // Guardar la función original de end para interceptar la respuesta
        const originalEnd = res.end;
        
        res.end = function(chunk, encoding) {
            // Llamar a la función original primero
            originalEnd.call(this, chunk, encoding);
            
            // Si la respuesta fue exitosa, procesar notificaciones
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const ticketId = req.body?.id || req.params?.id || req.ticketId;
                processNotificationsAfterTicketOperation(operation, ticketId);
            }
        };
        
        next();
    };
}

/**
 * Hook directo para usar en las rutas después de operaciones exitosas
 */
async function triggerNotificationProcessing(operation, ticketId = null) {
    try {
        // Delay pequeño para asegurar que los triggers de BD se ejecutaron
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`🔔 Iniciando procesamiento de notificaciones (${operation}, ticket ${ticketId})`);
        await runNotificationProcessor();
        console.log(`✅ Procesamiento de notificaciones completado`);
        
    } catch (error) {
        console.error(`❌ Error en procesamiento de notificaciones:`, error.message);
        // No lanzar error para no afectar la operación principal
    }
}

module.exports = {
    processNotificationsAfterTicketOperation,
    notificationMiddleware,
    triggerNotificationProcessing
};