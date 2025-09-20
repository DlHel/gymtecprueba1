# Gymtec ERP - GitHub Copilot Professional Configuration v3.0

Este es un sistema ERP profesional de gestión de mantenimiento de equipos de gimnasio con operaciones CRUD avanzadas, autenticación empresarial, reportes ejecutivos, y **sistema de referencia @bitacora**.

## 🚀 GUÍA RÁPIDA PARA AGENTES AI

### Stack Tecnológico Principal
- **Backend**: Express.js (`backend/src/server-clean.js`) + MySQL2 + JWT Auth → Puerto 3000
- **Frontend**: Vanilla JavaScript + Tailwind CSS (NO frameworks) → Puerto 8080  
- **BD**: MySQL 8.0+ con 37+ tablas relacionadas
- **Desarrollo**: `start-servers.bat` → Inicia ambos servidores automáticamente

### Comandos Esenciales
```bash
start-servers.bat              # Comando principal - inicia todo
cd backend && npm start        # Solo backend con server-clean.js
cd frontend && python -m http.server 8080  # Solo frontend estático
```

### Patrones de Código Críticos
1. **Frontend Auth**: SIEMPRE usar `AuthManager.isAuthenticated()` antes que nada
2. **API Calls**: SIEMPRE usar `authenticatedFetch()` en lugar de `fetch()`
3. **DB Queries**: SIEMPRE usar adaptador con callbacks: `db.all(sql, params, callback)`
4. **Module Pattern**: `state` + `api` + `ui` + `init()` en `DOMContentLoaded`

### Sistema @bitacora
- `@bitacora` → Contexto completo desde `docs/BITACORA_PROYECTO.md`
- `@bitacora api` → Patrones de endpoints
- `@bitacora database` → Esquema de 37+ tablas
- `@bitacora authentication` → Sistema JWT + AuthManager

## 🎯 SISTEMA @BITACORA - REFERENCIA AUTOMÁTICA COMPLETA

**CRÍTICO**: Cuando los usuarios mencionen `@bitacora`, automáticamente referenciar el contexto completo del proyecto desde `docs/BITACORA_PROYECTO.md` y documentación relacionada. Esto elimina la necesidad de revisión constante de código.

### Comandos de Referencia @bitacora:
- `@bitacora` → Contexto completo del proyecto
- `@bitacora api` → Endpoints y patrones API  
- `@bitacora database` → Esquema y relaciones (37+ tablas)
- `@bitacora authentication` → Sistema JWT auth
- `@bitacora frontend` → Arquitectura Vanilla JS
- `@bitacora backend` → Patrones Express + MySQL2
- `@bitacora debug` → Sistema debug y logging
- `@bitacora security` → Medidas de seguridad
- `@bitacora deployment` → Configuración despliegue
- `@bitacora workflow` → Flujo desarrollo start-servers.bat

## 🏗️ Arquitectura del Sistema & Stack Tecnológico (Actualizado 2025)

**Stack Principal**: Node.js + Express.js + MySQL2 + Vanilla JavaScript (SIN frameworks frontend)

- **Backend**: Express.js REST API (`backend/src/server-clean.js` - servidor principal optimizado) con autenticación JWT en puerto 3000
- **Frontend**: HTML/CSS/JavaScript modular con Tailwind CSS en puerto 8080 (NO frameworks como React/Vue)
- **Base de Datos**: MySQL 8.0+ con 37+ tablas, restricciones FK comprehensivas, y tipos ENUM
- **Gestión Archivos**: Middleware Multer para uploads, codificación Base64 para almacenamiento BD
- **Sistema Debug**: Logging avanzado con Winston, monitoreo performance, integración VS Code
- **Documentación**: Carpeta protegida /docs/ con sistema referencia @bitacora
- **Flujo Desarrollo**: Automatización `start-servers.bat` con verificación dependencias MySQL
- **Adaptador BD**: `backend/src/db-adapter.js` - abstracción SQLite→MySQL con compatibilidad callbacks
- **Configuración Auto**: `frontend/js/config.js` - detección automática de entorno (localhost/Codespaces)

### Arquitectura Crítica de Flujo de Datos
1. **Environment Detection**: Frontend auto-detects via `frontend/js/config.js` (localhost/Codespaces)
2. **Database Abstraction**: Backend uses SQLite→MySQL adapter pattern in `backend/src/db-adapter.js`
3. **Module Pattern**: All frontend modules follow: `state` + `api` + `DOMContentLoaded` + error handling
4. **@bitacora Integration**: Automatic context reference for consistent development

## 📊 Esquema de Base de Datos - INFORMACIÓN CRÍTICA

### TABLAS PRINCIPALES (37+ tablas activas):

**Core Tables:**
- `Users` - Sistema de usuarios con roles (admin, manager, technician, client)
- `Clients` - Clientes del gimnasio con información de contacto
- `Locations` - Ubicaciones/sedes de los gimnasios
- `EquipmentModels` - Modelos de equipos (Cardio, Fuerza, Funcional, Accesorios)
- `Equipment` - Equipos específicos instalados (SIN columna 'status' - usar 'activo')

**Sistema de Tickets:**
- `Tickets` - Tickets de mantenimiento con workflow_stage y sla_status
- `TicketChecklist` - Checklists obligatorios por ticket
- `ChecklistTemplates` - Templates reutilizables de checklist
- `TicketPhotos` - Fotos en Base64 asociadas a tickets

**Sistema de Inventario (Fase 3):**
- `Inventory` - Inventario principal con stock levels
- `InventoryCategories` - Categorías de inventario
- `InventoryMovements` - Movimientos de entrada/salida
- `Suppliers` - Proveedores con información de contacto
- `PurchaseOrders` - Órdenes de compra con líneas de detalle

**Sistema Financiero:**
- `Contracts` - Contratos con clientes y condiciones SLA
- `Expenses` - Gastos categorizados con estados de aprobación
- `ExpenseCategories` - Categorías de gastos
- `SystemSettings` - Configuraciones del sistema

### ⚠️ IMPORTANTE - Esquemas de Columnas Críticas:

```sql
-- Equipment: NO tiene columna 'status' - usar 'activo' hardcoded
Equipment (id, name, model_id, location_id, serial_number, installation_date, activo, ...)

-- Tickets: workflow completo con etapas
Tickets (id, title, description, priority, status, workflow_stage, sla_status, sla_deadline, ...)

-- Inventory: Sistema completo de stock
Inventory (id, item_code, item_name, current_stock, minimum_stock, unit_cost, ...)
```

## 🔐 Sistema de Autenticación - PATRONES OBLIGATORIOS

### AuthManager Frontend (Critical Component):

```javascript
// frontend/js/auth.js - AuthManager class disponible globalmente
window.AuthManager = {
    // JWT token management
    saveToken: (token) => localStorage.setItem('authToken', token),
    getToken: () => localStorage.getItem('authToken'),
    removeToken: () => localStorage.removeItem('authToken'),
    
    // User session management  
    isAuthenticated: () => !!AuthManager.getToken(),
    getCurrentUser: () => { /* returns user from token */ },
    getUserRole: () => { /* extracts role from JWT */ },
    
    // Page protection
    logout: () => { /* clears token and redirects */ }
};

// REQUIRED: Use in all protected pages
if (!AuthManager.isAuthenticated()) {
    window.location.href = '/login.html';
}

// REQUIRED: Use for all API calls
function authenticatedFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${AuthManager.getToken()}`
        }
    });
}
```

### Backend JWT Patterns (Critical):

```javascript
// REQUIRED: Token verification middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// REQUIRED: Role-based authorization
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// USAGE: Apply to all protected routes
app.get('/api/protected-endpoint', authenticateToken, requireRole(['admin', 'manager']), handler);
```

## 🚀 Comandos de Desarrollo Críticos (2025 Update)

### FLUJO PRINCIPAL DE DESARROLLO
```bash
# ✅ COMANDO PRINCIPAL - Inicia todo automáticamente
start-servers.bat  # Verifica MySQL, inicia backend:3000 + frontend:8080

# ✅ COMANDOS VS CODE TASKS (Ctrl+Shift+P > "Tasks: Run Task")
🚀 Start Development Servers    # Ejecuta start-servers.bat
🔧 Backend Only                # Solo backend Express en puerto 3000
🌐 Frontend Only               # Solo frontend estático en puerto 8080
🗄️ Setup MySQL Database         # Configurar base de datos inicial
🔄 Reset Database              # Resetear y recrear todas las tablas
🧪 Test API Endpoints          # Probar conexión BD y endpoints
📊 Generate Test Data          # Generar datos de prueba iniciales
```

### DESARROLLO INDIVIDUAL (cuando sea necesario)
```bash
# Backend solamente
cd backend && npm start    # Usa server-clean.js en puerto 3000
cd backend && npm run dev  # Con nodemon para auto-restart

# Frontend solamente  
cd frontend && python -m http.server 8080  # Servidor estático Python

# Gestión de base de datos
cd backend && npm run setup-mysql     # Ejecutar setup de BD
cd backend && node create-admin-user.js  # Crear usuario admin inicial
```

### PREREQUISITOS CRÍTICOS
1. **MySQL 8.0+** corriendo en localhost:3306
2. **Node.js 16+** instalado
3. **backend/config.env** configurado (copiar de config.env.example)
4. **Python** instalado para servidor frontend estático

### VERIFICACIÓN DEL ENTORNO
- `start-servers.bat` verifica automáticamente todos los prerequisitos
- Backend disponible en: http://localhost:3000
- Frontend disponible en: http://localhost:8080  
- Auto-detección de entorno en `frontend/js/config.js`

## 🧪 TESTING Y CALIDAD DE CÓDIGO

### Estado Actual del Testing
- **Backend**: Configurado con Jest en package.json (pendiente implementación)
- **Frontend**: Testing manual con herramientas de navegador  
- **E2E**: Directorio `e2e-tests/` preparado (sin implementación activa)
- **API Testing**: Archivos `.http` para testing manual de endpoints

### Herramientas de Testing Disponibles
```bash
# Backend testing (cuando esté implementado)
cd backend && npm test

# API testing manual
# Usar api-tests.http con extensión REST Client de VS Code

# Testing de endpoints específicos
cd backend && node test-endpoints.js
cd backend && node test-mysql-connection.js
```

### Verificación Manual Crítica
1. **Conectividad BD**: MySQL debe estar corriendo en puerto 3306
2. **Autenticación**: Probar login con usuario admin creado
3. **API Endpoints**: Verificar respuestas JSON correctas
4. **Frontend**: Confirmar carga de módulos sin errores 404

## 📋 Enterprise Code Patterns & Standards (2025 Edition)

### Backend Express.js + MySQL Best Practices (Updated)
```javascript
// Standard authenticated API route pattern with enhanced debugging
app.get('/api/endpoint', authenticateToken, requireRole('admin'), (req, res) => {
    const debug = require('debug')('gymtec:api');
    const performanceMonitor = require('../debug/performance-monitor');
    
    performanceMonitor.start('endpoint-operation');
    
    const sql = `
        SELECT col1, col2, col3 
        FROM table 
        WHERE condition = ? AND status = ?
        ORDER BY created_at DESC
        LIMIT ?
    `;
    
    debug(`Executing query: ${sql}`, { params: [param1, param2, limit] });
    
    db.all(sql, [param1, param2, limit], (err, rows) => {
        performanceMonitor.end('endpoint-operation');
        
        if (err) {
            logger.error('Database error in endpoint', {
                error: err.message,
                sql: sql,
                params: [param1, param2, limit],
                timestamp: new Date().toISOString(),
                userContext: req.user
            });
            
            res.status(500).json({ 
                error: 'Internal server error',
                code: 'DB_ERROR',
                timestamp: new Date().toISOString(),
                requestId: req.id
            });
            return;
        }
        
        logger.info('Query executed successfully', { 
            rowCount: rows.length,
            endpoint: req.path,
            userId: req.user?.id 
        });
        
        res.json({ 
            message: "success", 
            data: rows,
            metadata: { 
                total: rows.length, 
                timestamp: new Date().toISOString(),
                requestId: req.id
            }
        });
    });
});

// CRITICAL: Always use parameterized queries for security
// CRITICAL: Include comprehensive error handling and logging with context
// CRITICAL: Return consistent JSON response format with metadata
// CRITICAL: Use performance monitoring for critical operations
```

### Frontend Vanilla JavaScript Architecture (Enhanced 2025)
```javascript
// Professional module pattern with comprehensive state management and debug
document.addEventListener('DOMContentLoaded', () => {
    const state = {
        data: [],
        currentItem: null,
        isLoading: false,
        error: null,
        filters: {},
        pagination: { page: 1, limit: 20, total: 0 },
        lastUpdate: null
    };
    
    const api = {
        getData: async (params = {}) => {
            try {
                const queryString = new URLSearchParams(params).toString();
                const response = await authenticatedFetch(`${API_URL}/endpoint?${queryString}`);
                
                // Debug API calls in development
                if (DebugUtils.isDebugMode()) {
                    DebugUtils.logAPICall(`${API_URL}/endpoint`, 'GET', params, response);
                }
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
                }
                
                const result = await response.json();
                
                // Log successful operations
                console.log('✅ API Success:', {
                    endpoint: `/endpoint`,
                    method: 'GET',
                    params,
                    resultCount: result.data?.length || 0,
                    timestamp: new Date().toISOString()
                });
                
                return result;
            } catch (error) {
                console.error('❌ API Error:', {
                    endpoint: `/endpoint`,
                    method: 'GET',
                    params,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        }
    };
    
    const ui = {
        showLoading: () => {
            const loader = document.getElementById('loading-state');
            if (loader) {
                loader.classList.remove('hidden');
                console.log('🔄 Loading state activated');
            }
        },
        hideLoading: () => {
            const loader = document.getElementById('loading-state');
            if (loader) {
                loader.classList.add('hidden');
                console.log('✅ Loading state deactivated');
            }
        },
        showError: (message) => {
            console.error('❌ UI Error:', message);
            const errorElement = document.getElementById('error-display');
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.classList.remove('hidden');
            }
            // Show user-friendly error notification with auto-hide
            setTimeout(() => {
                if (errorElement) errorElement.classList.add('hidden');
            }, 5000);
        },
        updateTable: (data) => {
            // Enhanced table update with accessibility and performance
            const tableBody = document.querySelector('#data-table tbody');
            if (!tableBody) return;
            
            // Performance optimization: document fragment
            const fragment = document.createDocumentFragment();
            
            data.forEach((item, index) => {
                const row = document.createElement('tr');
                row.setAttribute('role', 'row');
                row.setAttribute('aria-rowindex', index + 1);
                // Add table row content with accessibility
                fragment.appendChild(row);
            });
            
            tableBody.innerHTML = '';
            tableBody.appendChild(fragment);
            
            console.log('📊 Table updated:', { rowCount: data.length });
        }
    };
    
    // Professional initialization with comprehensive error boundaries
    async function init() {
        try {
            console.log('🚀 Initializing module...');
            ui.showLoading();
            
            // Performance tracking
            const startTime = performance.now();
            
            await loadInitialData();
            setupEventListeners();
            
            const endTime = performance.now();
            console.log('✅ Module initialized successfully', {
                initTime: `${(endTime - startTime).toFixed(2)}ms`,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Initialization failed:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            ui.showError('Failed to initialize module. Please refresh the page.');
        } finally {
            ui.hideLoading();
        }
    }
    
    // Initialize with error recovery
    init().catch(error => {
        console.error('💥 Critical initialization error:', error);
    });
});
```

### Advanced Error Handling Patterns (2025 Best Practices)
```javascript
// Comprehensive error handling with user feedback and logging
class ErrorHandler {
    static handle(error, context = '', userFriendly = true) {
        const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.error(`❌ ${context} [${errorId}]:`, {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        // Log to external service in production
        if (process.env.NODE_ENV === 'production') {
            this.logToService(error, context, errorId);
        }
        
        // User-friendly error messages with reference ID
        if (userFriendly) {
            const userMessage = this.getUserMessage(error);
            this.showUserNotification(`${userMessage} (Ref: ${errorId})`, 'error');
        }
        
        return errorId;
    }
    
    static getUserMessage(error) {
        const errorMap = {
            'NETWORK_ERROR': 'Connection problem. Please check your internet connection.',
            'AUTH_ERROR': 'Session expired. Please log in again.',
            'VALIDATION_ERROR': 'Please check your input and try again.',
            'SERVER_ERROR': 'Server issue. Please try again later.',
            'TIMEOUT_ERROR': 'Request timeout. Please try again.',
            'PERMISSION_ERROR': 'You don\'t have permission for this action.'
        };
        
        return errorMap[error.code] || 'An unexpected error occurred. Our team has been notified.';
    }
    
    static showUserNotification(message, type = 'info') {
        // Enhanced notification system with accessibility
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after delay
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    static async logToService(error, context, errorId) {
        try {
            await fetch('/api/logs/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    errorId,
                    message: error.message,
                    stack: error.stack,
                    context,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            });
        } catch (logError) {
            console.warn('Failed to log error to service:', logError);
        }
    }
}

// Usage in API calls with @bitacora context
try {
    const result = await api.updateEquipment(data);
    showSuccessNotification('Equipment updated successfully');
    // Reference @bitacora for any follow-up operations
} catch (error) {
    const errorId = ErrorHandler.handle(error, 'Equipment Update');
    // @bitacora debug system will log this automatically
}
```

## 🔧 Professional Environment Management (Enhanced)

### Multi-Environment Configuration with Security
```javascript
// backend/src/config/environment.js - Enhanced security
const environments = {
    development: {
        db: {
            host: 'localhost',
            name: 'gymtec_erp_dev',
            user: 'root',
            password: '',
            ssl: false,
            acquireTimeout: 60000,
            timeout: 60000
        },
        jwt: { 
            expiresIn: '24h', 
            secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
            refreshExpiresIn: '7d'
        },
        cors: { 
            origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
            credentials: true
        },
        debug: {
            enabled: true,
            level: 'debug',
            performance: true
        }
    },
    
    production: {
        db: {
            host: process.env.DB_HOST,
            name: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: {
                rejectUnauthorized: false,
                ca: process.env.DB_SSL_CA
            },
            acquireTimeout: 30000,
            timeout: 30000
        },
        jwt: { 
            expiresIn: '8h', 
            secret: process.env.JWT_SECRET,
            refreshExpiresIn: '24h'
        },
        cors: { 
            origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
            credentials: true
        },
        debug: {
            enabled: false,
            level: 'error',
            performance: false
        }
    },
    
    testing: {
        db: { 
            name: 'gymtec_erp_test',
            host: 'localhost',
            user: 'root',
            password: ''
        },
        jwt: { 
            expiresIn: '1h',
            secret: 'test-secret'
        },
        debug: {
            enabled: true,
            level: 'info',
            performance: true
        }
    }
};

module.exports = environments[process.env.NODE_ENV || 'development'];
```

## 🛡️ ENHANCED SECURITY PATTERNS (2025 Standards)

### MANDATORY SECURITY PATTERNS - NEVER DEVIATE:

#### 1. **Input Validation and Sanitization**
```javascript
// ✅ REQUIRED: Comprehensive input validation
const joi = require('joi');
const validator = require('validator');

const validateTicketInput = (req, res, next) => {
    const schema = joi.object({
        title: joi.string().min(3).max(255).pattern(/^[a-zA-Z0-9\s\-\.]+$/).required(),
        description: joi.string().min(10).max(2000).required(),
        priority: joi.string().valid('low', 'medium', 'high', 'critical').required(),
        equipment_id: joi.number().integer().positive().required(),
        attachments: joi.array().items(joi.string().uri()).max(5).optional()
    });
    
    const { error, value } = schema.validate(req.body);
    
    if (error) {
        logger.warn('Input validation failed', {
            error: error.details,
            requestBody: req.body,
            userId: req.user?.id,
            ip: req.ip
        });
        
        return res.status(400).json({
            error: 'Invalid input data',
            code: 'VALIDATION_ERROR',
            details: error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }))
        });
    }
    
    // Sanitize strings
    Object.keys(value).forEach(key => {
        if (typeof value[key] === 'string') {
            value[key] = validator.escape(value[key]);
        }
    });
    
    req.validatedBody = value;
    next();
};

// Usage
app.post('/api/tickets', authenticateToken, validateTicketInput, createTicket);
```

#### 2. **Enhanced Authentication with Rate Limiting**
```javascript
// ✅ REQUIRED: Rate limiting and brute force protection
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // max 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded for authentication', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
    }
});

const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 2,
    delayMs: 500
});

app.use('/api/auth', authLimiter, speedLimiter);
```

#### 3. **SQL Injection Prevention (Enhanced)**
```javascript
// ✅ CORRECT Pattern with comprehensive protection:
app.get('/api/equipment', authenticateToken, async (req, res) => {
    try {
        // Input validation
        const schema = joi.object({
            status: joi.string().valid('active', 'inactive', 'maintenance'),
            limit: joi.number().integer().min(1).max(100).default(20),
            offset: joi.number().integer().min(0).default(0),
            search: joi.string().max(255).pattern(/^[a-zA-Z0-9\s\-\.]+$/)
        });
        
        const { error, value } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({ error: 'Invalid query parameters' });
        }
        
        // Prepared statement with parameter validation
        const sql = `
            SELECT e.*, l.name as location_name, c.name as client_name 
            FROM Equipment e
            JOIN Locations l ON e.location_id = l.id
            JOIN Clients c ON l.client_id = c.id
            WHERE 1=1
            ${value.status ? 'AND e.status = ?' : ''}
            ${value.search ? 'AND (e.name LIKE ? OR e.model LIKE ?)' : ''}
            AND c.id = ?
            ORDER BY e.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const params = [];
        if (value.status) params.push(value.status);
        if (value.search) {
            const searchTerm = `%${value.search}%`;
            params.push(searchTerm, searchTerm);
        }
        params.push(req.user.client_id, value.limit, value.offset);
        
        const rows = await db.query(sql, params);
        
        res.json({ 
            message: 'success', 
            data: rows,
            metadata: { 
                count: rows.length, 
                limit: value.limit,
                offset: value.offset,
                timestamp: new Date().toISOString() 
            }
        });
        
    } catch (error) {
        logger.error('Equipment query failed', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });
        
        res.status(500).json({ 
            error: 'Database error', 
            code: 'DB_ERROR' 
        });
    }
});

// ❌ WRONG Pattern - NEVER USE:
app.get('/api/equipment', (req, res) => {
    const sql = "SELECT * FROM Equipment WHERE status = '" + req.query.status + "'";
    mysql.query(sql, (err, rows) => {
        res.json(rows);
    });
});
```

## 🎯 DEBUGGING Y DESARROLLO EN VS CODE

### Configuración de Debug Actual
```json
// USAR: F5 para debug o Ctrl+Shift+P > "Debug: Start Debugging"
{
    "name": "Debug Backend",
    "type": "node",
    "request": "launch", 
    "program": "${workspaceFolder}/backend/src/server-clean.js",
    "env": {
        "NODE_ENV": "development",
        "DEBUG": "gymtec:*"
    },
    "console": "integratedTerminal"
}
```

### Tasks Integradas de VS Code
- **🚀 Start Development Servers**: Ejecuta `start-servers.bat` completo
- **🔧 Backend Only**: Solo Express server en puerto 3000
- **🌐 Frontend Only**: Solo servidor estático Python en puerto 8080
- **🗄️ Setup MySQL Database**: Inicializar esquema de BD
- **🔄 Reset Database**: Recrear todas las tablas
- **🧪 Test API Endpoints**: Probar conectividad

### Estructura de Logs y Debug
- Backend logs en `backend/logs/`
- Frontend debug en console del navegador  
- Sistema @bitacora para documentar problemas
- Winston logging con niveles configurables

## 📚 @BITACORA INTEGRATION RULES

### MANDATORY @bitacora Usage:
1. **Before Any Implementation**: Check `@bitacora [relevant-topic]`
2. **After Problem Resolution**: Update bitácora with solution
3. **Architecture Changes**: Document in `@bitacora architecture`
4. **New Patterns**: Add to bitácora for future reference

### @bitacora File Structure Protection:
```bash
# Protected files (cannot be deleted without explicit permission):
docs/BITACORA_PROYECTO.md              # Main project log
docs/reference/QUICK_REFERENCE.md      # Quick reference guide  
docs/architecture/                     # Architecture documentation
docs/debug/DEBUG_SYSTEM.md            # Debug system guide
.github/copilot-instructions.md       # This file (protected)
```

## 🚨 PATRONES DE ÉXITO CRÍTICOS (Actualizados 2025)

### Database Adapter Pattern (CRÍTICO):

```javascript
// ✅ REQUERIDO: Usar el adaptador de base de datos para compatibilidad
const DatabaseAdapter = require('./db-adapter');
const db = new DatabaseAdapter();

// Patrón SQLite→MySQL con callbacks
db.all('SELECT * FROM Equipment WHERE location_id = ?', [locationId], (err, rows) => {
    if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: rows });
});

// Para queries individuales
db.get('SELECT * FROM Users WHERE id = ?', [userId], (err, row) => {
    if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
    res.json({ data: row });
});
```

### Environment Configuration (CRÍTICO):

```javascript
// ✅ frontend/js/config.js - Auto-detección de entorno
const API_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    } else if (window.location.hostname.includes('github.dev') || window.location.hostname.includes('codespaces')) {
        return `https://${window.location.hostname.replace('-8080', '-3000')}/api`;
    } else {
        return '/api'; // Producción
    }
})();

// USAR en todos los módulos frontend
window.API_URL = API_URL;
```

### Module Pattern (CRÍTICO):

```javascript
// ✅ Patrón estándar para todos los módulos frontend
document.addEventListener('DOMContentLoaded', () => {
    // 1. State management
    const state = {
        data: [],
        currentItem: null,
        isLoading: false,
        error: null
    };
    
    // 2. API functions
    const api = {
        getData: async () => {
            try {
                const response = await authenticatedFetch(`${API_URL}/endpoint`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('API Error:', error);
                throw error;
            }
        }
    };
    
    // 3. UI functions
    const ui = {
        showLoading: () => state.isLoading = true,
        hideLoading: () => state.isLoading = false,
        showError: (message) => console.error('UI Error:', message)
    };
    
    // 4. Event handlers and initialization
    async function init() {
        try {
            await loadData();
            setupEventListeners();
        } catch (error) {
            ui.showError(error.message);
        }
    }
    
    init();
});
```

### Accessibility Standards (WCAG 2.1 AA)
```html
<!-- ✅ REQUIRED: Accessible form elements -->
<form role="form" aria-labelledby="ticket-form-title">
    <h2 id="ticket-form-title">Create New Ticket</h2>
    
    <div class="form-group">
        <label for="ticket-title" class="required">
            Ticket Title
            <span aria-label="required">*</span>
        </label>
        <input 
            type="text" 
            id="ticket-title" 
            name="title"
            required
            aria-describedby="title-help"
            aria-invalid="false"
        >
        <div id="title-help" class="help-text">
            Enter a descriptive title for your ticket
        </div>
    </div>
    
    <button type="submit" aria-describedby="submit-help">
        Create Ticket
    </button>
    <div id="submit-help" class="sr-only">
        This will create a new support ticket
    </div>
</form>
```

### Real-time Error Monitoring
```javascript
// ✅ Production error monitoring with context
class ProductionErrorMonitor {
    static track(error, context = {}) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            userId: context.userId,
            sessionId: context.sessionId,
            buildVersion: process.env.BUILD_VERSION,
            environment: process.env.NODE_ENV
        };
        
        // Send to monitoring service
        if (process.env.NODE_ENV === 'production') {
            fetch('/api/monitoring/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData)
            }).catch(monitoringError => {
                console.error('Failed to send error to monitoring:', monitoringError);
            });
        }
        
        // Log locally
        console.error('Monitored Error:', errorData);
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    ProductionErrorMonitor.track(event.error, {
        userId: getCurrentUserId(),
        sessionId: getSessionId()
    });
});
```

This enhanced configuration provides enterprise-level development standards with the @bitacora reference system for optimal GitHub Copilot integration. Always reference @bitacora before implementing new features or solving problems.

## 🎫 CRÍTICO - Sistema de Tickets (`tickets.html` y `tickets.js`)

### PROBLEMAS DETECTADOS que REQUIEREN CORRECCIÓN INMEDIATA:

#### ❌ **tickets.js NO usa autenticación** - CRÍTICO
```javascript
// ❌ PROBLEMA ACTUAL en tickets.js:
const response = await fetch(`${API_URL}/tickets`);
const response = await fetch(`${API_URL}/clients`);
const response = await fetch(`${API_URL}/locations?client_id=${clientId}`);

// ✅ DEBE CAMBIARSE A:
const response = await authenticatedFetch(`${API_URL}/tickets`);
const response = await authenticatedFetch(`${API_URL}/clients`);
const response = await authenticatedFetch(`${API_URL}/locations?client_id=${clientId}`);
```

#### ❌ **tickets.js NO importa auth.js** - CRÍTICO
```javascript
// ❌ PROBLEMA: tickets.html NO incluye auth.js
// ✅ AGREGAR ANTES del cierre de </body>:
<script src="js/auth.js"></script>
<script src="js/config.js"></script>
<script src="js/tickets.js"></script>
```

#### ❌ **tickets.js NO protege la página** - CRÍTICO
```javascript
// ❌ PROBLEMA: No hay protección de página
// ✅ AGREGAR al inicio de DOMContentLoaded:
document.addEventListener('DOMContentLoaded', () => {
    // REQUERIDO: Proteger página antes que nada
    if (!AuthManager.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }
    
    // Verificar que estamos en la página correcta
    if (!ticketList) return;
    
    // ... resto del código
});
```

### PATRÓN CORRECTO para tickets.js (IMPLEMENTAR):

```javascript
// ✅ PATRÓN REQUERIDO - tickets.js mejorado:
document.addEventListener('DOMContentLoaded', () => {
    // 1. CRÍTICO: Protección de autenticación PRIMERO
    if (!AuthManager.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // 2. State management (ya existe - mantener)
    const state = {
        tickets: [],
        clients: [],
        locations: [],
        equipment: [],
        filteredTickets: [],
        currentFilters: { search: '', status: '', priority: '', client: '' }
    };

    // 3. API functions con autenticación (CORREGIR)
    const api = {
        fetchTickets: async () => {
            try {
                const response = await authenticatedFetch(`${API_URL}/tickets`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('❌ API Error - fetchTickets:', error);
                throw error;
            }
        },
        
        fetchClients: async () => {
            try {
                const response = await authenticatedFetch(`${API_URL}/clients`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('❌ API Error - fetchClients:', error);
                throw error;
            }
        },
        
        createTicket: async (ticketData) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/tickets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ticketData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error creating ticket');
                }
                return await response.json();
            } catch (error) {
                console.error('❌ API Error - createTicket:', error);
                throw error;
            }
        }
    };

    // 4. UI functions (ya existe - mantener patrón)
    const ui = {
        showLoading: () => {
            // Mostrar loading state
        },
        hideLoading: () => {
            // Ocultar loading state
        },
        showError: (message) => {
            console.error('❌ UI Error:', message);
            // Mostrar error al usuario
        }
    };

    // 5. Inicialización con manejo de errores
    async function init() {
        try {
            ui.showLoading();
            
            // Cargar datos iniciales con autenticación
            await fetchAllInitialData();
            checkForUrlParams();
            setupFilters();
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            ui.showError('Error loading tickets data');
        } finally {
            ui.hideLoading();
        }
    }

    init();
});
```

### CAMBIOS REQUERIDOS en tickets.html:

```html
<!-- ✅ AGREGAR scripts en el orden correcto ANTES del cierre de </body>: -->
<script src="js/config.js"></script>
<script src="js/auth.js"></script>
<script src="js/base-modal.js"></script>
<script src="js/menu.js"></script>
<script src="js/tickets.js"></script>
```

### FUNCIONES DE TICKETS QUE NECESITAN authenticatedFetch:

1. `fetchTickets()` - Obtener lista de tickets
2. `fetchClients()` - Obtener clientes para selector
3. `fetchLocations(clientId)` - Obtener sedes por cliente  
4. `fetchEquipment(locationId)` - Obtener equipos por sede
5. `handleFormSubmit()` - Crear/actualizar tickets
6. `handleNewClientSubmit()` - Crear nuevos clientes
7. `handleNewLocationSubmit()` - Crear nuevas sedes
8. `handleNewEquipmentSubmit()` - Crear nuevos equipos
9. `deleteItem()` - Eliminar tickets/items

### PATRONES DE ERROR HANDLING para tickets:

```javascript
// ✅ Patrón de manejo de errores con contexto:
try {
    const tickets = await api.fetchTickets();
    state.tickets = tickets;
    renderTickets(tickets);
    updateStatistics(tickets);
} catch (error) {
    const errorId = `TKT_${Date.now()}`;
    console.error(`❌ Tickets Error [${errorId}]:`, {
        operation: 'fetchTickets',
        error: error.message,
        timestamp: new Date().toISOString(),
        user: AuthManager.getCurrentUser()?.username
    });
    
    ui.showError(`Error loading tickets. Please try again. (Ref: ${errorId})`);
}
```
