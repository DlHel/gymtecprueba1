// Sistema de Logs Interno para Gymtec ERP
class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.isEnabled = true;
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.logLevels.DEBUG;
        
        this.init();
    }

    init() {
        // Crear panel de logs si no existe
        this.createLogPanel();
        
        // Interceptar errores globales
        window.addEventListener('error', (event) => {
            this.error('Global Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Interceptar promesas rechazadas
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled Promise Rejection', {
                reason: event.reason
            });
        });
    }

    createLogPanel() {
        // Crear botón flotante para abrir logs
        const logButton = document.createElement('div');
        logButton.id = 'log-monitor-btn';
        logButton.innerHTML = '📊';
        logButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #3b82f6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        
        logButton.addEventListener('click', () => this.toggleLogPanel());
        document.body.appendChild(logButton);

        // Crear panel de logs
        const logPanel = document.createElement('div');
        logPanel.id = 'log-monitor-panel';
        logPanel.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 400px;
            height: 300px;
            background: #1f2937;
            color: #f3f4f6;
            border-radius: 8px;
            display: none;
            flex-direction: column;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(0,0,0,0.5);
            font-family: 'Courier New', monospace;
            font-size: 12px;
        `;

        logPanel.innerHTML = `
            <div style="padding: 10px; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold;">📊 Monitor de Logs</span>
                <div>
                    <button id="clear-logs" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Limpiar</button>
                    <button id="close-logs" style="background: #6b7280; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">✕</button>
                </div>
            </div>
            <div id="log-content" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
        `;

        document.body.appendChild(logPanel);

        // Event listeners
        document.getElementById('clear-logs').addEventListener('click', () => this.clearLogs());
        document.getElementById('close-logs').addEventListener('click', () => this.toggleLogPanel());
    }

    toggleLogPanel() {
        const panel = document.getElementById('log-monitor-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
            this.updateLogDisplay();
        } else {
            panel.style.display = 'none';
        }
    }

    log(level, category, message, data = null) {
        if (!this.isEnabled || level > this.currentLevel) return;

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            level: Object.keys(this.logLevels)[level],
            category,
            message,
            data
        };

        this.logs.push(logEntry);

        // Mantener solo los últimos logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // También enviar a console
        const consoleMethod = level === 0 ? 'error' : level === 1 ? 'warn' : 'log';
        console[consoleMethod](`[${logEntry.level}] ${category}: ${message}`, data || '');

        // Actualizar display si está visible
        const panel = document.getElementById('log-monitor-panel');
        if (panel && panel.style.display === 'flex') {
            this.updateLogDisplay();
        }
    }

    error(category, message, data = null) {
        this.log(this.logLevels.ERROR, category, message, data);
    }

    warn(category, message, data = null) {
        this.log(this.logLevels.WARN, category, message, data);
    }

    info(category, message, data = null) {
        this.log(this.logLevels.INFO, category, message, data);
    }

    debug(category, message, data = null) {
        this.log(this.logLevels.DEBUG, category, message, data);
    }

    updateLogDisplay() {
        const content = document.getElementById('log-content');
        if (!content) return;

        content.innerHTML = this.logs.slice(-50).map(log => {
            const levelColors = {
                ERROR: '#ef4444',
                WARN: '#f59e0b',
                INFO: '#3b82f6',
                DEBUG: '#6b7280'
            };

            return `
                <div style="margin-bottom: 8px; padding: 4px; border-left: 3px solid ${levelColors[log.level]};">
                    <div style="color: #9ca3af; font-size: 10px;">${log.timestamp} [${log.level}]</div>
                    <div style="color: #60a5fa; font-weight: bold;">${log.category}</div>
                    <div style="color: #f3f4f6;">${log.message}</div>
                    ${log.data ? `<div style="color: #d1d5db; font-size: 10px; margin-top: 2px;">${JSON.stringify(log.data, null, 2)}</div>` : ''}
                </div>
            `;
        }).join('');

        // Auto-scroll al final
        content.scrollTop = content.scrollHeight;
    }

    clearLogs() {
        this.logs = [];
        this.updateLogDisplay();
    }

    // Métodos específicos para la aplicación
    modelAction(action, modelId, details = null) {
        this.info('MODELS', `${action} - ID: ${modelId}`, details);
    }

    photoAction(action, modelId, filename = null, details = null) {
        this.info('PHOTOS', `${action} - Model: ${modelId}${filename ? ` - File: ${filename}` : ''}`, details);
    }

    apiCall(method, url, status, details = null) {
        const level = status >= 400 ? this.logLevels.ERROR : this.logLevels.INFO;
        this.log(level, 'API', `${method} ${url} - ${status}`, details);
    }

    userAction(action, details = null) {
        this.debug('USER', action, details);
    }
}

// Crear instancia global
window.logger = new Logger();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
} 