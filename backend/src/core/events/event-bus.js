/**
 * GYMTEC ERP - Event Bus para Comunicación entre Módulos
 * 
 * REGLA: Usar eventos para comunicación asíncrona entre módulos.
 * PROHIBIDO: Llamar directamente funciones de otro módulo.
 * 
 * Ejemplo de uso:
 * - Emisor (tickets): eventBus.emit('TICKET_CREATED', { ticketId, clientId });
 * - Receptor (notifications): eventBus.on('TICKET_CREATED', async (data) => { ... });
 */

const EventEmitter = require('events');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(20); // Aumentar límite para múltiples módulos
    }

    /**
     * Emitir evento con logging
     * @param {string} eventName - Nombre del evento
     * @param {object} data - Datos del evento
     */
    emit(eventName, data) {
        console.log(`📡 EventBus: Emitiendo ${eventName}`, data ? JSON.stringify(data).substring(0, 100) : '');
        return super.emit(eventName, data);
    }

    /**
     * Suscribirse a un evento con logging
     * @param {string} eventName - Nombre del evento
     * @param {function} handler - Función manejadora
     */
    on(eventName, handler) {
        console.log(`📡 EventBus: Subscrito a ${eventName}`);
        return super.on(eventName, handler);
    }
}

// Singleton - una única instancia para toda la aplicación
const eventBus = new EventBus();

// Eventos disponibles (documentación)
const EVENTS = {
    // Tickets
    TICKET_CREATED: 'TICKET_CREATED',
    TICKET_UPDATED: 'TICKET_UPDATED',
    TICKET_CLOSED: 'TICKET_CLOSED',
    
    // Clientes
    CLIENT_CREATED: 'CLIENT_CREATED',
    CLIENT_UPDATED: 'CLIENT_UPDATED',
    
    // Inventario
    STOCK_LOW: 'STOCK_LOW',
    STOCK_UPDATED: 'STOCK_UPDATED',
    
    // Finanzas
    INVOICE_CREATED: 'INVOICE_CREATED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED'
};

module.exports = {
    eventBus,
    EVENTS
};
