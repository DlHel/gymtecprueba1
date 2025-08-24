# Gymtec ERP - GitHub Copilot Professional Configuration v2.0

This is a professional-grade ERP system for gym equipment maintenance management with comprehensive CRUD operations, advanced authentication, enterprise-level reporting capabilities, and **@bitacora reference system**.

## 🎯 SISTEMA @BITACORA - REFERENCIA AUTOMÁTICA

**CRITICAL**: When users mention `@bitacora`, automatically reference the complete project context from `docs/BITACORA_PROYECTO.md` and related documentation. This eliminates the need for constant code review.

### @bitacora Command Reference:
- `@bitacora` → Complete project context
- `@bitacora api` → API endpoints and patterns  
- `@bitacora database` → Schema and relationships
- `@bitacora authentication` → JWT auth system
- `@bitacora frontend` → Vanilla JS architecture
- `@bitacora backend` → Express + MySQL patterns
- `@bitacora debug` → Debug system and logging
- `@bitacora security` → Security measures
- `@bitacora deployment` → Deployment configuration

## 🏗️ System Architecture & Technology Stack (Updated 2025)

**Core Stack**: Node.js + Express.js + MySQL2 + Vanilla JavaScript (NO frontend frameworks)
- **Backend**: Express.js REST API (`backend/src/server.js` - 3400+ lines) with JWT authentication on port 3000
- **Frontend**: Modular HTML/CSS/JavaScript with Tailwind CSS utility framework on port 8080
- **Database**: MySQL 8.0+ with 37+ tables, comprehensive foreign key constraints, and ENUM types
- **File Management**: Multer middleware for uploads, Base64 encoding for database storage
- **Debug System**: Advanced logging with Winston, performance monitoring, VS Code integration
- **Documentation**: Protected /docs/ folder with @bitacora reference system

### Critical Data Flow Architecture
1. **Environment Detection**: Frontend auto-detects via `frontend/js/config.js` (localhost/Codespaces)
2. **Database Abstraction**: Backend uses SQLite→MySQL adapter pattern in `backend/src/db-adapter.js`
3. **Module Pattern**: All frontend modules follow: `state` + `api` + `DOMContentLoaded` + error handling
4. **@bitacora Integration**: Automatic context reference for consistent development

## 🚀 Professional Development Commands (Enhanced)

```bash
# Primary development workflow
start-servers.bat  # Verifies MySQL connection, starts backend:3000 + frontend:8080

# Debug mode (NEW)
npm run debug      # Start with debug enabled
npm run debug:watch # Debug with auto-reload

# Individual service management
cd backend && npm start  # Node.js Express server with hot reload
cd frontend && python -m http.server 8080  # Static file server with CORS

# Database management
cd backend && npm run setup-mysql  # Initial schema setup
cd backend && npm run dev  # Development with nodemon auto-restart
```

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

## 🎯 ADVANCED DEBUGGING SYSTEM (New)

### VS Code Debug Configuration
```json
// .vscode/launch.json - Professional debugging setup
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Backend",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/backend/src/server.js",
            "env": {
                "NODE_ENV": "development",
                "DEBUG": "gymtec:*",
                "LOG_LEVEL": "debug"
            },
            "console": "integratedTerminal",
            "restart": true,
            "runtimeArgs": ["--inspect=9229"],
            "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
            "outputCapture": "std"
        },
        {
            "name": "Debug Frontend (Chrome)",
            "type": "chrome",
            "request": "launch",
            "url": "http://localhost:8080",
            "webRoot": "${workspaceFolder}/frontend"
        }
    ]
}
```

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

## 🚨 CRITICAL SUCCESS PATTERNS (Updated 2025):

### Performance Optimization
```javascript
// ✅ Database connection pooling with monitoring
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: false,
    ssl: config.db.ssl
});

// Monitor pool performance
pool.on('connection', (connection) => {
    logger.info('Database connection established', { 
        connectionId: connection.threadId 
    });
});

pool.on('error', (err) => {
    logger.error('Database pool error', { error: err.message });
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
