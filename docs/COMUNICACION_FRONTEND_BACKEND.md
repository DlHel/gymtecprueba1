# 📋 COMUNICACIÓN FRONTEND-BACKEND: Módulo de Tickets

## 🏗️ ARQUITECTURA DE COMUNICACIÓN

```
┌─────────────────────┐    HTTPS/HTTP    ┌─────────────────────┐
│    FRONTEND         │◄─────────────────►│     BACKEND         │
│   (localhost:8080)  │                   │  (localhost:3000)   │
└─────────────────────┘                   └─────────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────────┐                   ┌─────────────────────┐
│   NAVEGADOR         │                   │   EXPRESS SERVER    │
│                     │                   │                     │
│ ┌─ tickets.html    │                   │ ┌─ server-clean.js  │
│ ├─ tickets.js      │                   │ ├─ middleware/      │
│ ├─ auth.js         │                   │ ├─ routes/          │
│ ├─ config.js       │                   │ └─ validators.js    │
│ └─ base-modal.js   │                   │                     │
└─────────────────────┘                   └─────────────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────────┐                   ┌─────────────────────┐
│   LOCAL STORAGE     │                   │   MYSQL DATABASE    │
│                     │                   │                     │
│ • gymtec_token      │                   │ • Tickets           │
│ • gymtec_user       │                   │ • Clients           │
│ • gymtec_remember   │                   │ • Locations         │
└─────────────────────┘                   │ • Equipment         │
                                          │ • Users             │
                                          └─────────────────────┘
```

## 🔐 FLUJO DE AUTENTICACIÓN

### 1. **Inicialización del Frontend**
```javascript
// config.js - Configuración automática de URL
const API_URL = getApiUrl(); // localhost:3000/api

// auth.js - Instancia global de AuthManager
window.authManager = new AuthManager();
window.AuthManager = window.authManager;

// Funciones globales
window.protectPage = async (requiredRole) => { ... }
window.authenticatedFetch = async (url, options) => { ... }
```

### 2. **Protección de Página**
```javascript
// tickets.js - DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    // 🔒 PROTECCIÓN OBLIGATORIA
    if (typeof window.protectPage === 'function') {
        const hasAccess = await window.protectPage();
        if (!hasAccess) return; // Redirige a login.html
    } else {
        // Fallback manual
        if (!window.authManager.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
    }
    
    // ✅ Usuario autenticado - continuar inicialización
    await fetchAllInitialData();
});
```

### 3. **Sistema de Tokens JWT**
```javascript
// Frontend: Obtener token del localStorage
const token = localStorage.getItem('gymtec_token');

// Headers automáticos en authenticatedFetch
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
};

// Backend: Verificación del token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            error: 'Token de acceso requerido',
            code: 'MISSING_TOKEN'
        });
    }
    
    jwt.verify(token, AuthService.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: 'Token inválido o expirado',
                code: 'INVALID_TOKEN'
            });
        }
        req.user = user;
        next();
    });
}
```

## 📡 ENDPOINTS PRINCIPALES DE TICKETS

### **GET /api/tickets**
```javascript
// Frontend: tickets.js
async function fetchTickets() {
    const response = await authenticatedFetch(`${API_URL}/tickets`);
    const result = await response.json();
    state.tickets = result.data || [];
}

// Backend: server-clean.js
app.get('/api/tickets', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            t.*,
            c.name as client_name,
            l.name as location_name,
            e.name as equipment_name,
            COALESCE(t.ticket_type, 'normal') as ticket_type
        FROM Tickets t
        LEFT JOIN Clients c ON t.client_id = c.id
        LEFT JOIN Equipment e ON t.equipment_id = e.id
        LEFT JOIN Locations l ON t.location_id = l.id
        ORDER BY t.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: "success", 
            data: rows 
        });
    });
});
```

### **POST /api/tickets**
```javascript
// Frontend: tickets.js
const body = Object.fromEntries(new FormData(form));
const response = await authenticatedFetch(`${API_URL}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

// Backend: server-clean.js
app.post('/api/tickets', authenticateToken, (req, res) => {
    const { client_id, location_id, equipment_id, title, description, priority, due_date } = req.body;
    
    // Validación básica
    if (!title || !client_id || !priority) {
        return res.status(400).json({ 
            error: "Título, Cliente y Prioridad son campos obligatorios." 
        });
    }
    
    const sql = `INSERT INTO Tickets (...) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    const params = [client_id, location_id || null, equipment_id || null, title, description, priority, due_date || null, 'Abierto', 'individual'];
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        
        // 🔔 Trigger notificaciones
        triggerNotificationProcessing('create', this.lastID);
        
        res.status(201).json({
            message: "success",
            data: { id: this.lastID, ...req.body, status: 'Abierto' }
        });
    });
});
```

### **Otros Endpoints Relacionados**
```javascript
// Clientes
GET    /api/clients                    → fetchClients()
POST   /api/clients                    → handleNewClientSubmit()
PUT    /api/clients/:id               → updateClient()
DELETE /api/clients/:id               → deleteItem()

// Ubicaciones
GET    /api/locations?client_id=X     → fetchLocations(clientId)
POST   /api/locations                 → handleNewLocationSubmit()
PUT    /api/locations/:id            → updateLocation()
DELETE /api/locations/:id            → deleteItem()

// Equipos
GET    /api/equipment?location_id=X   → fetchEquipment(locationId)
POST   /api/equipment                 → handleNewEquipmentSubmit()
PUT    /api/equipment/:id            → updateEquipment()
DELETE /api/equipment/:id            → deleteItem()

// Ticket específico
GET    /api/tickets/:id               → fetchTicketDetail()
PUT    /api/tickets/:id               → handleFormSubmit() (edit)
DELETE /api/tickets/:id               → deleteTicket()

// Gimnación (sistema especializado)
POST   /api/tickets/gimnacion         → handleGimnacionFormSubmit()
GET    /api/gimnacion/checklist-templates → fetchChecklistTemplates()
GET    /api/gimnacion/checklist-templates/:id/items → fetchTemplateItems()
```

## 🔄 FLUJO COMPLETO DE OPERACIONES

### **1. Cargar Datos Iniciales**
```javascript
// tickets.js - Secuencia de inicialización
async function fetchAllInitialData() {
    try {
        // Cargar en paralelo para optimizar performance
        await Promise.all([
            fetchTickets(),           // → GET /api/tickets
            fetchClients(),           // → GET /api/clients
            fetchEquipmentModels()    // → GET /api/equipment-models
        ]);
        
        console.log('✅ Datos iniciales cargados');
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
    }
}
```

### **2. Crear Nuevo Ticket**
```javascript
// Flujo completo frontend → backend
async function handleFormSubmit(form) {
    // 1. Obtener datos del formulario
    const formData = Object.fromEntries(new FormData(form));
    
    // 2. Preparar body para envío
    if (!formData.location_id) formData.location_id = null;
    if (!formData.equipment_id) formData.equipment_id = null;
    
    // 3. Enviar al backend
    const response = await authenticatedFetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    
    // 4. Procesar respuesta
    if (response.ok) {
        closeModal('ticket-modal');
        await fetchTickets(); // Recargar lista
    } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
    }
}
```

### **3. Selección en Cascada (Cliente → Sede → Equipo)**
```javascript
// Flujo de dependencias
clientSelect.addEventListener('change', async (e) => {
    const clientId = e.target.value;
    
    if (clientId) {
        // 1. Cargar sedes del cliente
        await fetchLocations(clientId);  // → GET /api/locations?client_id=X
        
        // 2. Limpiar equipo (depende de sede)
        equipmentSelect.innerHTML = '<option value="">Seleccionar Equipo</option>';
    }
});

locationSelect.addEventListener('change', async (e) => {
    const locationId = e.target.value;
    
    if (locationId) {
        // Cargar equipos de la sede
        await fetchEquipment(locationId); // → GET /api/equipment?location_id=X
    }
});
```

## 🛡️ MANEJO DE ERRORES

### **Frontend: Manejo Centralizado**
```javascript
// auth.js - authenticatedFetch maneja automáticamente errores 401
async authenticatedFetch(url, options = {}) {
    const response = await fetch(url, options);
    
    // Token expirado → logout automático
    if (response.status === 401) {
        console.warn('🔒 Token expirado, haciendo logout...');
        this.logout();
        window.location.href = '/login.html';
        throw new Error('Sesión expirada');
    }
    
    return response;
}

// tickets.js - Manejo específico por función
async function fetchTickets() {
    try {
        const response = await authenticatedFetch(`${API_URL}/tickets`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        state.tickets = result.data || [];
    } catch (error) {
        console.error('❌ Error fetching tickets:', error);
        state.tickets = [];
        // Mostrar estado vacío o mensaje de error
    }
}
```

### **Backend: Respuestas Consistentes**
```javascript
// Formato estándar de respuestas
// ✅ Éxito
res.json({
    message: "success",
    data: rows,
    metadata: { count: rows.length }
});

// ❌ Error
res.status(400).json({
    error: "Mensaje descriptivo del error",
    code: "ERROR_CODE",
    details: [...]  // Opcional para validaciones
});
```

## 📊 ESTADO DE LA APLICACIÓN

### **Frontend State Management**
```javascript
// tickets.js - Estado global del módulo
let state = {
    tickets: [],              // Todos los tickets
    clients: [],              // Lista de clientes
    locations: [],            // Sedes (filtradas por cliente)
    equipment: [],            // Equipos (filtrados por sede)
    filteredTickets: [],      // Tickets filtrados para mostrar
    currentFilters: {         // Filtros activos
        search: '',
        status: '',
        priority: '',
        client: '',
        type: ''
    },
    gimnacion: {              // Estado específico gimnación
        selectedEquipment: [],
        checklistTemplates: [],
        selectedTemplate: null,
        contracts: []
    }
};
```

### **Flujo de Estados**
```
Inicial: [] (vacío)
    ↓
Cargando: loading = true
    ↓
API Call: authenticatedFetch()
    ↓
Success: state.tickets = data
    ↓
Render: renderTickets(state.tickets)
    ↓
Filtrado: state.filteredTickets = filtered
    ↓
Re-render: renderTickets(state.filteredTickets)
```

## 🔧 CONFIGURACIÓN Y DETECCIÓN DE ENTORNO

### **Detección Automática de Entorno**
```javascript
// config.js - Configuración inteligente
const getApiUrl = () => {
    const hostname = window.location.hostname;
    
    // GitHub Codespaces
    if (hostname.includes('github.dev')) {
        return `${protocol}//${hostname.replace('-8080', '-3000')}/api`;
    }
    
    // Localhost/desarrollo
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // Producción
    return '/api';
};

// Variable global disponible en todo el frontend
window.API_URL = getApiUrl();
```

## 🚨 PUNTOS CRÍTICOS DE FALLA

### **1. Autenticación**
- ❌ **Problema**: Token expirado o inválido
- ✅ **Solución**: Logout automático y redirección a login

### **2. Conectividad**
- ❌ **Problema**: Backend no disponible (puerto 3000)
- ✅ **Solución**: Error handling con retry y mensajes al usuario

### **3. CORS**
- ❌ **Problema**: Frontend en puerto 8080, backend en 3000
- ✅ **Solución**: CORS configurado correctamente en server-clean.js

### **4. Estados Inconsistentes**
- ❌ **Problema**: Frontend no sincronizado con backend
- ✅ **Solución**: Recargar datos después de operaciones CRUD

---

## 📝 RESUMEN EJECUTIVO

**El módulo de tickets implementa una arquitectura REST completa con:**

1. **Frontend SPA**: Vanilla JS con estado reactivo y comunicación asíncrona
2. **Backend API REST**: Express.js con JWT authentication y validación
3. **Seguridad**: Tokens JWT con expiración automática y roles
4. **Performance**: Carga paralela y optimización de requests
5. **UX**: Manejo de errores, loading states y feedback al usuario
6. **Escalabilidad**: Módulos separados y código reutilizable

**Flujo típico**: `Auth Check` → `API Call` → `Token Validation` → `Database Query` → `Response` → `State Update` → `UI Render`