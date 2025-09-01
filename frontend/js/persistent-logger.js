/**
 * PERSISTENT DEBUG LOGGER - Gymtec ERP
 * Mantiene logs en localStorage para poder verlos después de redirecciones
 */

class PersistentLogger {
    constructor() {
        this.storageKey = 'gymtec_debug_logs';
        this.maxLogs = 100;
        this.sessionId = Date.now().toString(36);
        
        // Cargar logs existentes
        this.logs = this.loadLogs();
        
        // Interceptar console.log, console.error, etc.
        this.interceptConsole();
        
        // Limpiar logs antiguos (más de 1 hora)
        this.cleanOldLogs();
        
        this.log('🚀 PersistentLogger iniciado', 'system');
    }
    
    loadLogs() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }
    
    saveLogs() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.logs.slice(-this.maxLogs)));
        } catch (e) {
            console.warn('No se pudieron guardar los logs:', e);
        }
    }
    
    log(message, type = 'info', source = 'unknown') {
        const entry = {
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString(),
            message,
            type,
            source,
            page: window.location.pathname,
            sessionId: this.sessionId
        };
        
        this.logs.push(entry);
        this.saveLogs();
        
        // También log normal para la consola actual
        const prefix = `[${entry.time}] [${source.toUpperCase()}]`;
        switch (type) {
            case 'error':
                console.error(prefix, message);
                break;
            case 'warn':
                console.warn(prefix, message);
                break;
            case 'success':
                console.log(`%c${prefix} ${message}`, 'color: #10b981');
                break;
            default:
                console.log(prefix, message);
        }
    }
    
    interceptConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = (...args) => {
            const message = args.join(' ');
            if (message.includes('🔍') || message.includes('✅') || message.includes('❌') || message.includes('⚠️')) {
                this.log(message, 'info', 'console');
            }
            originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
            const message = args.join(' ');
            this.log(message, 'error', 'console');
            originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
            const message = args.join(' ');
            this.log(message, 'warn', 'console');
            originalWarn.apply(console, args);
        };
    }
    
    cleanOldLogs() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.logs = this.logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime > oneHourAgo;
        });
        this.saveLogs();
    }
    
    getLogs(filterBy = null) {
        if (!filterBy) return this.logs;
        
        return this.logs.filter(log => {
            if (filterBy.type && log.type !== filterBy.type) return false;
            if (filterBy.source && log.source !== filterBy.source) return false;
            if (filterBy.page && !log.page.includes(filterBy.page)) return false;
            if (filterBy.session && log.sessionId !== filterBy.session) return false;
            return true;
        });
    }
    
    clearLogs() {
        this.logs = [];
        this.saveLogs();
        this.log('🧹 Logs limpiados', 'system');
    }
    
    exportLogs() {
        const logText = this.logs.map(log => 
            `[${log.time}] [${log.source.toUpperCase()}] [${log.type.toUpperCase()}] ${log.message} (${log.page})`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gymtec-debug-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Crear instancia global
window.DebugLogger = new PersistentLogger();

// Funciones globales de utilidad
window.viewLogs = function(filter = null) {
    const logs = DebugLogger.getLogs(filter);
    console.group('📋 Debug Logs');
    logs.forEach(log => {
        const style = log.type === 'error' ? 'color: #ef4444' : 
                     log.type === 'warn' ? 'color: #f59e0b' : 
                     log.type === 'success' ? 'color: #10b981' : 'color: #6b7280';
        console.log(`%c[${log.time}] [${log.page}] ${log.message}`, style);
    });
    console.groupEnd();
    return logs;
};

window.viewAuthLogs = () => viewLogs({ source: 'auth' });
window.viewTicketsLogs = () => viewLogs({ page: 'tickets' });
window.clearDebugLogs = () => DebugLogger.clearLogs();
window.exportLogs = () => DebugLogger.exportLogs();

// Log de autenticación específicos
window.logAuth = (message, type = 'info') => DebugLogger.log(message, type, 'auth');
window.logTickets = (message, type = 'info') => DebugLogger.log(message, type, 'tickets');
window.logNavigation = (message, type = 'info') => DebugLogger.log(message, type, 'navigation');

console.log('✅ PersistentLogger cargado');
console.log('💡 Funciones disponibles:');
console.log('  - viewLogs() - Ver todos los logs');
console.log('  - viewAuthLogs() - Ver logs de autenticación');
console.log('  - viewTicketsLogs() - Ver logs de tickets');
console.log('  - clearDebugLogs() - Limpiar logs');
console.log('  - exportLogs() - Exportar logs a archivo');
